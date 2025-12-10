import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusLedProps {
  label: string;
  status: ConnectionStatus;
}

export const StatusLed: React.FC<StatusLedProps> = ({ label, status }) => {
  let colorClass = 'bg-gray-500';
  let pulseClass = '';

  switch (status) {
    case ConnectionStatus.CONNECTED:
    case ConnectionStatus.STANDBY:
      colorClass = 'bg-green-500';
      pulseClass = 'led-pulse-green';
      break;
    case ConnectionStatus.PROCESSING:
      colorClass = 'bg-yellow-400';
      pulseClass = 'led-pulse-yellow';
      break;
    case ConnectionStatus.ERROR:
    case ConnectionStatus.DISCONNECTED:
      colorClass = 'bg-red-500';
      pulseClass = 'led-pulse-red';
      break;
  }

  return (
    <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
      <div className={`w-3 h-3 rounded-full ${colorClass} ${pulseClass}`} />
      <span className="text-xs font-bold tracking-wider text-gray-300 uppercase">{label}</span>
    </div>
  );
};
