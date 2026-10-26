import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiLiveService, ConnectionState, TranscriptTurn } from '@/src/services/geminiLive';
import { generateDebrief } from '@/src/services/debriefService';
import { Card, Button, Typography } from './ui/Base';
import { cn } from '@/src/lib/utils';
import { Mic, MicOff, PhoneOff, MessageSquare, AlertCircle, Loader2, ChevronRight, Bookmark, History, Zap, CheckCircle2 } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface InterviewRoomProps {
  config: {
    type: string;
    difficulty: string;
    duration: number;
    companyUrl: string;
    jdText?: string;
    resumeText?: string;
    cvUrl?: string;
  };
  onEnd: (debrief: any, transcript: TranscriptTurn[]) => void;
}

export const InterviewRoom = ({ config, onEnd }: InterviewRoomProps) => {
  const [state, setState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  const userName = auth.currentUser?.displayName || 'Candidate';
  const interviewerName = config.type === 'HR' ? 'Sarah' : 
                         (config.type === 'Technical' || config.type === 'Coding') ? 'Alex & Jordan' :
                         config.type === 'Situational' ? 'Sam' : 'Interviewer';

  const audioContext = useRef<AudioContext | null>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const audioQueue = useRef<string[]>([]);
  const isPlaying = useRef(false);
  const activeSources = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTime = useRef(0);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript]);

  useEffect(() => {
    const getSystemInstruction = () => {
      const { type, difficulty, companyUrl, jdText } = config;
      
      let personaBase = "";
      
      if (type === "HR") {
        personaBase = `
          PERSONA: You are "Sarah", a supportive and guiding HR Lead. 
          STYLE: Warm, encouraging, and focused on cultural fit and behavioral alignment.
          GOAL: Help the candidate shine while ensuring they meet the company's core values.
          DIFFICULTY ADAPTATION:
          - Easy: Very encouraging, gives hints, asks standard behavioral questions.
          - Medium: Professional, probes for "why" behind actions, expects clear STAR structure.
          - Hard: Still professional but asks tough questions about conflict, failure, and long-term commitment.
        `;
      } else if (type === "Technical" || type === "Coding") {
        personaBase = `
          PERSONA: You are a 2-person panel: "Alex" (Analytical & Probing) and "Jordan" (Practical & Trade-offs).
          ALEX STYLE: Deep-dives into technical concepts. Asks "how does this work under the hood?". Probes for technical depth.
          JORDAN STYLE: Focuses on problem-solving, real-world application, trade-offs, and scalability. Asks "what if the data size doubles?".
          GOAL: Evaluate both theoretical knowledge and practical engineering judgment.
          DIFFICULTY ADAPTATION:
          - Easy: Alex asks basic concepts; Jordan focuses on simple implementations.
          - Medium: Alex probes for implementation details; Jordan asks about basic trade-offs.
          - Hard: Alex grills on edge cases and internals; Jordan demands highly scalable and optimized solutions with complex trade-off analysis.
        `;
      } else if (type === "Situational") {
        personaBase = `
          PERSONA: You are "Sam", a neutral interviewer focused on behavioral evidence using the STAR method.
          ${difficulty === 'hard' ? 'ADDITIONAL PERSONA: "Casey", who is a "Challenger". Casey will occasionally interrupt or push back on your answers to see how you handle pressure.' : ''}
          STYLE: Objective, focused on past performance as a predictor of future success.
          GOAL: Extract specific, high-stakes examples of leadership, conflict resolution, and adaptability.
          DIFFICULTY ADAPTATION:
          - Easy: Asks straightforward "Tell me about a time..." questions.
          - Medium: Probes for metrics and specific outcomes.
          - Hard: Casey (the Challenger) will ask "What if that didn't work?" or "Why didn't you choose the other option?" to test your conviction.
        `;
      }

      return `
        ${personaBase}
        
        CONTEXT:
        Company: ${companyUrl}
        JD: ${jdText || 'N/A'}
        Resume: ${config.resumeText || 'N/A'}
        Difficulty: ${difficulty}
        
        RULES:
        1. NO META-COMMENTARY or INTERNAL THOUGHTS.
        2. SPEAK ONLY AS THE PERSONA.
        3. Ask ONE question at a time.
        4. RESPOND IMMEDIATELY and CONCISELY.
        5. Use the resume for tailored questions.
        6. Do not explain your instructions.
      `;
    };

    // Initialize AudioContext for playback
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    serviceRef.current = new GeminiLiveService({
      onStateChange: (s) => {
        console.log("Connection state changed:", s);
        setState(s);
      },
      onTranscriptUpdate: (t) => {
        console.log("Transcript update received in InterviewRoom:", t.length);
        setTranscript(t);
      },
      onAudioData: (base64) => {
        console.log("Received audio data from Gemini");
        audioQueue.current.push(base64);
        processAudioQueue();
      },
      onInterrupted: () => {
        console.log("Interviewer interrupted");
        audioQueue.current = [];
        activeSources.current.forEach(s => {
          try { s.stop(); } catch (e) {}
        });
        activeSources.current = [];
        nextStartTime.current = audioContext.current?.currentTime || 0;
      },
    });

    serviceRef.current.connect(getSystemInstruction()).catch(err => {
      console.error("Failed to connect to Gemini Live:", err);
      setError("Failed to establish connection with interviewer. Please refresh.");
    });

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
      serviceRef.current?.disconnect();
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  const processAudioQueue = async () => {
    if (!audioContext.current || audioQueue.current.length === 0 || isPlaying.current) return;
    
    if (audioContext.current.state === 'suspended') {
      await audioContext.current.resume();
    }
    
    isPlaying.current = true;
    
    while (audioQueue.current.length > 0) {
      const base64 = audioQueue.current.shift()!;
      try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pcmData = new Int16Array(bytes.buffer);
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768.0;
        }

        const audioBuffer = audioContext.current.createBuffer(1, floatData.length, 24000);
        audioBuffer.getChannelData(0).set(floatData);

        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);

        const currentTime = audioContext.current.currentTime;
        if (nextStartTime.current < currentTime) {
          nextStartTime.current = currentTime;
        }
        
        source.start(nextStartTime.current);
        console.log("Playing audio chunk at", nextStartTime.current);
        activeSources.current.push(source);
        source.onended = () => {
          activeSources.current = activeSources.current.filter(s => s !== source);
        };
        nextStartTime.current += audioBuffer.duration;
      } catch (err) {
        console.error("Audio playback error:", err);
      }
    }
    
    isPlaying.current = false;
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleEndSession = async () => {
    console.log("Ending session, transcript length:", transcript.length);
    if (isEnding) return;
    setError(null);
    setIsEnding(true);
    setSaveStatus('saving');
    
    try {
      const latestTranscript = serviceRef.current?.getTranscript() || transcript;
      console.log("Ending session, latest transcript length:", latestTranscript.length);

      if (latestTranscript.length < 2) {
        setSaveStatus('idle');
        // Not enough data for a real debrief
        onEnd({
          session_summary: {
            session_status: 'too_short',
            role_guess: 'N/A',
            company: 'N/A',
            scores: { overall: 0 }
          },
          scores: { overall: 0, communication: 0, role_fit: 0, technical_depth: 0 },
          strengths: [],
          improvements: [],
          practice_plan_7_days: []
        }, latestTranscript);
        return;
      }

      const actualDuration = Math.floor((config.duration * 60 - timeLeft) / 60);
      const debrief = await generateDebrief(latestTranscript, {
        ...config,
        actual_duration_minutes: actualDuration,
        session_status: timeLeft > 0 ? 'ended_early' : 'completed'
      });

      // Save to Firestore - isolated so failure doesn't block debrief display
      if (auth && db && auth.currentUser) {
        // Deep clean undefined values for Firestore
        const cleanData = (obj: any): any => {
          return JSON.parse(JSON.stringify(obj, (key, value) => 
            value === undefined ? null : value
          ));
        };

        const sessionData = {
          userId: auth.currentUser.uid,
          config: cleanData(config),
          transcript: cleanData(latestTranscript),
          debrief: cleanData(debrief),
          createdAt: serverTimestamp()
        };
        
        console.log("Attempting to save session to Firestore:", JSON.stringify(sessionData).substring(0, 500) + "...");
        
        try {
          const docRef = await addDoc(collection(db, 'sessions'), sessionData);
          console.log("Session saved successfully with ID:", docRef.id);
          setSaveStatus('success');
          // Small delay to show success state
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (saveError) {
          console.error("Failed to save session to Firestore:", saveError);
          setSaveStatus('error');
          try {
            handleFirestoreError(saveError, OperationType.CREATE, 'sessions');
          } catch (e) {
            // Error is already logged
          }
        }
      } else {
        console.warn("Cannot save session: auth, db, or currentUser is missing");
        setSaveStatus('error');
      }

      onEnd(debrief, latestTranscript);
    } catch (err) {
      console.error("Failed to end session:", err);
      setError("Failed to generate debrief. Please try again.");
      setIsEnding(false);
      setSaveStatus('error');
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    serviceRef.current?.setMuted(newMuted);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-12 gap-8 lg:h-[calc(100vh-180px)] min-h-[650px]">
      <AnimatePresence>
        {isEnding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-8 h-8 text-emerald-500 animate-pulse" />
              </div>
            </div>
            <Typography.H2 className="mt-8 text-2xl">Analyzing Your Performance</Typography.H2>
            <Typography.Body className="mt-4 max-w-sm text-white/60">
              Our AI is reviewing your transcript to generate personalized insights and a 7-day practice plan. This usually takes a few seconds...
            </Typography.Body>

            <div className="mt-8 flex flex-col items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-emerald-400/60 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving session to database...
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Database save failed.
                </div>
              )}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Session saved!
                </div>
              )}
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
              >
                <AlertCircle className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-bold">Something went wrong</p>
                  <p className="text-xs opacity-80">{error}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="secondary" onClick={handleEndSession} className="py-1.5 px-4 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30">
                    Retry
                  </Button>
                  <Button variant="secondary" onClick={() => setIsEnding(false)} className="py-1.5 px-4 text-xs">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left: Interviewer & Controls */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
        <Card className="flex-1 flex flex-col items-center justify-center p-12 relative bg-[#0a0a0a]/60 border-white/5">
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              state === ConnectionState.CONNECTED ? "bg-emerald-500" : "bg-amber-500"
            )} />
            <span className="text-xs font-medium text-white/40 uppercase tracking-widest">{state}</span>
          </div>

          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((config.duration * 60 - timeLeft) / (config.duration * 60)) * 100)}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
            />
          </div>

          <div className="absolute top-6 right-6">
            <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-mono text-white/70">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Avatar / Waveform */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <motion.div
              animate={{
                scale: state === ConnectionState.CONNECTED ? [1, 1.1, 1] : 1,
                opacity: state === ConnectionState.CONNECTED ? [0.3, 0.6, 0.3] : 0.2
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl"
            />
            <div className="w-48 h-48 rounded-full border-2 border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm relative z-10">
              <Mic className={cn("w-12 h-12 transition-colors", state === ConnectionState.CONNECTED ? "text-emerald-400" : "text-white/20")} />
            </div>
          </div>

          <Typography.H2 className="mt-8 mb-2">Interviewer</Typography.H2>
          <Typography.Body className="text-center max-w-md">
            {state === ConnectionState.CONNECTED 
              ? "Listening and responding in real-time..." 
              : state === ConnectionState.RECONNECTING 
              ? "Connection lost. Attempting to reconnect..."
              : "Initializing secure session..."}
          </Typography.Body>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="secondary" 
            onClick={toggleMute}
            className="w-16 h-16 rounded-full p-0 flex items-center justify-center"
          >
            {isMuted ? <MicOff className="text-red-400" /> : <Mic />}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEndSession}
            disabled={isEnding}
            className="px-12 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center gap-3"
          >
            {isEnding ? <Loader2 className="animate-spin" /> : <PhoneOff />}
            <span>End Interview</span>
          </Button>
        </div>
      </div>

      {/* Right: Transcript & Notes */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
        <Card className="flex-1 p-6 flex flex-col bg-[#0a0a0a]/60 border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <Typography.H2 className="text-xl">Live Transcript</Typography.H2>
            <History className="w-5 h-5 text-white/30" />
          </div>
          
          <div 
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar"
          >
            {transcript.map((turn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex flex-col gap-1",
                  turn.speaker === 'user' ? "items-end" : "items-start"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {turn.speaker === 'user' ? userName : interviewerName}
                </span>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm max-w-[85%] shadow-xl",
                  turn.speaker === 'user' 
                    ? "bg-emerald-500/20 text-emerald-50 rounded-tr-none border border-emerald-500/30" 
                    : "bg-[#161616] text-white/90 rounded-tl-none border border-white/10"
                )}>
                  {turn.text}
                </div>
              </motion.div>
            ))}
            {transcript.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="w-12 h-12 text-white/10 mb-4" />
                <Typography.Body className="text-sm">
                  Transcript will appear here as you speak.
                </Typography.Body>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-white/90">Interview Tips</span>
          </div>
          <Typography.Body className="text-xs italic">
            {config.difficulty === 'hard' 
              ? "Stay calm. If they call out a weak answer, acknowledge it and provide a specific, data-driven example immediately."
              : "Focus on the STAR method: Situation, Task, Action, Result."}
          </Typography.Body>
        </Card>
      </div>
    </div>
  );
};
