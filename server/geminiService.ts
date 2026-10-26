import { WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI features");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function handleLiveWebSocket(clientWs: WebSocket) {
  let session: any = null;
  let isClosed = false;

  clientWs.on("message", async (raw: any) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "setup") {
        const { systemInstruction, voiceName } = msg;
        console.log("[LiveAPI] Received setup request with instruction length:", systemInstruction?.length);

        try {
          const ai = getGenAI();
          session = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || "Puck" },
                },
              },
              systemInstruction: systemInstruction || "You are an expert interviewer conducting a live mock interview.",
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                console.log("[LiveAPI] Connected successfully to Gemini Live API");
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "open" }));
                }
              },
              onmessage: (serverMessage: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;
                const serverContent = serverMessage.serverContent;
                if (!serverContent) return;

                if (serverContent.interrupted) {
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }

                if (serverContent.modelTurn?.parts) {
                  for (const part of serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(JSON.stringify({ type: "audio", audio: part.inlineData.data }));
                    }
                    if (part.text) {
                      clientWs.send(JSON.stringify({ type: "transcript", speaker: "interviewer", text: part.text }));
                    }
                  }
                }

                const anyContent = serverContent as any;
                const modelTranscription = anyContent.outputAudioTranscription?.text || anyContent.outputTranscription?.text;
                if (modelTranscription) {
                  clientWs.send(JSON.stringify({ type: "transcript", speaker: "interviewer", text: modelTranscription }));
                }

                const userTranscription = anyContent.inputAudioTranscription?.text || anyContent.inputTranscription?.text;
                if (userTranscription) {
                  clientWs.send(JSON.stringify({ type: "transcript", speaker: "user", text: userTranscription }));
                }

                if (anyContent.turnComplete) {
                  clientWs.send(JSON.stringify({ type: "turnComplete" }));
                }
              },
              onerror: (err: any) => {
                console.error("[LiveAPI] Gemini Live backend error:", err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: "error",
                    error: err?.message || "Gemini Live service error",
                  }));
                }
              },
              onclose: () => {
                console.log("[LiveAPI] Gemini Live session closed");
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "close" }));
                }
              },
            },
          });
        } catch (connErr: any) {
          console.error("[LiveAPI] Error connecting to Gemini Live:", connErr);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "error",
              error: connErr?.message || "Failed to establish Gemini Live connection",
            }));
          }
        }
      } else if (msg.type === "audio") {
        if (session && msg.audio) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        }
      } else if (msg.type === "text") {
        if (session && msg.text) {
          session.sendRealtimeInput({
            text: msg.text,
          });
        }
      }
    } catch (parseErr) {
      console.error("[LiveAPI] Error parsing client message:", parseErr);
    }
  });

  clientWs.on("close", () => {
    isClosed = true;
    if (session) {
      try {
        session.close();
      } catch (e) {}
      session = null;
    }
  });

  clientWs.on("error", (err) => {
    console.error("[LiveAPI] Client WebSocket socket error:", err);
  });
}

const DEBRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    session_summary: {
      type: Type.OBJECT,
      properties: {
        session_status: { type: Type.STRING },
        planned_duration_minutes: { type: Type.NUMBER },
        actual_duration_minutes: { type: Type.NUMBER },
        role_guess: { type: Type.STRING },
        company: { type: Type.STRING },
        interview_type: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        topics_discussed: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              notes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["topic"],
          },
        },
      },
      required: ["role_guess", "company"],
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.NUMBER },
        communication: { type: Type.NUMBER },
        structure_star: { type: Type.NUMBER },
        role_fit: { type: Type.NUMBER },
        confidence_clarity: { type: Type.NUMBER },
        delivery: { type: Type.NUMBER },
        technical_depth: { type: Type.NUMBER },
      },
      required: ["overall", "communication", "role_fit", "technical_depth"],
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          evidence: {
            type: Type.OBJECT,
            properties: {
              timestamp_start: { type: Type.STRING },
              timestamp_end: { type: Type.STRING },
              quote: { type: Type.STRING },
            },
            required: ["quote"],
          },
          why_it_matters: { type: Type.STRING },
        },
        required: ["title", "why_it_matters", "evidence"],
      },
    },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          issue: { type: Type.STRING },
          evidence: {
            type: Type.OBJECT,
            properties: {
              timestamp_start: { type: Type.STRING },
              timestamp_end: { type: Type.STRING },
              quote: { type: Type.STRING },
            },
            required: ["quote"],
          },
          better_answer_example: { type: Type.STRING },
          micro_exercise: { type: Type.STRING },
        },
        required: ["title", "issue", "evidence", "better_answer_example"],
      },
    },
    delivery_metrics: {
      type: Type.OBJECT,
      properties: {
        filler_word_estimate: { type: Type.NUMBER },
        pace_wpm_estimate: { type: Type.NUMBER },
        long_pause_estimate: { type: Type.NUMBER },
        hesitation_analysis: { type: Type.STRING },
        clarity_analysis: { type: Type.STRING },
      },
    },
    moments_that_mattered: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          timestamp_start: { type: Type.STRING },
          timestamp_end: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    },
    practice_plan_7_days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          focus: { type: Type.STRING },
          tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
          time_minutes: { type: Type.NUMBER },
        },
        required: ["day", "focus", "tasks", "time_minutes"],
      },
    },
    next_interview_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
    notes_if_low_data: { type: Type.STRING },
  },
  required: ["session_summary", "scores", "strengths", "improvements", "practice_plan_7_days"],
};

