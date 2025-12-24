import React from 'react';
import { ScanSearch } from 'lucide-react';
import { LiveOpp } from '../types';

interface LiveScannerProps {
    data: LiveOpp[];
}

const getOddsColor = (hkOdds: number): string => {
    return hkOdds < 1.0 ? 'text-red-400' : 'text-blue-400';
};

export const LiveScanner: React.FC<LiveScannerProps> = ({ data }) => {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col h-full">
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
                            <th className="p-3 bg-gray-950">Match</th>
                            <th className="p-3 bg-gray-950">Market</th>
                            <th className="p-3 bg-gray-950">Account A</th>
                            <th className="p-3 bg-gray-950">Account B</th>
                            <th className="p-3 text-center bg-gray-950">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-600 italic">No arbitrage opportunities detected...</td>
                            </tr>
                        ) : (
                            data.map((opp) => (
                                <tr key={opp.match_id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-gray-200">{opp.home_team} vs {opp.away_team}</div>
                                        <div className="text-[10px] text-gray-500">{opp.league} • {opp.match_time}</div>
                                    </td>
                                    <td className="p-3 text-indigo-300">{opp.market}</td>
                                    <td className="p-3">
                                        <div className="space-y-1">
                                            <div className="font-bold text-gray-300">{opp.account_a.provider}</div>
                                            <div className="text-gray-400">{opp.account_a.selection}</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono ${getOddsColor(opp.account_a.hk_odds)}`}>
                                                    {opp.account_a.hk_odds.toFixed(2)}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="font-mono text-gray-400">${opp.account_a.stake}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="space-y-1">
                                            <div className="font-bold text-gray-300">{opp.account_b.provider}</div>
                                            <div className="text-gray-400">{opp.account_b.selection}</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono ${getOddsColor(opp.account_b.hk_odds)}`}>
                                                    {opp.account_b.hk_odds.toFixed(2)}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="font-mono text-gray-400">${opp.account_b.stake}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="bg-emerald-500/10 py-2 px-3 rounded border border-emerald-500/20">
                                            <div className="font-mono font-bold text-emerald-400">{opp.profit.toFixed(2)}%</div>
                                            <div className="text-[10px] text-emerald-500/70">ROI: {opp.roi.toFixed(2)}%</div>
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
