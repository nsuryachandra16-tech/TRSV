import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// Global Custom Tooltip to match Apple-inspired glassmorphism
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-xl shadow-premium-dark">
        <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-black flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const TrendChart = ({ data, color = '#06b6d4', dataKey = 'count', name = 'Tickets' }) => {
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">No Trend Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`color${name}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/50 dark:text-slate-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-400" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-400" />
        <RechartsTooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#color${name})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PIE_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const CategoryPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">No Category Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <RechartsTooltip content={<CustomTooltip />} />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export const CategoryRadar = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">No Radar Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="currentColor" className="text-slate-200/50 dark:text-slate-800" />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
        <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Radar name="Categories" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export const ActivityBarChart = ({ data, dataKey = 'emergencies', color = '#f43f5e', name = 'Events' }) => {
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">No Activity Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/50 dark:text-slate-800" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-400" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-400" />
        <RechartsTooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
