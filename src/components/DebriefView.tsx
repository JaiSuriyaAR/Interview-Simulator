import React from 'react';
import { motion } from 'motion/react';
import { Card, Button, Typography } from './ui/Base';
import { cn } from '@/src/lib/utils';
import { CheckCircle2, TrendingUp, Target, Calendar, ArrowRight, RefreshCw, Award, Clock } from 'lucide-react';

interface DebriefViewProps {
  debrief: any;
  isRegenerating?: boolean;
  onRegenerate: () => void;
  onDone: () => void;
}

export const DebriefView = ({ debrief, isRegenerating, onRegenerate, onDone }: DebriefViewProps) => {
  const scores = [
    { label: 'Overall', value: debrief.scores.overall, icon: Award },
    { label: 'Communication', value: debrief.scores.communication, icon: TrendingUp },
    { label: 'Role Fit', value: debrief.scores.role_fit, icon: Target },
    { label: 'Technical', value: debrief.scores.technical_depth, icon: CheckCircle2 },
    { label: 'Structure (STAR)', value: debrief.scores.structure_star, icon: Target },
    { label: 'Confidence', value: debrief.scores.confidence_clarity, icon: Award },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-12 pb-24">
      {/* Header & Scores */}
      <section className="text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Typography.H1>Session Debrief</Typography.H1>
          <Typography.Body className="mt-2">
            {debrief.session_summary.role_guess} at {debrief.session_summary.company}
          </Typography.Body>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {scores.map((score, i) => (
            <motion.div
              key={score.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 flex flex-col items-center gap-3">
                <score.icon className="w-5 h-5 text-emerald-400" />
                <span className="text-3xl font-bold text-white">{score.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{score.label}</span>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Strengths */}
        <section className="space-y-6">
          <Typography.H2 className="text-xl flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400 w-5 h-5" />
            Key Strengths
          </Typography.H2>
          <div className="space-y-4">
            {debrief.strengths.map((s: any, i: number) => (
              <Card key={i} className="p-6 border-l-4 border-l-emerald-500/50">
                <Typography.H2 className="text-lg mb-2">{s.title}</Typography.H2>
                <Typography.Body className="text-sm mb-4">{s.why_it_matters}</Typography.Body>
                <div className="bg-white/5 p-3 rounded-lg text-xs italic text-white/50 border border-white/5">
                  "{s.evidence.quote}"
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Improvements */}
        <section className="space-y-6">
          <Typography.H2 className="text-xl flex items-center gap-2">
            <TrendingUp className="text-amber-400 w-5 h-5" />
            Areas for Growth
          </Typography.H2>
          <div className="space-y-4">
            {debrief.improvements.map((imp: any, i: number) => (
              <Card key={i} className="p-6 border-l-4 border-l-amber-500/50">
                <Typography.H2 className="text-lg mb-2">{imp.title}</Typography.H2>
                <Typography.Body className="text-sm mb-4">{imp.issue}</Typography.Body>
                <div className="space-y-3">
                  <div className="bg-red-500/5 p-3 rounded-lg text-xs text-red-200/60 border border-red-500/10">
                    <span className="font-bold uppercase text-[9px] block mb-1 opacity-50">Observed</span>
                    "{imp.evidence.quote}"
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-lg text-xs text-emerald-200/60 border border-emerald-500/10">
                    <span className="font-bold uppercase text-[9px] block mb-1 opacity-50">Better Approach</span>
                    {imp.better_answer_example}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* 7-Day Plan */}
      <section className="space-y-6">
        <Typography.H2 className="text-xl flex items-center gap-2">
          <Calendar className="text-indigo-400 w-5 h-5" />
          7-Day Practice Plan
        </Typography.H2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {debrief.practice_plan_7_days.map((day: any) => (
            <Card key={day.day} className="p-4 flex flex-col gap-3 group hover:border-indigo-500/30 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Day {day.day}</span>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <Clock className="w-3 h-3" />
                  {day.time_minutes}m
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-white block mb-2">{day.focus}</span>
                <ul className="space-y-1">
                  {day.tasks.slice(0, 2).map((task: string, ti: number) => (
                    <li key={ti} className="text-[10px] text-white/50 flex gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
                      <span className="line-clamp-2">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-center gap-4 pt-8 border-t border-white/10">
        <Button 
          variant="secondary" 
          onClick={onRegenerate} 
          disabled={isRegenerating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
          {isRegenerating ? "Regenerating..." : "Regenerate Debrief"}
        </Button>
        <Button variant="primary" onClick={onDone} disabled={isRegenerating} className="flex items-center gap-2">
          Return to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
