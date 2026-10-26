import React from 'react';
import { motion } from 'motion/react';
import { Button, Typography, Card } from './ui/Base';
import { Zap, Shield, Target, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      {/* Hero Section */}
      <main className="flex-1 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8">
              <Sparkles className="w-3 h-3" />
              AI-Powered Interview Preparation
            </div>
            
            <Typography.H1 className="text-5xl md:text-7xl mb-6 font-bold tracking-tight">
              Master Your Next <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                Technical Interview
              </span>
            </Typography.H1>
            
            <Typography.Body className="max-w-2xl mx-auto text-lg md:text-xl text-white/60 mb-10 leading-relaxed">
              InterviewPulse uses advanced AI to simulate real-world interview scenarios. 
              Get instant feedback, analyze your performance, and land your dream job with confidence.
            </Typography.Body>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={onGetStarted} 
                className="w-full sm:w-auto px-8 py-4 text-lg flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/20"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32"
          >
            <Card className="p-8 text-left group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <Typography.H2 className="text-xl mb-3">Real Scenarios</Typography.H2>
              <Typography.Body className="text-sm text-white/50">
                Simulate interviews for specific companies like Google, Meta, or startups with tailored questions.
              </Typography.Body>
            </Card>

            <Card className="p-8 text-left group hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <Typography.H2 className="text-xl mb-3">Instant Feedback</Typography.H2>
              <Typography.Body className="text-sm text-white/50">
                Receive detailed AI-driven analysis of your communication, technical depth, and problem-solving skills.
              </Typography.Body>
            </Card>

            <Card className="p-8 text-left group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <Typography.H2 className="text-xl mb-3">Private & Secure</Typography.H2>
              <Typography.Body className="text-sm text-white/50">
                Your practice sessions are completely private. Practice as much as you need without any pressure.
              </Typography.Body>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-bold tracking-tight">InterviewPulse</span>
          </div>
          <div className="text-white/30 text-sm">
            © 2026 InterviewPulse. All rights reserved.
          </div>
          <div className="flex gap-8 text-sm text-white/50">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
