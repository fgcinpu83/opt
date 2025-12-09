import React, { useState } from 'react';
import { Power, User, Lock, Globe, Activity, Wallet, Link as LinkIcon } from 'lucide-react';

interface AccountPanelProps {
  label: string;
  initialSportsbook: string;
  balance: number;
  isConnected: boolean;
  isRunning: boolean;
  ping: number;
  onToggleBot: () => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({ 
  label,
  initialSportsbook,
  balance,
  isConnected, 
  isRunning,
  ping,
  onToggleBot 
}) => {
  const [sportsbook, setSportsbook] = useState(initialSportsbook);
  const [url, setUrl] = useState('https://www.sportsbook.com');

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl mb-4">
      {/* Header Panel */}
      <div className="bg-gray-800/50 p-3 border-b border-gray-700">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
            <User className="w-4 h-4 mr-2 text-indigo-400" /> {label}
            </h2>
            
            <div className="flex items-center space-x-2">
                {/* Ping */}
                <div className="flex items-center space-x-1" title="Network Latency">
                    <Activity className="w-3 h-3 text-gray-600" />
                    <span className={`text-xs font-mono font-bold ${(ping || 0) < 100 ? 'text-green-500' : (ping || 0) < 300 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {ping || 0}ms
                    </span>
                </div>
                {/* Status LED */}
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
            </div>
        </div>

        {/* Balance Display inside Panel */}
        <div className="bg-gray-950/80 rounded-lg p-2 flex items-center justify-between border border-gray-800">
            <div className="flex items-center text-gray-500 text-xs">
                <Wallet className="w-3 h-3 mr-1.5" /> Balance
            </div>
            <div className="text-emerald-400 font-mono font-bold text-sm tracking-wide">
                $ {(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Inputs */}
        <div className="space-y-3">
          
          {/* Sportsbook Manual Input */}
          <div>
            <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Sportsbook Name</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={sportsbook}
                onChange={(e) => setSportsbook(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5"
                placeholder="Enter Site Name"
              />
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Site URL</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input type="text" className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5" placeholder="User" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input type="password" className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5" placeholder="••••" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onToggleBot}
          className={`w-full flex items-center justify-center p-3 rounded-lg font-bold transition-all duration-300 mt-2 ${
            isRunning 
            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
            : 'bg-green-500/10 text-green-500 border border-green-500/50 hover:bg-green-500 hover:text-white'
          }`}
        >
          <Power className="w-4 h-4 mr-2" />
          {isRunning ? 'STOP TRADING' : 'START TRADING'}
        </button>

      </div>
    </div>
  );
};