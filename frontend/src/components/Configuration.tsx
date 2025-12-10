import React from 'react';
import { Settings, Sliders, Clock, Filter, ShoppingBag } from 'lucide-react';
import { BetConfig } from '../types';

interface ConfigurationProps {
  config: BetConfig;
  onChange: (newConfig: BetConfig) => void;
}

export const Configuration: React.FC<ConfigurationProps> = ({ config, onChange }) => {

  const updateConfig = (key: keyof BetConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const updateMarket = (key: keyof BetConfig['markets']) => {
    onChange({
      ...config,
      markets: {
        ...config.markets,
        [key]: !config.markets[key]
      }
    });
  };

  const marketOptions: { id: keyof BetConfig['markets']; label: string }[] = [
    { id: 'ftHdp', label: 'FT HDP' },
    { id: 'ftOu', label: 'FT O/U' },
    { id: 'ft1x2', label: 'FT 1X2' },
    { id: 'htHdp', label: 'HT HDP' },
    { id: 'htOu', label: 'HT O/U' },
    { id: 'ht1x2', label: 'HT 1X2' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col h-full">
      <div className="bg-gray-800/50 p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center">
          <Settings className="w-4 h-4 mr-2 text-indigo-400" /> Configuration
        </h2>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar">
        
        {/* Tier Management */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center uppercase"><Sliders className="w-3 h-3 mr-1" /> Tier Stake ($)</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <span className="absolute text-[10px] top-1 left-2 text-gray-500">Tier 1 (Big)</span>
              <input 
                type="number" 
                value={config.tier1}
                onChange={(e) => updateConfig('tier1', parseFloat(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 text-right text-gray-200 text-sm rounded px-2 pt-5 pb-1 focus:border-indigo-500 focus:outline-none" 
              />
            </div>
            <div className="relative">
              <span className="absolute text-[10px] top-1 left-2 text-gray-500">Tier 2 (Mid)</span>
              <input 
                type="number" 
                value={config.tier2}
                onChange={(e) => updateConfig('tier2', parseFloat(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 text-right text-gray-200 text-sm rounded px-2 pt-5 pb-1 focus:border-indigo-500 focus:outline-none" 
              />
            </div>
            <div className="relative">
              <span className="absolute text-[10px] top-1 left-2 text-gray-500">Tier 3 (Small)</span>
              <input 
                type="number" 
                value={config.tier3}
                onChange={(e) => updateConfig('tier3', parseFloat(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 text-right text-gray-200 text-sm rounded px-2 pt-5 pb-1 focus:border-indigo-500 focus:outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Profit Settings */}
        <div>
           <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center uppercase"><TrendingUpIcon className="w-3 h-3 mr-1" /> Profit Range (%)</h3>
           <div className="flex items-center space-x-2">
            <input 
              type="number" 
              value={config.minProfit}
              onChange={(e) => updateConfig('minProfit', parseFloat(e.target.value))}
              className="w-1/2 bg-gray-950 border border-gray-700 text-center text-gray-200 text-sm rounded p-2 focus:border-green-500 focus:outline-none" 
            />
            <span className="text-gray-600">-</span>
            <input 
              type="number" 
              value={config.maxProfit}
              onChange={(e) => updateConfig('maxProfit', parseFloat(e.target.value))}
              className="w-1/2 bg-gray-950 border border-gray-700 text-center text-gray-200 text-sm rounded p-2 focus:border-green-500 focus:outline-none" 
            />
           </div>
        </div>

        {/* Time Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center uppercase"><Clock className="w-3 h-3 mr-1" /> Max Minute</h3>
          <div className="grid grid-cols-2 gap-3">
             <div className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-700">
                <span className="text-xs text-gray-500">HT</span>
                <input 
                  type="number" 
                  value={config.maxMinuteHT} 
                  onChange={(e) => updateConfig('maxMinuteHT', parseInt(e.target.value))}
                  className="w-12 bg-transparent text-right text-sm outline-none" 
                />
             </div>
             <div className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-700">
                <span className="text-xs text-gray-500">FT</span>
                <input 
                  type="number" 
                  value={config.maxMinuteFT} 
                  onChange={(e) => updateConfig('maxMinuteFT', parseInt(e.target.value))}
                  className="w-12 bg-transparent text-right text-sm outline-none" 
                />
             </div>
          </div>
        </div>

        {/* Match Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center uppercase"><Filter className="w-3 h-3 mr-1" /> Match Filter</h3>
          <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-700">
            {(['PREMATCH', 'LIVE', 'MIXED'] as const).map((type) => (
              <button
                key={type}
                onClick={() => updateConfig('matchFilter', type)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded ${config.matchFilter === type ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Market Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center uppercase"><ShoppingBag className="w-3 h-3 mr-1" /> Market Filter</h3>
          <div className="grid grid-cols-2 gap-2">
            {marketOptions.map((market) => (
               <label key={market.id} className="flex items-center space-x-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${config.markets[market.id] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 bg-gray-950'}`}>
                    {config.markets[market.id] && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={config.markets[market.id]}
                    onChange={() => updateMarket(market.id)}
                  />
                  <span className="text-xs text-gray-300 group-hover:text-white">{market.label}</span>
               </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper component for icon
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);