export async function generateDebriefServer(transcript: any[], sessionInfo: any, isRegeneration: boolean = false) {
  const ai = getGenAI();
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];

  const prompt = `
  Generate a detailed, professional interview debrief based on the following transcript and session info.
  
  SESSION INFO:
  ${JSON.stringify(sessionInfo, null, 2)}
  
  TRANSCRIPT:
  ${JSON.stringify(transcript, null, 2)}
  
  ${isRegeneration ? "This is a REGENERATION request. Provide a fresh perspective or deeper nuance if possible, while maintaining analytical accuracy." : ""}

  CRITICAL INSTRUCTIONS:
  1. STRICT SCHEMA ADHERENCE: The output MUST strictly match the provided JSON schema.
  2. PARTIAL DATA HANDLING: If the transcript is short or incomplete, provide the best possible estimates for scores and insights based on what is available. Use "notes_if_low_data" to explain any limitations.
  3. SCORES: All scores must be between 1-100. Be realistic and constructive:
     - 90+ represents world-class mastery.
     - 70-89 represents strong, well-prepared performance.
     - 50-69 represents average with distinct areas for improvement.
     - Below 50 indicates major structural gaps or hesitation.
     
     SCORING CRITERIA:
     - COMMUNICATION: Clarity, conciseness, active listening, structured articulation.
     - ROLE FIT: Alignment with target position (${sessionInfo.type || 'General'}) and candidate background.
     - TECHNICAL DEPTH: Domain substance, architectural insight, precision, trade-off analysis.
     - STRUCTURE (STAR): Clear Situation, Task, Action, and measurable Result in behavioral responses.
     - CONFIDENCE & CLARITY: Directness, minimal filler hesitation, composure under pressure.
  
  4. DELIVERY METRICS:
     - 'hesitation_analysis': 1-2 sentence overview of pacing, pause control, and filler habits.
     - 'clarity_analysis': 1-2 sentence overview of narrative structure and conciseness.
  
  5. STRENGTHS & IMPROVEMENTS:
     - Provide direct quotes from the transcript where available.
     - Provide clear 'better_answer_example' models for candidate answers that fell short.
     - Include quick 1-minute 'micro_exercise' drills for continuous growth.

  6. PRACTICE PLAN (7 DAYS):
     - Structured day-by-day practice routine tailored to candidate's identified weak spots.
  `;

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      console.log(`[Debrief] Attempting generation with model ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: DEBRIEF_SCHEMA,
          temperature: isRegeneration ? 0.7 : 0.3,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response returned from Gemini debrief generator");
      }

      const parsed = JSON.parse(text);
      const defaultScores = {
        overall: 60,
        communication: 60,
        role_fit: 60,
        technical_depth: 60,
        structure_star: 60,
        confidence_clarity: 60,
      };
      parsed.scores = { ...defaultScores, ...(parsed.scores || {}) };
      console.log(`[Debrief] Generation succeeded with model ${model}`);
      return parsed;
    } catch (err: any) {
      console.warn(`[Debrief] Model ${model} encountered error:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate debrief with all available models");
}

export async function chatInterviewFallback(message: string, history: any[], config: any) {
  const ai = getGenAI();
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];

  const contents = (history || []).map((h: any) => ({
    role: h.speaker === "interviewer" ? "model" : "user",
    parts: [{ text: h.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  const systemInstruction = `
    You are an expert interviewer conducting an interview for: ${config?.type || 'General'} role.
    Target Company: ${config?.companyUrl || 'General'}.
    Candidate Resume: ${config?.resumeText || 'N/A'}.
    Difficulty: ${config?.difficulty || 'medium'}.
    Keep responses concise, natural, spoken-style, and ask one question at a time.
  `;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[ChatFallback] Model ${model} failed:`, err?.message || err);
    }
  }

  return "Thank you. Could you elaborate on your experience and share a specific challenge you solved recently?";
}
