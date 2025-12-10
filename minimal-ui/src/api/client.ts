// API Client for Arbitrage Bot Backend
// Supports both Docker (http://engine:3000) and local dev (http://localhost:3000)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginAccount {
  url: string;
  username: string;
  password: string;
}

interface LoginStatusWorker {
  provider: string;
  status: 'logged_in' | 'logging_in' | 'logged_out';
  cookies_valid: boolean;
  balance: number | null;
  ping_ms: number | null;
}

interface SettingsPayload {
  min_percentage: number;
  max_percentage: number;
  ht_time_last_bet: number;
  ft_time_last_bet: number;
  match_filter: string;
  ft_hdp: boolean;
  ft_ou: boolean;
  ft_1x2: boolean;
  ht_hdp: boolean;
  ht_ou: boolean;
  ht_1x2: boolean;
}

interface ExecuteBetPayload {
  pair_id: string;
  leg_1: {
    provider: string;
    match_id: string;
    market: string;
    type: string;
    side: string;
    line: string;
    odds: number;
    stake: number;
  };
  leg_2: {
    provider: string;
    match_id: string;
    market: string;
    type: string;
    side: string;
    line: string;
    odds: number;
    stake: number;
  };
}

interface BetHistoryItem {
  timestamp: number;
  pair_id: string;
  provider: string;
  match_id: string;
  market: string;
  type: string;
  side: string;
  stake: number;
  odds: number;
  result: 'accepted' | 'rejected' | 'pending';
  cooldown_end?: number;
}

interface SystemHealthResponse {
  backend: {
    healthy: boolean;
    uptime_seconds: number;
    ws_clients: number;
  };
  workers: Array<{
    provider: string;
    connected: boolean;
    last_ping_ms: number;
    latency_status: 'good' | 'warning' | 'critical';
    odds_stream_active: boolean;
  }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // POST /api/login - Trigger login for all accounts
  async login(accounts: LoginAccount[]) {
    return this.request<{ status: string; message: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ accounts }),
    });
  }

  // GET /api/login-status - Check login status for all workers
  async getLoginStatus() {
    return this.request<{ workers: LoginStatusWorker[] }>('/api/login-status');
  }

  // POST /api/settings - Save UI settings
  async saveSettings(settings: SettingsPayload) {
    return this.request<{ status: string }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // GET /api/settings - Load UI settings
  async getSettings() {
    return this.request<SettingsPayload>('/api/settings');
  }

  // POST /api/execute - Execute arbitrage bet
  async executeBet(bet: ExecuteBetPayload) {
    return this.request<{ status: string; message: string }>('/api/execute', {
      method: 'POST',
      body: JSON.stringify(bet),
    });
  }

  // GET /api/bets - Get bet history
  async getBetHistory() {
    return this.request<{ history: BetHistoryItem[] }>('/api/bets');
  }

  // GET /api/system-health - System health check
  async getSystemHealth() {
    return this.request<SystemHealthResponse>('/api/system-health');
  }

  // Legacy health check endpoint
  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return { healthy: response.ok };
    } catch (error) {
      return { healthy: false };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type {
  LoginAccount,
  LoginStatusWorker,
  SettingsPayload,
  ExecuteBetPayload,
  BetHistoryItem,
  SystemHealthResponse,
};
