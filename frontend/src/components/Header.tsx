import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { StatusLed } from './StatusLed';
import { SystemHealth } from '../types';

interface HeaderProps {
  health: SystemHealth;
  totalBalance: number;
}

export const Header: React.FC<HeaderProps> = ({ health, totalBalance }) => {
  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo Area */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-500/20 shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ARBBOT<span className="text-indigo-400">PRO</span></h1>
            <p className="text-xs text-gray-500 font-mono">V2.5.1-DUAL</p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap justify-center gap-3">
          <StatusLed label="ENGINE API" status={health.engineApi} />
          <StatusLed label="DATABASE" status={health.database} />
          <StatusLed label="REDIS" status={health.redis} />
          <StatusLed label="WORKER" status={health.worker} />
        </div>
        
        {/* Secure Mode & Balance */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center space-x-3 bg-gray-950 px-4 py-2 rounded-lg border border-gray-800 shadow-inner">
             <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Secure Mode</span>
             </div>
             <div className="w-px h-4 bg-gray-800"></div>
             <div className="text-right">
                <span className="block text-[10px] text-gray-500 leading-none">Total Balance</span>
                <span className="block text-sm font-mono font-bold text-white leading-none mt-1">
                  $ {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};