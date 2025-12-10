export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  PROCESSING = 'PROCESSING', // For worker
  STANDBY = 'STANDBY'        // For worker
}

export interface SystemHealth {
  engineApi: ConnectionStatus;
  database: ConnectionStatus;
  redis: ConnectionStatus;
  worker: ConnectionStatus;
}

export interface BetConfig {
  tier1: number;
  tier2: number;
  tier3: number;
  minProfit: number;
  maxProfit: number;
  maxMinuteHT: number;
  maxMinuteFT: number;
  matchFilter: 'PREMATCH' | 'LIVE' | 'MIXED';
  markets: {
    ftHdp: boolean;
    ftOu: boolean;
    ft1x2: boolean;
    htHdp: boolean;
    htOu: boolean;
    ht1x2: boolean;
  };
}

export interface LiveOpp {
  id: string;
  time: string;
  profit: number;
  legs: [
    {
      site: string;
      match: string;
      league: string;
      market: string; // e.g., HT/HDP
      pick: string;   // e.g., 0.25 or -0.25
      odds: number;
    },
    {
      site: string;
      match: string;
      league: string;
      market: string;
      pick: string;
      odds: number;
    }
  ];
}

export interface BetHistory {
  id: string;
  time: string;
  match: string;
  pick: string;
  odds: number;
  stake: number;
  status: 'ACCEPTED' | 'RUNNING' | 'REJECTED';
  site: string;
  profit?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}
