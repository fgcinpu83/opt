import React, { useState } from 'react';
import { Power, User, Lock, Globe, Activity, Link } from 'lucide-react';

interface AccountPanelProps {
  label: string;
  initialSportsbook: string;
  isConnected: boolean;
  isRunning: boolean;
  ping: number;
  balance: number;
  onToggleBot: () => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({
  label,
  initialSportsbook,
  isConnected,
  isRunning,
  ping,
  balance,
  onToggleBot
}) => {
  const [sportsbook, setSportsbook] = useState(initialSportsbook);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl mb-4">
      <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
          <User className="w-4 h-4 mr-2 text-indigo-400" /> {label}
        </h2>

        {/* Right Side Status Indicators */}
        <div className="flex items-center space-x-3">
          {/* Ping Indicator */}
          <div className="flex items-center space-x-1" title="Network Latency">
            <Activity className="w-3 h-3 text-gray-600" />
            <span className={`text-xs font-mono font-bold ${ping < 100 ? 'text-green-500' : ping < 300 ? 'text-yellow-500' : 'text-red-500'}`}>
              {ping}ms
            </span>
          </div>

          {/* LED Status */}
          <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-full border border-gray-700">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
            <span className={`text-[10px] font-bold ${isRunning ? 'text-green-500' : 'text-red-500'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Display */}
        <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-center">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Balance</span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            $ {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sportsbook</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <select
                value={sportsbook}
                onChange={(e) => setSportsbook(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5"
              >
                <option value="BET365">Bet365</option>
                <option value="PINNACLE">Pinnacle</option>
                <option value="SBOBET">SBOBET</option>
                <option value="1XBET">1xBet</option>
                <option value="NOVA">Nova</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">URL</label>
            <div className="relative">
              <Link className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input type="text" className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5" placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input type="text" className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5" placeholder="User" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
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
          className={`w-full flex items-center justify-center p-3 rounded-lg font-bold transition-all duration-300 mt-2 ${isRunning
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