import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Typography } from './ui/Base';
import { 
  Zap, 
  Mic, 
  BarChart3, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Sparkles, 
  ShieldCheck,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to InterviewPulse",
    description: "Your journey to mastering the art of the interview begins here. Let's show you how it works.",
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    image: (
      <div className="relative w-full h-48 flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full animate-pulse" />
        <Zap className="w-24 h-24 text-emerald-500 animate-bounce" />
      </div>
    )
  },
  {
    title: "Tailored Setup",
    description: "Configure your session by selecting the interview type, difficulty, and uploading your resume. We personalize every question to your profile.",
    icon: Target,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    image: (
      <div className="relative w-full h-48 flex items-center justify-center gap-4">
        <div className="w-24 h-32 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <Target className="w-8 h-8 text-indigo-400" />
        </div>
        <ChevronRight className="w-6 h-6 text-white/20" />
        <div className="w-24 h-32 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </div>
      </div>
    )
  },
  {
    title: "Voice-First Interaction",
    description: "Experience natural, low-latency voice conversations with our AI interviewers. No typing, just real-world practice.",
    icon: Mic,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    image: (
      <div className="relative w-full h-48 flex items-center justify-center">
        <div className="flex items-end gap-1 h-12">
          {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: [`${h * 20}px`, `${h * 48}px`, `${h * 20}px`] }}
              transition={{ repeat: Infinity, duration: 1 + i * 0.1, ease: "easeInOut" }}
              className="w-2 bg-rose-500 rounded-full"
            />
          ))}
        </div>
      </div>
    )
  },
  {
    title: "Deep Insights",
    description: "After every session, receive a detailed debrief with scores, strengths, and a personalized 7-day practice plan to improve.",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    image: (
      <div className="relative w-full h-48 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2 w-48">
          <div className="h-16 bg-amber-500/20 rounded-lg border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div className="h-24 bg-emerald-500/20 rounded-lg border border-emerald-500/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="h-20 bg-indigo-500/20 rounded-lg border border-indigo-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
      </div>
    )
  }
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative"
      >
        <Card className="p-8 md:p-12 bg-[#0a0a0a] border-white/10 shadow-2xl relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl", step.bg)}>
                  <Icon className={cn("w-10 h-10", step.color)} />
                </div>

                <div className="space-y-4">
                  <Typography.H1 className="text-3xl md:text-4xl">
                    {step.title}
                  </Typography.H1>
                  <Typography.Body className="max-w-md mx-auto text-lg text-white/50">
                    {step.description}
                  </Typography.Body>
                </div>

                {step.image}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-12">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === currentStep ? "bg-emerald-500 w-6" : "bg-white/10"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-4">
              {currentStep > 0 && (
                <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="flex items-center gap-2 px-8">
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
