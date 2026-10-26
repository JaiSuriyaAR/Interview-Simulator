import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Typography } from './ui/Base';
import { cn } from '@/src/lib/utils';
import { 
  History, Search, Filter, ChevronRight, Briefcase, 
  Clock, Calendar, ArrowLeft, Star, Trash2, MoreVertical, Zap
} from 'lucide-react';

interface HistoryViewProps {
  sessions: any[];
  onBack: () => void;
  onSelectSession: (session: any) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const HistoryView = ({ sessions = [], onBack, onSelectSession, onDeleteSession }: HistoryViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.config.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.config.companyUrl || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || session.config.type.toLowerCase() === filterType.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  const types = ['all', 'HR', 'Technical', 'Coding', 'Situational'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Typography.H1 className="text-3xl">Session History</Typography.H1>
            <Typography.Body className="text-white/50">Review and replay all your past interview sessions.</Typography.Body>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text" 
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/30 transition-colors w-64"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {types.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
              filterType === type 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-white/5 border-white/5 text-white/40 hover:border-white/10 hover:text-white"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <Card 
              key={session.id} 
              className="p-6 hover:bg-white/[0.07] transition-all cursor-pointer group border-white/5 hover:border-white/10 relative overflow-hidden"
              onClick={() => onSelectSession(session)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Briefcase className="w-7 h-7 text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xl text-white/90 group-hover:text-white transition-colors">
                        {session.config.type} Interview
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                        session.config.difficulty === 'easy' ? "bg-emerald-500/10 text-emerald-400" :
                        session.config.difficulty === 'medium' ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      )}>
                        {session.config.difficulty}
                      </span>
                    </div>
                    <div className="text-sm text-white/40 flex flex-wrap items-center gap-y-1 gap-x-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {session.createdAt 
                          ? new Date(session.createdAt.toDate()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                          : 'Just now'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {session.debrief?.session_summary?.actual_duration_minutes || session.config.duration}m
                      </span>
                      {session.config.companyUrl && (
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          {session.config.companyUrl.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400 tracking-tighter">
                        {session.debrief?.scores?.overall || 0}
                      </div>
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Score</div>
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className="text-xl font-bold text-white/60 tracking-tighter">
                        {session.transcript?.length || 0}
                      </div>
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Turns</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {onDeleteSession && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(session.id);
                        }}
                        className="p-3 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-colors">
                      <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-20 text-center space-y-6 bg-white/[0.02] border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <History className="w-10 h-10 text-white/10" />
            </div>
            <div className="space-y-2">
              <Typography.H2 className="text-xl text-white/40">No sessions found</Typography.H2>
              <Typography.Body className="text-sm text-white/20">
                {searchQuery ? "Try adjusting your search or filters." : "Start your first interview to see it here."}
              </Typography.Body>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <Card className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <Typography.H2 className="text-xl">Delete Session?</Typography.H2>
                  <Typography.Body className="text-sm">This action cannot be undone. All transcript and debrief data will be permanently removed.</Typography.Body>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Cancel</Button>
                  <Button 
                    onClick={() => {
                      onDeleteSession?.(showDeleteConfirm);
                      setShowDeleteConfirm(null);
                    }} 
                    className="flex-1 bg-red-600 hover:bg-red-500"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
