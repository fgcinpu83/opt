import React from 'react';
import { ScanSearch, History, Clock } from 'lucide-react';
import { LiveOpp, BetHistory } from '../types';

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

  return (
    <div className="space-y-3 lg:space-y-4">
      
      {/* Execution History Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="bg-slate-800/50 p-3 border-b border-slate-700 shrink-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
            <History className="w-4 h-4 mr-2 text-indigo-400" /> Execution History
          </h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[350px]">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-950 text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2 px-3 bg-slate-950 w-20">Status</th>
                <th className="py-2 px-3 bg-slate-950 w-20">Time</th>
                <th className="py-2 px-3 bg-slate-950 w-16">Site</th>
                <th className="py-2 px-3 bg-slate-950">Match</th>
                <th className="py-2 px-3 bg-slate-950">Pick</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Odds</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Stake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-600 italic">No execution history available.</td>
                </tr>
              ) : (
                historyData.flatMap((bet, idx) => {
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
                  
                  // Return two rows: home and away
                  return [
                    // Home row
                    <tr key={`${bet.id}-home`} className="hover:bg-slate-800/30 transition-colors border-b-0">
                      <td className="py-1.5 px-3 align-middle" rowSpan={2}>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded block text-center w-full ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle" rowSpan={2}>
                        <span className="text-[10px] text-slate-500 font-mono">{bet.time}</span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {bet.site.split('/')[0]}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-slate-200 font-bold text-xs">{home}</span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-xs text-slate-300 font-medium">{bet.pick}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle">
                        <span className="font-mono font-bold text-sm text-blue-400">
                          {(bet?.odds || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle" rowSpan={2}>
                        <span className="font-mono text-emerald-400 font-bold">
                          $ {(bet?.stake || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>,
                    // Away row (pair site)
                    <tr key={`${bet.id}-away`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {bet.site.split('/')[1] || 'PAIR'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-slate-400 font-bold text-xs">{away}</span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-xs text-slate-400 font-medium">{bet.pick}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle">
                        <span className="font-mono font-bold text-sm text-orange-400">
                          {(bet?.odds || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Scanner Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
            <ScanSearch className="w-4 h-4 mr-2 text-indigo-400" /> Live Scanner
          </h2>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse">Scanning...</span>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[350px]">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-950 text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2 px-3 bg-slate-950 w-20">Time</th>
                <th className="py-2 px-3 bg-slate-950 w-16">Site</th>
                <th className="py-2 px-3 bg-slate-950">Match</th>
                <th className="py-2 px-3 bg-slate-950">Pick</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Odds</th>
                <th className="py-2 px-3 bg-slate-950 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scannerData.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="p-8 text-center text-slate-600 italic">No arbitrage opportunities detected...</td>
                 </tr>
              ) : (
                scannerData.flatMap((opp) => {
                  const home = opp.legs[0]?.match?.home || 'Home Team';
                  const away = opp.legs[0]?.match?.away || 'Away Team';
                  
                  // Return two rows: Leg 1 and Leg 2
                  return [
                    // Leg 1
                    <tr key={`${opp.id}-leg1`} className="hover:bg-slate-800/30 transition-colors border-b-0">
                      <td className="py-1.5 px-3 align-middle" rowSpan={2}>
                        <div className="flex items-center text-slate-500 font-mono text-[10px]">
                          <Clock className="w-3 h-3 mr-1.5" />
                          {opp.time}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {opp.legs[0]?.site || 'SITE 1'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-bold text-slate-200 text-xs">{home}</span>
                          <span className="font-bold text-slate-400 text-xs">{away}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-xs text-slate-300 font-medium">{opp.legs[0]?.pick || ''}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle">
                        <span className="font-mono font-bold text-sm text-blue-400">
                          {(opp.legs[0]?.odds || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle" rowSpan={2}>
                        <span className="inline-block bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs px-2 py-1 rounded">
                          {(opp?.profit || 0).toFixed(2)}%
                        </span>
                      </td>
                    </tr>,
                    // Leg 2
                    <tr key={`${opp.id}-leg2`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {opp.legs[1]?.site || 'SITE 2'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-bold text-slate-200 text-xs">{home}</span>
                          <span className="font-bold text-slate-400 text-xs">{away}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 align-middle">
                        <span className="text-xs text-slate-400 font-medium">{opp.legs[1]?.pick || ''}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right align-middle">
                        <span className="font-mono font-bold text-sm text-orange-400">
                          {(opp.legs[1]?.odds || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
