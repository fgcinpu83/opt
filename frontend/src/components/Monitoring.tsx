import React from 'react';
import { ScanSearch, History, TrendingUp, AlertTriangle } from 'lucide-react';
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
  const profit = currentBalance - initialBalance;
  const isProfitPositive = profit >= 0;

  // Chart data preparation
  const chartData = [
    { name: 'Start', amount: initialBalance },
    { name: 'Current', amount: currentBalance },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      
      {/* Top Section: Profit Widget & Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[320px]">
        
        {/* Profit Widget */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-xl flex flex-col justify-between h-full">
           <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Daily P&L</h3>
             <div className={`text-2xl font-mono font-bold mt-2 ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
               {isProfitPositive ? '+' : ''}{profit.toFixed(2)} USD
             </div>
             <p className="text-xs text-gray-500 mt-1">From initial {initialBalance}</p>
           </div>
           
           <div className="h-32 w-full mt-4">
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
        <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col h-full">
          <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
              <ScanSearch className="w-4 h-4 mr-2 text-indigo-400" /> Live Scanner
            </h2>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse">Scanning...</span>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-gray-400">
              <thead className="bg-gray-950 text-gray-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 bg-gray-950">Time</th>
                  <th className="p-3 bg-gray-950">Match / League</th>
                  <th className="p-3 text-right bg-gray-950">Odds A</th>
                  <th className="p-3 text-right bg-gray-950">Odds B</th>
                  <th className="p-3 text-right bg-gray-950">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {scannerData.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-gray-600 italic">No arbitrage opportunities detected...</td>
                   </tr>
                ) : (
                  scannerData.map((opp) => (
                    <tr key={opp.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-3 font-mono text-gray-500">{opp.time}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-200">{opp.match}</div>
                        <div className="text-[10px] text-gray-600">{opp.league}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-blue-400">{opp.oddsA.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-orange-400">{opp.oddsB.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">{opp.profit.toFixed(2)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col min-h-[300px]">
        <div className="bg-gray-800/50 p-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
            <History className="w-4 h-4 mr-2 text-indigo-400" /> Execution History
          </h2>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-gray-950 text-gray-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 bg-gray-950">Status</th>
                <th className="p-3 bg-gray-950">Time</th>
                <th className="p-3 bg-gray-950">Site</th>
                <th className="p-3 bg-gray-950">Match</th>
                <th className="p-3 bg-gray-950">Pick</th>
                <th className="p-3 text-right bg-gray-950">Odds</th>
                <th className="p-3 text-right bg-gray-950">Stake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-600 italic">No execution history available.</td>
                </tr>
              ) : (
                historyData.map((bet) => {
                  let statusColor = 'bg-gray-600';
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

                  return (
                    <tr key={bet.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-500">{bet.time}</td>
                      <td className="p-3 font-bold text-gray-400">{bet.site}</td>
                      <td className="p-3 text-gray-300">{bet.match}</td>
                      <td className="p-3 text-indigo-300">{bet.pick}</td>
                      <td className="p-3 text-right font-mono text-gray-300">{bet.odds.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-gray-300">${bet.stake}</td>
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