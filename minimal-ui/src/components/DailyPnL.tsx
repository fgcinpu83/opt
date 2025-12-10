import React from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyPnLProps {
  initialBalance: number;
  currentBalance: number;
}

export const DailyPnL: React.FC<DailyPnLProps> = ({ 
  initialBalance,
  currentBalance
}) => {
  const profit = (currentBalance || 0) - (initialBalance || 0);
  const isProfitPositive = profit >= 0;

  // Chart data preparation
  const chartData = [
    { name: 'Start', amount: initialBalance || 0 },
    { name: 'Current', amount: currentBalance || 0 },
  ];

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
      <div className="bg-slate-800/50 p-3 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" /> Daily P&L
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Profit Display */}
        <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Today's P&L</span>
            <DollarSign className={`w-4 h-4 ${isProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <div className={`text-3xl font-mono font-bold ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitPositive ? '+' : ''}{(profit || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            From initial <span className="font-mono text-slate-400">${(initialBalance || 0).toFixed(2)}</span>
          </p>
        </div>

        {/* Balance Comparison Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase mb-1">Start</div>
            <div className="text-lg font-mono font-bold text-blue-400">
              ${(initialBalance || 0).toFixed(0)}
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase mb-1">Current</div>
            <div className="text-lg font-mono font-bold text-emerald-400">
              ${(currentBalance || 0).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{fill: '#64748b', fontSize: 10}} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                tick={{fill: '#64748b', fontSize: 10}} 
                tickLine={false} 
                axisLine={false}
                width={40}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  fontSize: '11px',
                  borderRadius: '8px',
                  padding: '8px'
                }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar 
                dataKey="amount" 
                fill="#6366f1" 
                radius={[6, 6, 0, 0]} 
                barSize={40} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
