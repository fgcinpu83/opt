
import React from 'react';
import { ScanSearch, History, TrendingUp, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { LiveOpp, BetHistory } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MonitoringProps {
  scannerData: LiveOpp[];
  historyData: BetHistory[];
  initialBalance: number;
  currentBalance: number;
}

export const Monitoring: React.FC<MonitoringProps> = ({ 
  scannerData, 
  historyData, 
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
    <div className="space-y-4 h-full flex flex-col">
      
      {/* Top Section: Profit Widget & Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Profit Widget */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col justify-between">
           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Daily P&L</h3>
             <div className={`text-2xl font-mono font-bold mt-3 ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
               {isProfitPositive ? '+' : ''}{(profit || 0).toFixed(2)} USD
             </div>
             <p className="text-xs text-slate-500 mt-1">From initial {initialBalance || 0}</p>
           </div>
           
           <div className="w-full h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 10}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px' }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Live Scanner Table */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
              <ScanSearch className="w-4 h-4 mr-2 text-indigo-400" /> Live Scanner
            </h2>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse">Scanning...</span>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar max-h-80">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-950 text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2 px-3 bg-slate-950">Time</th>
                  <th className="py-2 px-3 bg-slate-950">Match</th>
                  <th className="py-2 px-3 bg-slate-950">Type / Market</th>
                  <th className="py-2 px-3 bg-slate-950 text-right">Odds A/B</th>
                  <th className="py-2 px-3 bg-slate-950 text-right">Profit</th>
                  <th className="py-2 px-3 bg-slate-950 text-right">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {scannerData.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-slate-600 italic">No arbitrage opportunities detected...</td>
                   </tr>
                ) : (
                  scannerData.map((opp) => {
                    const home = opp.legs[0]?.match?.home || 'Home Team';
                    const away = opp.legs[0]?.match?.away || 'Away Team';
                    const league = opp.legs[0]?.league || 'League';
                    return (
                    <tr key={opp.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Time */}
                      <td className="py-2 px-3 align-middle">
                         <div className="flex items-center text-slate-500 font-mono text-[10px]">
                           <Clock className="w-3 h-3 mr-1.5" />
                           {opp.time}
                         </div>
                      </td>
                      
                      {/* Match (2 Lines) */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-bold text-slate-200 text-xs">{home}</span>
                          <span className="font-bold text-slate-400 text-xs">{away}</span>
                          <span className="text-[9px] text-slate-500 uppercase mt-0.5">{league}</span>
                        </div>
                      </td>

                      {/* Type / Market (2 Lines) */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex flex-col">
                           <span className="text-indigo-400 font-bold">{opp.legs[0]?.market || ''}</span>
                           <span className="text-slate-500 font-mono">{opp.legs[0]?.pick || ''}</span>
                        </div>
                      </td>

                      {/* Odds (2 Lines) */}
                      <td className="py-2 px-3 text-right align-middle">
                        <div className="flex flex-col font-mono text-xs">
                           <span className="text-blue-400">{(opp.legs[0]?.odds || 0).toFixed(2)}</span>
                           <span className="text-orange-400">{(opp.legs[1]?.odds || 0).toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Profit */}
                      <td className="py-2 px-3 text-right align-middle">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {(opp?.profit || 0).toFixed(2)}%
                        </span>
                      </td>
                      
                      {/* Info (Fake Provider/League) */}
                      <td className="py-2 px-3 text-right align-middle">
                         <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-700">
                           SCAN
                         </span>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="bg-slate-800/50 p-3 border-b border-slate-700 shrink-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
            <History className="w-4 h-4 mr-2 text-indigo-400" /> Execution History
          </h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-80">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-950 text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2 px-3 bg-slate-950 w-24">Status</th>
                <th className="py-2 px-3 bg-slate-950 w-24">Time</th>
                <th className="py-2 px-3 bg-slate-950">Match</th>
                <th className="py-2 px-3 bg-slate-950">Type / Pick</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Odds / Line</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Stake</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-600 italic">No execution history available.</td>
                </tr>
              ) : (
                historyData.map((bet) => {
                  let statusColor = 'bg-slate-600';
                  let statusText = 'UNKNOWN';
                  
                  if (bet.status === 'ACCEPTED') {
                    statusColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                    statusText = 'ACCEPTED';
                  } else if (bet.status === 'RUNNING') {
                    statusColor = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
                    statusText = 'RUNNING';
                  } else if (bet.status === 'REJECTED') {
                    statusColor = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                    statusText = 'REJECTED';
                  }
                  
                  const { home, away } = bet.match ? { home: bet.match.home, away: bet.match.away } : { home: '', away: '' };
                  const isHomeOrOver = bet.pick.includes('Home') || bet.pick.includes('Over');
                  const oddsColor = isHomeOrOver ? 'text-blue-400' : 'text-orange-400';

                  return (
                    <tr key={bet.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Status Column */}
                      <td className="py-2 px-3 align-middle">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded block text-center w-full ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>

                      {/* Time Column */}
                      <td className="py-2 px-3 align-middle">
                        <span className="text-[10px] text-slate-500 font-mono">{bet.time}</span>
                      </td>

                      {/* Match Column (2 Lines) */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-slate-200 font-bold text-xs">{home}</span>
                          <span className="text-slate-400 font-bold text-xs">{away}</span>
                        </div>
                      </td>

                      {/* Type Column (Market + Pick) */}
                      <td className="py-2 px-3 align-middle">
                         <div className="flex flex-col">
                            <span className="text-indigo-400 font-bold">{bet.type}</span>
                            <span className="text-xs text-slate-400 font-medium">
                               {bet.pick}
                            </span>
                         </div>
                      </td>

                      {/* Odds Column (Price + Line) */}
                      <td className="py-2 px-3 text-right align-middle">
                        <div className="flex flex-col">
                           <span className={`font-mono font-bold text-sm ${oddsColor}`}>
                              {(bet?.odds || 0).toFixed(2)}
                           </span>
                           <span className="text-xs text-slate-500 font-mono">
                              {bet?.line || ''}
                           </span>
                        </div>
                      </td>

                      {/* Stake Column (Amount + Est Profit) */}
                      <td className="py-2 px-3 text-right align-middle">
                        <div className="flex flex-col">
                           <span className="font-mono text-emerald-400 font-bold">
                              $ {(bet?.stake || 0).toLocaleString()}
                           </span>
                           {bet?.profit ? (
                             <span className="text-[9px] text-green-500 font-mono">+{(bet.profit || 0).toFixed(1)}</span>
                           ) : (
                             <span className="text-[9px] text-slate-600 font-mono">Stake</span>
                           )}
                        </div>
                      </td>

                       {/* Provider Column (Site/Account) */}
                       <td className="py-2 px-3 text-right align-middle">
                         <div className="flex flex-col">
                           <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wide">
                              {bet.site.split('/')[0]}
                           </span>
                           <span className="text-[9px] text-slate-600 uppercase">
                              {bet.site.split('/')[1] || 'Direct'}
                           </span>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
