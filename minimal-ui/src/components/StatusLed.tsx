import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusLedProps {
  status?: ConnectionStatus;
  label?: string;
}

export const StatusLed: React.FC<StatusLedProps> = ({ status, label = 'Status' }) => {
  let colorClass = 'bg-gray-500';
  let pulseClass = '';
  
  if (status === ConnectionStatus.CONNECTED) {
    colorClass = 'bg-green-500';
    pulseClass = 'animate-pulse';
  } else if (status === ConnectionStatus.PROCESSING || status === ConnectionStatus.STANDBY) {
    colorClass = 'bg-yellow-500';
    pulseClass = 'animate-pulse';
  } else if (status === ConnectionStatus.ERROR) {
    colorClass = 'bg-red-500';
  } else if (status === ConnectionStatus.DISCONNECTED) {
    colorClass = 'bg-gray-600';
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${colorClass} ${pulseClass}`} />
      <span className="text-xs font-bold text-gray-300">{label}</span>
    </div>
  );
};

export default StatusLed;
