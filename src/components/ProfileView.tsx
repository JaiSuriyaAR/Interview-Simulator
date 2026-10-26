import React, { useState, useMemo } from 'react';
import { auth } from '@/src/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { Card, Button, Typography } from './ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Camera, Save, ArrowLeft, CheckCircle2, Shield, Target, 
  TrendingUp, Award, Zap, AlertCircle, BarChart3, PieChart as PieChartIcon,
  LayoutDashboard, Star, Clock, Briefcase, History
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { HistoryView } from './HistoryView';

interface ProfileViewProps {
  user: any;
  sessions: any[];
  onBack: () => void;
  onSelectSession: (session: any) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ProfileView = ({ user, sessions = [], onBack, onSelectSession, onDeleteSession }: ProfileViewProps) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [prefType, setPrefType] = useState('Technical');
  const [prefDifficulty, setPrefDifficulty] = useState('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'history' | 'profile' | 'preferences' | 'account'>('insights');

  const safeSessions = useMemo(() => Array.isArray(sessions) ? sessions : [], [sessions]);

  // Analytics Data
  const analyticsData = useMemo(() => {
    if (safeSessions.length === 0) return null;

    const trendData = [...safeSessions].reverse().map((s, i) => ({
      name: `S${i + 1}`,
      overall: s.debrief?.scores?.overall || 0,
      communication: s.debrief?.scores?.communication || 0,
      technical: s.debrief?.scores?.technical_depth || 0,
      date: s.createdAt?.toDate ? new Date(s.createdAt.toDate()).toLocaleDateString() : 'N/A'
    }));

    const avgScores = {
      overall: Math.round(safeSessions.reduce((acc, s) => acc + (s.debrief?.scores?.overall || 0), 0) / safeSessions.length),
      communication: Math.round(safeSessions.reduce((acc, s) => acc + (s.debrief?.scores?.communication || 0), 0) / safeSessions.length),
      roleFit: Math.round(safeSessions.reduce((acc, s) => acc + (s.debrief?.scores?.role_fit || 0), 0) / safeSessions.length),
      technical: Math.round(safeSessions.reduce((acc, s) => acc + (s.debrief?.scores?.technical_depth || 0), 0) / safeSessions.length),
    };

    const distributionData = [
      { name: 'Overall', value: avgScores.overall, color: '#10b981' },
      { name: 'Comm.', value: avgScores.communication, color: '#f59e0b' },
      { name: 'Role Fit', value: avgScores.roleFit, color: '#6366f1' },
      { name: 'Tech', value: avgScores.technical, color: '#ec4899' },
    ];

    // Performance by Type
    const types = ['HR', 'Technical', 'Coding', 'Situational'];
    const performanceByType = types.map(type => {
      const typeSessions = safeSessions.filter(s => s.config?.type === type);
      const avg = typeSessions.length > 0
        ? Math.round(typeSessions.reduce((acc, s) => acc + (s.debrief?.scores?.overall || 0), 0) / typeSessions.length)
        : 0;
      return { subject: type, A: avg, fullMark: 100 };
    });

    // Performance by Difficulty
    const difficulties = ['easy', 'medium', 'hard'];
    const performanceByDifficulty = difficulties.map(diff => {
      const diffSessions = safeSessions.filter(s => s.config?.difficulty === diff);
      const avg = diffSessions.length > 0
        ? Math.round(diffSessions.reduce((acc, s) => acc + (s.debrief?.scores?.overall || 0), 0) / diffSessions.length)
        : 0;
      return { name: diff.charAt(0).toUpperCase() + diff.slice(1), value: avg };
    });

    // Strengths & Improvements
    const allStrengths = safeSessions.flatMap(s => s.debrief?.strengths || []);
    const strengthCounts = allStrengths.reduce((acc: any, s: any) => {
      if (s.title) acc[s.title] = (acc[s.title] || 0) + 1;
      return acc;
    }, {});
    const topStrengths = Object.entries(strengthCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 4);

    const allImprovements = safeSessions.flatMap(s => s.debrief?.improvements || []);
    const improvementCounts = allImprovements.reduce((acc: any, s: any) => {
      if (s.title) acc[s.title] = (acc[s.title] || 0) + 1;
      return acc;
    }, {});
    const topImprovements = Object.entries(improvementCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 4);

    return {
      trendData,
      distributionData,
      performanceByType,
      performanceByDifficulty,
      topStrengths,
      topImprovements,
      avgScores
    };
  }, [safeSessions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser!, {
        displayName,
        photoURL
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <Typography.H1 className="text-3xl">Settings</Typography.H1>
          <Typography.Body className="text-white/40">Manage your profile, preferences, and account security.</Typography.Body>
        </div>
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'insights', label: 'Insights', icon: LayoutDashboard },
            { id: 'history', label: 'History', icon: History },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'preferences', label: 'Preferences', icon: Target },
            { id: 'account', label: 'Account', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                {!analyticsData ? (
                  <Card className="p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp className="w-10 h-10 text-white/20" />
                    </div>
                    <Typography.H2>No Insights Available</Typography.H2>
                    <Typography.Body className="text-white/40 max-w-sm mx-auto">
                      Complete your first interview session to unlock detailed performance analytics and trend tracking.
                    </Typography.Body>
                  </Card>
                ) : (
                  <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-6 bg-emerald-500/5 border-emerald-500/10">
                        <div className="flex items-center gap-3 mb-4">
                          <Star className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Avg. Score</span>
                        </div>
                        <div className="text-4xl font-bold tracking-tighter">{analyticsData.avgScores.overall}</div>
                      </Card>
                      <Card className="p-6 bg-indigo-500/5 border-indigo-500/10">
                        <div className="flex items-center gap-3 mb-4">
                          <Briefcase className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Sessions</span>
                        </div>
                        <div className="text-4xl font-bold tracking-tighter">{safeSessions.length}</div>
                      </Card>
                      <Card className="p-6 bg-amber-500/5 border-amber-500/10">
                        <div className="flex items-center gap-3 mb-4">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Growth</span>
                        </div>
                        <div className="text-4xl font-bold tracking-tighter">
                          {analyticsData.trendData.length > 1 
                            ? (analyticsData.trendData[analyticsData.trendData.length - 1].overall - analyticsData.trendData[0].overall > 0 ? '+' : '') + 
                              (analyticsData.trendData[analyticsData.trendData.length - 1].overall - analyticsData.trendData[0].overall)
                            : '0'}
                        </div>
                      </Card>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 h-[350px] flex flex-col">
                        <Typography.H2 className="text-lg mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          Score Trends
                        </Typography.H2>
                        <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.trendData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="overall" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="p-6 h-[350px] flex flex-col">
                        <Typography.H2 className="text-lg mb-6 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-400" />
                          Performance by Type
                        </Typography.H2>
                        <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.performanceByType}>
                              <PolarGrid stroke="#ffffff10" />
                              <PolarAngleAxis dataKey="subject" stroke="#ffffff40" fontSize={10} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#ffffff20" fontSize={8} />
                              <Radar name="Score" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 h-[300px] flex flex-col">
                        <Typography.H2 className="text-lg mb-6 flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          By Difficulty
                        </Typography.H2>
                        <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.performanceByDifficulty}>
                              <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis hide domain={[0, 100]} />
                              <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                {analyticsData.performanceByDifficulty.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="p-6 h-[300px] flex flex-col">
                        <Typography.H2 className="text-lg mb-6 flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-pink-400" />
                          Skill Distribution
                        </Typography.H2>
                        <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.distributionData} layout="vertical">
                              <XAxis type="number" hide domain={[0, 100]} />
                              <YAxis dataKey="name" type="category" stroke="#ffffff60" fontSize={10} width={70} tickLine={false} axisLine={false} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {analyticsData.distributionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 space-y-4">
                        <Typography.H2 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Top Strengths
                        </Typography.H2>
                        <div className="space-y-2">
                          {analyticsData.topStrengths.map(([title, count]: any) => (
                            <div key={title} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-sm text-white/80">{title}</span>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card className="p-6 space-y-4">
                        <Typography.H2 className="text-sm font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Focus Areas
                        </Typography.H2>
                        <div className="space-y-2">
                          {analyticsData.topImprovements.map(([title, count]: any) => (
                            <div key={title} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-sm text-white/80">{title}</span>
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <HistoryView 
                  sessions={sessions} 
                  onBack={() => setActiveTab('insights')}
                  onSelectSession={onSelectSession}
                  onDeleteSession={onDeleteSession}
                />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <Card className="p-8 md:p-10">
                <motion.form
                  key="profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleSave}
                  className="space-y-8"
                >
                <div className="flex items-center gap-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center">
                      {photoURL ? (
                        <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-10 h-10 text-white/20" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Typography.H2 className="text-xl">Public Profile</Typography.H2>
                    <Typography.Body className="text-sm text-white/40">This information will be used for your AI interviews.</Typography.Body>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/30 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">LinkedIn Profile</label>
                    <input
                      type="url"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/5">
                  <AnimatePresence>
                    {showSuccess && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center gap-2 text-emerald-400 text-sm font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Profile updated!
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" disabled={isSaving} className="ml-auto flex items-center gap-2">
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Profile
                  </Button>
                </div>
              </motion.form>
            </Card>
          )}

            {activeTab === 'preferences' && (
              <Card className="p-8 md:p-10">
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                <div className="space-y-1">
                  <Typography.H2 className="text-xl">Interview Preferences</Typography.H2>
                  <Typography.Body className="text-sm text-white/40">Customize your default interview settings for faster setup.</Typography.Body>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Focus Interview Type</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Technical', 'HR / Behavioral', 'Coding', 'Situational'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setPrefType(type)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm text-left border transition-all",
                            prefType === type 
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                              : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Target Difficulty</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['easy', 'medium', 'hard'].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setPrefDifficulty(diff)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm text-left border capitalize transition-all",
                            prefDifficulty === diff 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                              : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                          )}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <Button className="w-full md:w-auto">Save Preferences</Button>
                </div>
              </motion.div>
            </Card>
          )}

            {activeTab === 'account' && (
              <Card className="p-8 md:p-10">
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                <div className="space-y-1">
                  <Typography.H2 className="text-xl">Account Security</Typography.H2>
                  <Typography.Body className="text-sm text-white/40">Manage your password and connected authentication methods.</Typography.Body>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <Typography.H2 className="text-sm font-bold mb-1">Change Password</Typography.H2>
                      <Typography.Body className="text-xs text-white/40">Update your account password to stay secure.</Typography.Body>
                    </div>
                    <Button variant="secondary" className="text-xs">Update</Button>
                  </div>

                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <Typography.H2 className="text-sm font-bold mb-1">Linked Accounts</Typography.H2>
                      <Typography.Body className="text-xs text-white/40">Manage Google, GitHub, or LinkedIn connections.</Typography.Body>
                    </div>
                    <Button variant="secondary" className="text-xs">Manage</Button>
                  </div>

                  <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10 flex items-center justify-between">
                    <div>
                      <Typography.H2 className="text-sm font-bold text-red-400 mb-1">Delete Account</Typography.H2>
                      <Typography.Body className="text-xs text-white/40">Permanently remove your account and all session data.</Typography.Body>
                    </div>
                    <Button variant="ghost" className="text-xs text-red-400 hover:bg-red-500/10">Delete</Button>
                  </div>
                </div>
              </motion.div>
            </Card>
          )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
