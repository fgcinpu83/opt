// Data mappers to convert backend API responses to UI types
import { BetHistory, LiveOpp, LogEntry, ConnectionStatus } from '../types';
import type { BetHistoryItem, SystemHealthResponse, LoginStatusWorker } from '../api/client';

// Map backend bet history to UI bet history
export function mapBetHistoryToUI(backendBet: BetHistoryItem): BetHistory {
  const timestamp = new Date(backendBet.timestamp * 1000);
  const timeStr = timestamp.toLocaleTimeString('en-GB', { hour12: false });
  
  // Parse match_id to extract team names if available, otherwise use placeholder
  const matchId = backendBet.match_id || 'Unknown Match';
  const teams = matchId.includes(' vs ') 
    ? matchId.split(' vs ') 
    : ['Team A', 'Team B'];
  
  return {
    id: backendBet.pair_id,
    time: timeStr,
    match: {
      home: teams[0] || 'Home Team',
      away: teams[1] || 'Away Team',
    },
    provider: backendBet.provider,
    pairSite: backendBet.provider, // TODO: Get actual pair site from backend
    type: `${backendBet.market} ${backendBet.type}`.toUpperCase(),
    line: '0.0', // Backend doesn't provide line in history
    pick: backendBet.side.charAt(0).toUpperCase() + backendBet.side.slice(1),
    odds: backendBet.odds,
    pairOdds: backendBet.odds, // TODO: Get actual pair odds from backend
    stake: backendBet.stake,
    status: backendBet.result === 'accepted' ? 'ACCEPTED' : backendBet.result === 'rejected' ? 'REJECTED' : 'RUNNING',
    site: backendBet.provider,
    profit: backendBet.result === 'accepted' ? backendBet.stake * backendBet.odds : undefined,
  };
}

// Map system health to connection status
export function mapLatencyToStatus(pingMs: number | null): ConnectionStatus {
  if (pingMs === null) return ConnectionStatus.DISCONNECTED;
  if (pingMs < 150) return ConnectionStatus.CONNECTED; // Green
  if (pingMs < 350) return ConnectionStatus.PROCESSING; // Yellow/Warning
  return ConnectionStatus.ERROR; // Red
}

// Map backend system health to UI system health
export function mapSystemHealthToUI(health: SystemHealthResponse) {
  const primaryWorker = health.workers[0];
  
  return {
    engineApi: health.backend.healthy ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
    database: ConnectionStatus.CONNECTED, // Backend doesn't provide this separately
    redis: ConnectionStatus.CONNECTED, // Backend doesn't provide this separately
    worker: primaryWorker?.connected 
      ? (primaryWorker.odds_stream_active ? ConnectionStatus.PROCESSING : ConnectionStatus.STANDBY)
      : ConnectionStatus.DISCONNECTED,
  };
}

// Map login status worker to account state
export function mapLoginStatusToAccount(worker: LoginStatusWorker | null) {
  if (!worker) {
    return {
      isRunning: false,
      ping: 0,
      balance: 0,
      isConnected: false,
    };
  }

  return {
    isRunning: worker.status === 'logged_in',
    ping: worker.ping_ms || 0,
    balance: worker.balance || 0,
    isConnected: worker.cookies_valid,
  };
}

// Create log entry
export function createLogEntry(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string): LogEntry {
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    level,
    message,
  };
}

// Safe access helpers
export function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export function safeString(value: any, defaultValue: string = ''): string {
  return value?.toString() || defaultValue;
}

// LocalStorage safe wrapper
export function safeLocalStorage() {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('localStorage setItem failed:', e);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('localStorage removeItem failed:', e);
        }
      },
    };
  } catch {
    // localStorage not available, return dummy implementation
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
}
