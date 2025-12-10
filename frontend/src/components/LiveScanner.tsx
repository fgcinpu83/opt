import React from 'react';
import { ScanSearch } from 'lucide-react';
import { LiveOpp } from '../types';

interface LiveScannerProps {
    data: LiveOpp[];
}

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
                            <th className="p-3 bg-gray-950">Time</th>
                            <th className="p-3 bg-gray-950">Site</th>
                            <th className="p-3 bg-gray-950">Match</th>
                            <th className="p-3 bg-gray-950">Pick</th>
                            <th className="p-3 text-right bg-gray-950">Odds</th>
                            <th className="p-3 text-center bg-gray-950">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-600 italic">No arbitrage opportunities detected...</td>
                            </tr>
                        ) : (
                            data.map((opp) => (
                                <React.Fragment key={opp.id}>
                                    {/* First Leg */}
                                    <tr className="bg-gray-900/50 hover:bg-gray-800/30 transition-colors border-b-0">
                                        <td className="p-2 pl-3 font-mono text-gray-500 border-b border-gray-800" rowSpan={2}>{opp.time}</td>
                                        <td className="p-2 font-bold text-gray-300">{opp.legs[0].site}</td>
                                        <td className="p-2 text-gray-300">{opp.legs[0].match}</td>
                                        <td className="p-2 text-indigo-300">{opp.legs[0].market} {opp.legs[0].pick}</td>
                                        <td className="p-2 text-right font-mono text-blue-400">{opp.legs[0].odds.toFixed(2)}</td>
                                        <td className="p-2 text-center font-mono font-bold text-emerald-400 border-b border-gray-800 align-middle" rowSpan={2}>
                                            <div className="bg-emerald-500/10 py-2 rounded border border-emerald-500/20">
                                                {opp.profit.toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Second Leg */}
                                    <tr className="bg-gray-900/50 hover:bg-gray-800/30 transition-colors">
                                        <td className="p-2 font-bold text-gray-300 border-b border-gray-800">{opp.legs[1].site}</td>
                                        <td className="p-2 text-gray-300 border-b border-gray-800">{opp.legs[1].match}</td>
                                        <td className="p-2 text-indigo-300 border-b border-gray-800">{opp.legs[1].market} {opp.legs[1].pick}</td>
                                        <td className="p-2 text-right font-mono text-orange-400 border-b border-gray-800">{opp.legs[1].odds.toFixed(2)}</td>
                                    </tr>
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
