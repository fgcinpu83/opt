export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  PROCESSING = 'PROCESSING',
  STANDBY = 'STANDBY'
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
  match: string;
  league: string;
  market: string;
  line: string;
  oddsA: number;
  oddsB: number;
  profit: number;
  time: string;
}

export interface BetHistory {
  id: string;
  time: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
  line: string;
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
