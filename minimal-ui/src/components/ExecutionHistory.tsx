import React from 'react';
import { RotateCcw } from 'lucide-react';
import { BetHistory } from '../types';

interface ExecutionHistoryProps {
    history: BetHistory[];
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ history }) => {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col h-full">
            <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
                    <RotateCcw className="w-4 h-4 mr-2 text-indigo-400" /> Execution History
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
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-600 italic">No execution history available.</td>
                            </tr>
                        ) : (
                            history.map((bet) => {
                                const statusColor = bet.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                   bet.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                                   'bg-yellow-500/20 text-yellow-400';
                                const statusText = bet.status;

                                return (
                                    <React.Fragment key={bet.id}>
                                        {/* Home Team Row */}
                                        <tr className="hover:bg-gray-800/30 transition-colors border-b-0">
                                            <td className="p-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-gray-500">{bet.time}</td>
                                            <td className="p-3 font-bold text-gray-400">{bet.provider}</td>
                                            <td className="p-3 text-gray-300">{bet.match.home}</td>
                                            <td className="p-3 text-indigo-300">
                                                {bet.type} {bet.pick.includes('-') ? bet.pick : bet.pick.replace(/([\d.]+)/, '-$1')}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-300">{bet.odds.toFixed(2)}</td>
                                            <td className="p-3 text-right font-mono text-gray-300">{bet.stake}</td>
                                        </tr>
                                        {/* Away Team Row */}
                                        <tr className="hover:bg-gray-800/30 transition-colors border-b border-gray-800">
                                            <td className="p-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-gray-500">{bet.time}</td>
                                            <td className="p-3 font-bold text-gray-400">{bet.pairSite}</td>
                                            <td className="p-3 text-gray-300">{bet.match.away}</td>
                                            <td className="p-3 text-indigo-300">
                                                {bet.type} {bet.pick.replace('-', '+')}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-300">{bet.pairOdds.toFixed(2)}</td>
                                            <td className="p-3 text-right font-mono text-gray-300">{bet.stake}</td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
