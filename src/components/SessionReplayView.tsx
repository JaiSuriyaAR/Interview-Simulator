import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, Button, Typography } from './ui/Base';
import { cn } from '@/src/lib/utils';
import { 
  Play, Pause, SkipBack, SkipForward, ArrowLeft, 
  MessageSquare, User, Bot, Clock, Volume2, Search
} from 'lucide-react';

interface SessionReplayViewProps {
  session: any;
  onBack: () => void;
}

export const SessionReplayView = ({ session, onBack }: SessionReplayViewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcript = session.transcript || [];

  // Simulate playback for demonstration of "synchronized" feel
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= transcript.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000); // Move every 2 seconds for demo
    }
    return () => clearInterval(interval);
  }, [isPlaying, transcript.length]);

  const handleJump = (index: number) => {
    setCurrentTime(index);
    setIsPlaying(false);
  };

  const filteredTranscript = React.useMemo(() => {
    if (!searchQuery.trim()) return transcript;

    const query = searchQuery.toLowerCase();
    
    return transcript
      .map((item: any, index: number) => {
        let score = 0;
        const text = item.text.toLowerCase();
        const role = item.role.toLowerCase();
        
        // Basic match check
        const matchesText = text.includes(query);
        const matchesRole = role.includes(query);
        
        if (!matchesText && !matchesRole) return { ...item, originalIndex: index, score: -1 };

        // 1. Base score for matches
        if (matchesText) score += 10;
        if (matchesRole) score += 5;

        // 2. Role Prioritization: User responses are often more relevant for review
        if (item.role === 'user') {
          score += 5;
        }

        // 3. Recency Weighting: More recent entries get a slight boost
        // We use the index as a proxy for recency (higher index = more recent)
        const recencyBoost = (index / transcript.length) * 5;
        score += recencyBoost;

        // 4. Exact match boost
        if (text === query) score += 20;

        return { ...item, originalIndex: index, score };
      })
      .filter((item: any) => item.score >= 0)
      .sort((a: any, b: any) => b.score - a.score);
  }, [transcript, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Typography.H1 className="text-2xl">{session.config.type} Interview Replay</Typography.H1>
            <Typography.Body className="text-xs text-white/40">
              {new Date(session.createdAt?.toDate()).toLocaleString()} • {session.config.difficulty}
            </Typography.Body>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-white/60">Audio Playback (Simulated)</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Transcript Area */}
        <Card className="lg:col-span-8 flex flex-col overflow-hidden bg-[#0a0a0a]/60 border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2 text-white/60">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Transcript</span>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input 
                type="text" 
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
          >
            {filteredTranscript.map((item: any, index: number) => {
              const actualIndex = item.originalIndex !== undefined ? item.originalIndex : index;
              const isActive = actualIndex === currentTime;
              const isInterviewer = item.role === 'interviewer' || item.role === 'model';
              
              return (
                <motion.div 
                  key={actualIndex}
                  initial={{ opacity: 0, x: isInterviewer ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-4 group cursor-pointer transition-all duration-300",
                    isActive && "bg-emerald-500/5 -mx-4 px-4 py-2 rounded-xl ring-1 ring-emerald-500/20"
                  )}
                  onClick={() => handleJump(actualIndex)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                    isInterviewer ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {isInterviewer ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                        {isInterviewer ? 'Interviewer' : 'You'}
                      </span>
                      <span className="text-[10px] font-mono opacity-0 group-hover:opacity-30 transition-opacity">
                        {Math.floor(actualIndex * 2 / 60)}:{(actualIndex * 2 % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed transition-colors",
                      isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                    )}>
                      {item.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Player Controls */}
          <div className="p-6 bg-white/[0.02] border-t border-white/5">
            <div className="flex flex-col gap-4">
              {/* Progress Bar */}
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden cursor-pointer group">
                <div 
                  className="absolute inset-0 bg-emerald-500/40 transition-all duration-300" 
                  style={{ width: `${(currentTime / (transcript.length - 1)) * 100}%` }}
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Hover seek indicator can go here */}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button 
                    onClick={() => setCurrentTime(Math.min(transcript.length - 1, currentTime + 5))}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-white/40 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {Math.floor(currentTime * 2 / 60)}:{(currentTime * 2 % 60).toString().padStart(2, '0')}
                  </span>
                  <span>/</span>
                  <span>
                    {Math.floor((transcript.length - 1) * 2 / 60)}:{((transcript.length - 1) * 2 % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2">
          <Card className="p-6 space-y-6">
            <Typography.H2 className="text-lg">Session Summary</Typography.H2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Overall Score</span>
                <span className="text-xl font-bold text-emerald-400">{session.debrief?.scores?.overall || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Duration</span>
                <span className="text-sm text-white/80">{session.debrief?.session_summary?.actual_duration_minutes || session.config.duration}m</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Messages</span>
                <span className="text-sm text-white/80">{transcript.length}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10">
            <Typography.H2 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4">Key Insight</Typography.H2>
            <Typography.Body className="text-sm text-white/70 leading-relaxed">
              {session.debrief?.strengths?.[0]?.title}: {session.debrief?.strengths?.[0]?.why_it_matters}
            </Typography.Body>
          </Card>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
            <Volume2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-200/60 leading-tight">
              Note: Synchronized audio recording is currently in beta. This replay uses simulated timing based on transcript length.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
