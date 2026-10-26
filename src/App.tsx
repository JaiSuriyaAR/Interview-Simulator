import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, getDoc, setDoc, limit, onSnapshot, deleteDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { InterviewRoom } from './components/InterviewRoom';
import { DebriefView } from './components/DebriefView';
import { ProfileView } from './components/ProfileView';
import { AnalyticsView } from './components/AnalyticsView';
import { SessionReplayView } from './components/SessionReplayView';
import { HistoryView } from './components/HistoryView';
import { Card, Button, Typography, Select } from './components/ui/Base';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Play, History, Settings, LogOut, Briefcase, Zap, Star, ChevronRight, Loader2, FileText, User, Target, Sparkles, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const Logo = ({ onClick }: { onClick?: () => void }) => (
  <div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
      <Zap className="w-5 h-5 text-white" fill="currentColor" />
    </div>
    <span className="text-xl font-bold tracking-tight">InterviewPulse</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [view, setView] = useState<'dashboard' | 'setup' | 'room' | 'debrief' | 'profile' | 'analytics' | 'replay' | 'history'>('dashboard');
  const [previousView, setPreviousView] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [config, setConfig] = useState<any>({
    type: 'HR',
    difficulty: 'easy',
    duration: 30,
    companyUrl: ''
  });
  const [activeDebrief, setActiveDebrief] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [lastSessionData, setLastSessionData] = useState<{ transcript: any[], config: any } | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    avgScore: 0,
    practiceTime: 0
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const testFirestoreWrite = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      console.log("Testing Firestore write to 'test_writes' collection...");
      const testRef = collection(db, 'test_writes');
      const docRef = await addDoc(testRef, {
        userId: user.uid,
        timestamp: serverTimestamp(),
        message: "Test write from dashboard"
      });
      console.log("Test write successful! Doc ID:", docRef.id);
      
      // Also test write to sessions with dummy data
      console.log("Testing write to 'sessions' collection...");
      const sessionRef = collection(db, 'sessions');
      const dummySession = {
        userId: user.uid,
        config: { type: 'Test', difficulty: 'easy', duration: 10 },
        transcript: [{ speaker: 'user', text: 'Hello', timestamp: Date.now() }],
        debrief: { scores: { overall: 80 }, session_summary: { role_guess: 'Tester', company: 'TestCo' }, strengths: [], improvements: [], practice_plan_7_days: [] },
        createdAt: serverTimestamp()
      };
      const sessionDoc = await addDoc(sessionRef, dummySession);
      console.log("Session test write successful! ID:", sessionDoc.id);
      
      alert("Test writes successful!\nTest Write ID: " + docRef.id + "\nSession ID: " + sessionDoc.id);
    } catch (e) {
      console.error("Test write failed:", e);
      alert("Test write failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateStats = (sessions: any[]) => {
    const total = sessions.length;
    const avgScore = total > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + (s.debrief?.scores?.overall || 0), 0) / total)
      : 0;
    
    const totalMinutes = sessions.reduce((acc, s) => {
      const actual = s.debrief?.session_summary?.actual_duration_minutes;
      return acc + (typeof actual === 'number' ? actual : (s.config?.duration || 0));
    }, 0);
    
    const practiceTime = totalMinutes / 60;

    setStats({
      total,
      avgScore,
      practiceTime: parseFloat(practiceTime.toFixed(1))
    });
    setRecentSessions(sessions.slice(0, 5));
  };

  const fetchUserData = async (uid: string) => {
    setIsRefreshing(true);
    try {
      console.log("Manually fetching sessions for user:", uid);
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', uid)
      );
      const snapshot = await getDocs(q);
      console.log(`Manual fetch returned ${snapshot.docs.length} sessions`);
      
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      sessions.sort((a, b) => {
        if (!a.createdAt && b.createdAt) return -1;
        if (a.createdAt && !b.createdAt) return 1;
        if (!a.createdAt && !b.createdAt) return 0;
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return timeB - timeA;
      });

      setAllSessions(sessions);
      updateStats(sessions);
    } catch (e) {
      console.error("Manual fetch failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let unsubscribeSessions: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Ensure user document exists in Firestore
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const userData = {
              name: u.displayName || 'Candidate',
              email: u.email || '',
              role: 'user',
              photoURL: u.photoURL || '',
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, userData);
          }
        } catch (e) {
          console.error("Error ensuring user document:", e);
        }

        // Real-time listener for sessions
        const q = query(
          collection(db, 'sessions'),
          where('userId', '==', u.uid)
        );
        
        unsubscribeSessions = onSnapshot(q, (snapshot) => {
          console.log(`Received ${snapshot.docs.length} sessions from Firestore`);
          const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
          
          sessions.sort((a, b) => {
            if (!a.createdAt && b.createdAt) return -1;
            if (a.createdAt && !b.createdAt) return 1;
            if (!a.createdAt && !b.createdAt) return 0;
            const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return timeB - timeA;
          });

          setAllSessions(sessions);
          updateStats(sessions);
        }, (error) => {
          console.error("Error listening to sessions:", error);
        });
      } else {
        if (unsubscribeSessions) unsubscribeSessions();
        setStats({ total: 0, avgScore: 0, practiceTime: 0 });
        setRecentSessions([]);
        setAllSessions([]);
        setView('dashboard');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSessions) unsubscribeSessions();
    };
  }, []);

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } else {
      // Assume text file
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setConfig({ ...config, resumeText: text, cvFileName: file.name });
    } catch (err) {
      console.error("Failed to extract text:", err);
      alert("Failed to read the file. Please try a different format or paste the text in the Job Description field.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRegenerateDebrief = async () => {
    if (!lastSessionData || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const { generateDebrief } = await import('./services/debriefService');
      const newDebrief = await generateDebrief(lastSessionData.transcript, lastSessionData.config, true);
      setActiveDebrief(newDebrief);
    } catch (error) {
      console.error("Regeneration failed:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session. Please try again.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col">
        <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Logo onClick={() => setShowAuth(false)} />
            <Button variant="ghost" onClick={() => setShowAuth(false)} className="text-white/50 hover:text-white">
              Back to Home
            </Button>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <AuthScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      {/* Background Aurora */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo onClick={() => setView('dashboard')} />
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView('profile')}
              className={cn(
                "text-white/50 hover:text-white transition-colors",
                view === 'profile' && "text-emerald-400"
              )}
            >
              <User className="w-5 h-5" />
            </button>
            <button className="text-white/50 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-bold">{user.displayName?.[0] || user.email?.[0].toUpperCase()}</span>
                )}
              </div>
              <button onClick={() => setShowSignOutConfirm(true)} className="text-white/50 hover:text-white transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutConfirm(false)}
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
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <Typography.H2 className="text-xl">Sign Out</Typography.H2>
                  <Typography.Body className="text-sm">Are you sure you want to sign out of InterviewPulse?</Typography.Body>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setShowSignOutConfirm(false)} className="flex-1">Cancel</Button>
                  <Button onClick={() => signOut(auth)} className="flex-1 bg-red-600 hover:bg-red-500">Sign Out</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <Typography.H1>Dashboard</Typography.H1>
                  <Typography.Body className="mt-2">Welcome back. Ready for your next session?</Typography.Body>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={testFirestoreWrite}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 text-white/30 hover:text-white"
                  >
                    <Zap className="w-4 h-4" />
                    Test DB
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => fetchUserData(user.uid)} 
                    disabled={isRefreshing}
                    className="flex items-center gap-2 text-white/60 hover:text-white"
                  >
                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button variant="ghost" onClick={() => setView('analytics')} className="flex items-center gap-2 text-white/60 hover:text-white">
                    <TrendingUp className="w-5 h-5" />
                    Analytics
                  </Button>
                  <Button onClick={() => setView('setup')} className="flex items-center gap-2 shadow-xl shadow-emerald-500/20">
                    <Plus className="w-5 h-5" />
                    New Interview
                  </Button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Stats/Recent */}
                <div className="lg:col-span-8 space-y-8">
                  {stats.total > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors" />
                          <Star className="w-6 h-6 text-amber-400 mb-6" />
                          <div className="flex items-baseline gap-2">
                            <div className="text-5xl font-bold tracking-tighter">{stats.avgScore}</div>
                            <div className="text-sm font-bold text-white/30 uppercase tracking-widest">Avg. Score</div>
                          </div>
                          <div className="mt-4 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.avgScore}%` }}
                              className="h-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                            />
                          </div>
                        </Card>
                        <Card className="p-8 flex flex-col justify-between">
                          <History className="w-6 h-6 text-emerald-400 mb-6" />
                          <div>
                            <div className="text-4xl font-bold tracking-tighter">{stats.total}</div>
                            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Total Sessions</div>
                          </div>
                        </Card>
                        <Card className="p-8 flex flex-col justify-between">
                          <Zap className="w-6 h-6 text-indigo-400 mb-6" />
                          <div>
                            <div className="text-4xl font-bold tracking-tighter">{stats.practiceTime}h</div>
                            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Practice Time</div>
                          </div>
                        </Card>
                      </div>

                      <section>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <Typography.H2 className="text-xl">Recent Sessions</Typography.H2>
                            {recentSessions.length > 0 && (
                              <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Last {recentSessions.length} Sessions</span>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            onClick={() => setView('history')}
                            className="text-xs font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 flex items-center gap-2"
                          >
                            View All
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {recentSessions.map((session) => (
                            <Card 
                              key={session.id} 
                              className="p-5 hover:bg-white/[0.07] transition-all cursor-pointer group border-white/5 hover:border-white/10"
                              onClick={() => {
                                setSelectedSession(session);
                                setPreviousView('dashboard');
                                setView('replay');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <Briefcase className="w-6 h-6 text-white/40 group-hover:text-white/60 transition-colors" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-lg text-white/90 group-hover:text-white transition-colors">{session.config.type} Interview</div>
                                    <div className="text-sm text-white/40 flex items-center gap-2">
                                      <span>
                                        {session.createdAt 
                                          ? new Date(session.createdAt.toDate()).toLocaleDateString() 
                                          : 'Just now'}
                                      </span>
                                      <span className="w-1 h-1 rounded-full bg-white/10" />
                                      <span className="capitalize">{session.config.difficulty}</span>
                                      <span className="w-1 h-1 rounded-full bg-white/10" />
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {session.debrief?.session_summary?.actual_duration_minutes || session.config.duration}m
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-8">
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-emerald-400 tracking-tighter">{session.debrief.scores.overall}</div>
                                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Overall</div>
                                  </div>
                                  <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <Card className="p-12 flex flex-col items-center justify-center text-center bg-emerald-500/5 border-emerald-500/10">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8">
                          <Zap className="w-10 h-10 text-emerald-400" />
                        </div>
                        <Typography.H2 className="text-3xl mb-4">Welcome to InterviewPulse</Typography.H2>
                        <Typography.Body className="max-w-md text-white/60 mb-10">
                          You haven't completed any interview sessions yet. Start your first session to unlock personalized AI insights, performance tracking, and a 7-day practice plan.
                        </Typography.Body>
                        <Button onClick={() => setView('setup')} className="px-10 py-4 text-lg flex items-center gap-3">
                          <Play className="w-5 h-5" />
                          Start Your First Interview
                        </Button>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-8 border-white/5">
                          <Target className="w-8 h-8 text-indigo-400 mb-6" />
                          <Typography.H2 className="text-xl mb-3">Tailored Tracks</Typography.H2>
                          <Typography.Body className="text-sm text-white/40">
                            Choose from HR, Technical, Coding, or Situational tracks to match your upcoming interview.
                          </Typography.Body>
                        </Card>
                        <Card className="p-8 border-white/5">
                          <Star className="w-8 h-8 text-amber-400 mb-6" />
                          <Typography.H2 className="text-xl mb-3">Instant Debrief</Typography.H2>
                          <Typography.Body className="text-sm text-white/40">
                            Get a comprehensive score and actionable feedback immediately after your session ends.
                          </Typography.Body>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Insights */}
                <div className="lg:col-span-4 space-y-8">
                  {stats.total > 0 ? (
                    <Card className="p-6 bg-emerald-500/5 border-emerald-500/10">
                      <Typography.H2 className="text-lg mb-4">AI Insight</Typography.H2>
                      <Typography.Body className="text-sm text-white/70">
                        {stats.avgScore >= 80 
                          ? "Your performance is strong. To reach the next level, try tackling 'Hard' difficulty sessions or specific company tracks."
                          : "Focus on consistency. Reviewing your debriefs and practicing regularly will help improve your technical depth and communication."}
                      </Typography.Body>
                    </Card>
                  ) : (
                    <Card className="p-8 border-dashed border-white/10 bg-transparent flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Sparkles className="w-6 h-6 text-white/20" />
                      </div>
                      <Typography.H2 className="text-lg mb-4 text-white/30">AI Insights Locked</Typography.H2>
                      <Typography.Body className="text-sm text-white/20">
                        Complete at least one interview session to unlock personalized performance analysis and growth recommendations.
                      </Typography.Body>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProfileView 
                user={user} 
                sessions={allSessions} 
                onBack={() => setView('dashboard')}
                onSelectSession={(session) => {
                  setSelectedSession(session);
                  setPreviousView('profile');
                  setView('replay');
                }}
                onDeleteSession={handleDeleteSession}
              />
            </motion.div>
          )}

          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="p-8 md:p-12 space-y-10">
                <div className="space-y-2">
                  <Typography.H1 className="text-3xl md:text-4xl">Setup Interview</Typography.H1>
                  <Typography.Body className="text-white/50">Configure your session parameters to get started.</Typography.Body>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Type</label>
                      <Select 
                        value={config?.type || 'HR'}
                        onChange={(val) => setConfig({ ...config, type: val })}
                        options={[
                          { value: 'HR', label: 'HR / Behavioral' },
                          { value: 'Technical', label: 'Technical' },
                          { value: 'Coding', label: 'Coding' },
                          { value: 'Situational', label: 'Situational' },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Difficulty</label>
                      <Select 
                        value={config?.difficulty || 'easy'}
                        onChange={(val) => setConfig({ ...config, difficulty: val })}
                        options={[
                          { value: 'easy', label: 'Easy' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'hard', label: 'Hard' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Company Website</label>
                    <input 
                      type="url" 
                      placeholder="https://google.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                      onChange={(e) => setConfig({ ...config, companyUrl: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">CV / Resume (PDF or Text)</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".pdf,.txt,.md"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/50 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                          onChange={handleFileChange}
                        />
                        {isExtracting && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          </div>
                        )}
                      </div>
                      {config?.cvFileName && !isExtracting && (
                        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-medium">
                          <FileText className="w-3 h-3" />
                          {config.cvFileName}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Planned Duration</label>
                      <Select 
                        value={config?.duration?.toString() || '30'}
                        onChange={(val) => setConfig({ ...config, duration: parseInt(val) })}
                        options={[
                          { value: '30', label: '30 Minutes' },
                          { value: '60', label: '60 Minutes' },
                          { value: '120', label: '120 Minutes' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Job Description (Optional)</label>
                    <textarea 
                      placeholder="Paste the JD here..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                      onChange={(e) => setConfig({ ...config, jdText: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Cancel</Button>
                    <Button 
                      onClick={() => {
                        setView('room');
                        setConfig({
                          type: config?.type || 'HR',
                          difficulty: config?.difficulty || 'easy',
                          duration: config?.duration || 30,
                          companyUrl: config?.companyUrl,
                          jdText: config?.jdText,
                          resumeText: config?.resumeText
                        });
                      }} 
                      disabled={isExtracting || !config?.companyUrl || !config?.type || !config?.difficulty || !config?.duration}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Session
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {view === 'room' && (
            <motion.div
              key="room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <InterviewRoom 
                config={config} 
                onEnd={(debrief, transcript) => {
                  if (!debrief) {
                    setView('dashboard');
                    return;
                  }
                  setActiveDebrief(debrief);
                  setLastSessionData({ transcript, config });
                  setView('debrief');
                }} 
              />
            </motion.div>
          )}

          {view === 'debrief' && (
            <motion.div
              key="debrief"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DebriefView 
                debrief={activeDebrief} 
                isRegenerating={isRegenerating}
                onRegenerate={handleRegenerateDebrief} 
                onDone={() => {
                  setView('dashboard');
                  fetchUserData(user.uid);
                }} 
              />
            </motion.div>
          )}

          {view === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AnalyticsView 
                sessions={allSessions} 
                onBack={() => setView('dashboard')} 
              />
            </motion.div>
          )}

          {view === 'replay' && (
            <motion.div
              key="replay"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <SessionReplayView 
                session={selectedSession} 
                onBack={() => setView(previousView)} 
              />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HistoryView 
                sessions={allSessions} 
                onBack={() => setView('dashboard')}
                onSelectSession={(session) => {
                  setSelectedSession(session);
                  setPreviousView('history');
                  setView('replay');
                }}
                onDeleteSession={handleDeleteSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
