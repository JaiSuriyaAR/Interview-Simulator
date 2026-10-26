export enum ConnectionState {
  IDLE = "idle",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
  FALLBACK = "fallback",
}

export interface TranscriptTurn {
  speaker: "interviewer" | "user";
  text: string;
  timestamp_start: string;
  timestamp_end: string;
}

export interface GeminiLiveCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onTranscriptUpdate: (transcript: TranscriptTurn[]) => void;
  onAudioData: (data: string) => void;
  onInterrupted: () => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.IDLE;
  private retryCount = 0;
  private maxRetries = 2;
  private reconnectTimeout: any = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private transcript: TranscriptTurn[] = [];
  private isMuted = false;
  private isIntentionallyClosed = false;
  private systemInstruction = "";
  private onStateChange: (state: ConnectionState) => void;
  private onTranscriptUpdate: (transcript: TranscriptTurn[]) => void;
  private onAudioData: (data: string) => void;
  private onInterrupted: () => void;

  constructor(
    apiKeyOrCallbacks: string | GeminiLiveCallbacks,
    maybeCallbacks?: GeminiLiveCallbacks
  ) {
    const callbacks = typeof apiKeyOrCallbacks === "string" ? maybeCallbacks! : apiKeyOrCallbacks;
    this.onStateChange = callbacks.onStateChange;
    this.onTranscriptUpdate = callbacks.onTranscriptUpdate;
    this.onAudioData = callbacks.onAudioData;
    this.onInterrupted = callbacks.onInterrupted;
  }

  private updateState(newState: ConnectionState) {
    if (this.state === newState) return;
    console.log(`[GeminiLiveService] State transition: ${this.state} -> ${newState}`);
    this.state = newState;
    this.onStateChange(newState);
  }

  async connect(systemInstruction: string) {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      return;
    }

    if (systemInstruction) {
      this.systemInstruction = systemInstruction;
    }

    this.isIntentionallyClosed = false;
    this.updateState(ConnectionState.CONNECTING);

    this.cleanupWebSocket();

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/live-ws`;

      console.log(`[GeminiLiveService] Connecting to server WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[GeminiLiveService] Client WebSocket connected, sending setup");
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "setup",
            systemInstruction: this.systemInstruction,
            voiceName: "Puck",
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error("[GeminiLiveService] Failed to parse message from server:", e);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[GeminiLiveService] WebSocket connection error:", err);
        if (!this.isIntentionallyClosed) {
          this.handleReconnect();
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[GeminiLiveService] WebSocket closed (code: ${event.code})`);
        if (!this.isIntentionallyClosed && this.state !== ConnectionState.IDLE && this.state !== ConnectionState.FALLBACK) {
          this.handleReconnect();
        }
      };
    } catch (error) {
      console.error("[GeminiLiveService] Connection instantiation failed:", error);
      this.handleReconnect();
    }
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case "open":
        console.log("[GeminiLiveService] Live API Session opened and ready");
        this.updateState(ConnectionState.CONNECTED);
        this.retryCount = 0;
        this.startMic();
        // Prompt initial greeting
        this.sendTextMessage("Hello. Please introduce yourself and begin the interview as per your instructions.");
        break;

      case "audio":
        if (data.audio) {
          this.onAudioData(data.audio);
        }
        break;

      case "transcript":
        if (data.text) {
          this.addTranscriptTurn(data.speaker || "interviewer", data.text);
        }
        break;

      case "interrupted":
        console.log("[GeminiLiveService] Interviewer interrupted");
        this.onInterrupted();
        break;

      case "turnComplete":
        console.log("[GeminiLiveService] Turn complete");
        break;

      case "error":
        console.warn("[GeminiLiveService] Server error received:", data.error);
        if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
          this.handleReconnect();
        }
        break;

      case "close":
        console.log("[GeminiLiveService] Live API session closed by server");
        if (!this.isIntentionallyClosed) {
          this.handleReconnect();
        }
        break;

      default:
        console.log("[GeminiLiveService] Unhandled server message:", data);
        break;
    }
  }

  private async handleReconnect() {
    if (this.isIntentionallyClosed) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryCount * 1500;
      console.log(`[GeminiLiveService] Attempting reconnect ${this.retryCount}/${this.maxRetries} in ${delay}ms...`);
      this.updateState(ConnectionState.RECONNECTING);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect(this.systemInstruction);
      }, delay);
    } else {
      console.warn("[GeminiLiveService] Max retries reached. Transitioning to FALLBACK mode.");
      this.updateState(ConnectionState.FALLBACK);
    }
  }

  private cleanupWebSocket() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, "Clean close");
        }
      } catch (e) {}
      this.ws = null;
    }
  }

  private addTranscriptTurn(speaker: "interviewer" | "user", text: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Filter meta-instructions if model echoes persona definition
    if (speaker === "interviewer") {
      const isMeta =
        trimmedText.startsWith("**") ||
        trimmedText.includes("PERSONA:") ||
        trimmedText.includes("CONTEXT:") ||
        trimmedText.includes("RULES:");
      if (isMeta) {
        return;
      }
    }

    const now = new Date().toISOString();
    const lastTurn = this.transcript[this.transcript.length - 1];

    // Merge logic: if same speaker and continuous
    if (lastTurn && lastTurn.speaker === speaker) {
      const lastTime = new Date(lastTurn.timestamp_end).getTime();
      const currentTime = new Date(now).getTime();

      // If new text starts with old text (streaming replacement)
      if (trimmedText.startsWith(lastTurn.text) && trimmedText.length > lastTurn.text.length) {
        lastTurn.text = trimmedText;
        lastTurn.timestamp_end = now;
        this.onTranscriptUpdate([...this.transcript]);
        return;
      }

      // If continuous utterance within 5 seconds
      if (currentTime - lastTime < 5000) {
        if (!lastTurn.text.includes(trimmedText)) {
          lastTurn.text += " " + trimmedText;
          lastTurn.timestamp_end = now;
          this.onTranscriptUpdate([...this.transcript]);
          return;
        } else {
          return;
        }
      }
    }

    const turn: TranscriptTurn = {
      speaker,
      text: trimmedText,
      timestamp_start: now,
      timestamp_end: now,
    };
    this.transcript.push(turn);
    this.onTranscriptUpdate([...this.transcript]);
  }

  private async startMic() {
    try {
      if (this.micStream) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN && !this.isMuted) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = this.floatTo16BitPCM(inputData);
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

          this.ws.send(JSON.stringify({
            type: "audio",
            audio: base64Data,
          }));
        }
      };

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0;

      this.source.connect(this.processor);
      this.processor.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error("[GeminiLiveService] Microphone access error:", error);
      this.updateState(ConnectionState.ERROR);
    }
  }

  private floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  async sendTextMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.ws?.readyState === WebSocket.OPEN && this.state === ConnectionState.CONNECTED) {
      this.ws.send(JSON.stringify({
        type: "text",
        text: trimmed,
      }));
      // Avoid duplicate local user turns for introductory system prompts
      if (!trimmed.startsWith("Hello. Please introduce yourself")) {
        this.addTranscriptTurn("user", trimmed);
      }
    } else if (this.state === ConnectionState.FALLBACK) {
      this.addTranscriptTurn("user", trimmed);
      try {
        const response = await fetch("/api/interview/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: this.transcript,
            config: { systemInstruction: this.systemInstruction },
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.reply) {
            this.addTranscriptTurn("interviewer", data.reply);
          }
        }
      } catch (err) {
        console.error("[GeminiLiveService] Fallback chat failed:", err);
      }
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.updateState(ConnectionState.IDLE);

    this.cleanupWebSocket();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getTranscript(): TranscriptTurn[] {
    return this.transcript;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }
}
