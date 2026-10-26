import React from 'react';
import { motion } from 'motion/react';
import { Card, Typography } from './ui/Base';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Award, Target, CheckCircle2, AlertCircle, Zap, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Base';

interface AnalyticsViewProps {
  sessions: any[];
  onBack: () => void;
}

export const AnalyticsView = ({ sessions = [], onBack }: AnalyticsViewProps) => {
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  if (safeSessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto pt-20 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
          <TrendingUp className="w-10 h-10 text-white/20" />
        </div>
        <Typography.H1>No Analytics Yet</Typography.H1>
        <Typography.Body className="text-white/40 max-w-md mx-auto">
          Complete your first interview session to unlock detailed performance analytics and trend tracking.
        </Typography.Body>
        <div className="pt-8">
          <Button onClick={onBack} variant="secondary" className="flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    );
  }

  // Prepare data for trend chart
  const trendData = [...safeSessions].reverse().map((s, i) => ({
    name: `S${i + 1}`,
    overall: s.debrief?.scores?.overall || 0,
    communication: s.debrief?.scores?.communication || 0,
    technical: s.debrief?.scores?.technical_depth || 0,
    date: s.createdAt?.toDate ? new Date(s.createdAt.toDate()).toLocaleDateString() : 'N/A'
  }));

  // Prepare data for score distribution
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

  // Extract recurring strengths and improvements
  const allStrengths = safeSessions.flatMap(s => s.debrief?.strengths || []);
  const strengthCounts = allStrengths.reduce((acc: any, s: any) => {
    if (s.title) acc[s.title] = (acc[s.title] || 0) + 1;
    return acc;
  }, {});
  const topStrengths = Object.entries(strengthCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3);

  const allImprovements = safeSessions.flatMap(s => s.debrief?.improvements || []);
  const improvementCounts = allImprovements.reduce((acc: any, s: any) => {
    if (s.title) acc[s.title] = (acc[s.title] || 0) + 1;
    return acc;
  }, {});
  const topImprovements = Object.entries(improvementCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <div>
          <Typography.H1 className="text-3xl">Performance Analytics</Typography.H1>
          <Typography.Body className="text-white/50">Visualize your growth and identify patterns across {sessions.length} sessions.</Typography.Body>
        </div>
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 p-6 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <Typography.H2 className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Score Trends
            </Typography.H2>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="overall" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="communication" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="technical" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Average Distribution */}
        <Card className="p-6 flex flex-col">
          <Typography.H2 className="text-lg mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Skill Distribution
          </Typography.H2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical">
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#ffffff60" 
                  fontSize={12} 
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{d.name}: {d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recurring Strengths */}
        <Card className="p-8 space-y-6">
          <Typography.H2 className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Recurring Strengths
          </Typography.H2>
          <div className="space-y-4">
            {topStrengths.length > 0 ? topStrengths.map(([title, count]: any) => (
              <div key={title} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="font-medium text-white/80">{title}</span>
                </div>
                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                  {count}x Observed
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-white/20 italic">Not enough data yet</div>
            )}
          </div>
        </Card>

        {/* Areas for Improvement */}
        <Card className="p-8 space-y-6">
          <Typography.H2 className="text-xl flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            Focus Areas
          </Typography.H2>
          <div className="space-y-4">
            {topImprovements.length > 0 ? topImprovements.map(([title, count]: any) => (
              <div key={title} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="font-medium text-white/80">{title}</span>
                </div>
                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  {count}x Flagged
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-white/20 italic">Not enough data yet</div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
