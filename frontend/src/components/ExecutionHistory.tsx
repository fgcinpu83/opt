import React from 'react';
import { History } from 'lucide-react';
import { BetHistory } from '../types';

interface ExecutionHistoryProps {
    history: BetHistory[];
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ history }) => {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col h-full">
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
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-600 italic">No execution history available.</td>
                            </tr>
                        ) : (
                            history.map((bet) => {
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
    );
};
