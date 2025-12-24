import React from 'react';
import { History } from 'lucide-react';
import { ExecutedBet } from '../types';

interface ExecutionHistoryProps {
    history: ExecutedBet[];
}

const getOddsColor = (hkOdds: number): string => {
    return hkOdds < 1.0 ? 'text-red-400' : 'text-blue-400';
};

const getStatusBadge = (status: 'ACCEPTED' | 'RUNNING' | 'REJECTED') => {
    const styles = {
        ACCEPTED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        RUNNING: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        REJECTED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${styles[status]}`}>
            {status}
        </span>
    );
};

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
                            <th className="p-3 bg-gray-950">Match</th>
                            <th className="p-3 bg-gray-950">Market</th>
                            <th className="p-3 bg-gray-950">Account A</th>
                            <th className="p-3 bg-gray-950">Account B</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-600 italic">No execution history available.</td>
                            </tr>
                        ) : (
                            history.map((bet) => (
                                <tr key={bet.match_id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-gray-200">{bet.home_team} vs {bet.away_team}</div>
                                        <div className="text-[10px] text-gray-500">{bet.league} • {bet.executed_at}</div>
                                    </td>
                                    <td className="p-3 text-indigo-300">{bet.market}</td>
                                    <td className="p-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-300">{bet.account_a.provider}</span>
                                                {getStatusBadge(bet.account_a.status)}
                                            </div>
                                            <div className="text-gray-400">{bet.account_a.selection}</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono ${getOddsColor(bet.account_a.hk_odds)}`}>
                                                    {bet.account_a.hk_odds.toFixed(2)}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="font-mono text-gray-400">${bet.account_a.stake}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-300">{bet.account_b.provider}</span>
                                                {getStatusBadge(bet.account_b.status)}
                                            </div>
                                            <div className="text-gray-400">{bet.account_b.selection}</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono ${getOddsColor(bet.account_b.hk_odds)}`}>
                                                    {bet.account_b.hk_odds.toFixed(2)}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="font-mono text-gray-400">${bet.account_b.stake}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
