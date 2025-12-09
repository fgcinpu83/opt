import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AccountPanel } from './components/AccountPanel';
import { Configuration } from './components/Configuration';
import { Monitoring } from './components/Monitoring';
import { Logs } from './components/Logs';
import { apiClient } from './api/client';
import { 
  mapBetHistoryToUI, 
  mapSystemHealthToUI, 
  mapLoginStatusToAccount,
  createLogEntry,
  safeLocalStorage,
} from './utils/mappers';
import { 
  SystemHealth, 
  ConnectionStatus, 
  BetConfig, 
  LiveOpp, 
  BetHistory, 
  LogEntry 
} from './types';

// Initial configuration matching backend API spec
const INITIAL_CONFIG: BetConfig = {
  tier1: 500,
  tier2: 200,
  tier3: 100,
  minProfit: 3,
  maxProfit: 10,
  maxMinuteHT: 35,
  maxMinuteFT: 75,
  matchFilter: 'LIVE',
  markets: {
    ftHdp: true,
    ftOu: true,
    ft1x2: false,
    htHdp: true,
    htOu: true,
    ht1x2: false,
  },
};

const storage = safeLocalStorage();

const App: React.FC = () => {
  // --- STATE ---
  
  // 1. System Health
  const [health, setHealth] = useState<SystemHealth>({
    engineApi: ConnectionStatus.DISCONNECTED,
    database: ConnectionStatus.DISCONNECTED,
    redis: ConnectionStatus.DISCONNECTED,
    worker: ConnectionStatus.STANDBY
  });

  // 2. Account State (Dual Accounts - mapped from backend workers)
  const [account1, setAccount1] = useState({ 
    isRunning: false, 
    ping: 0, 
    balance: 0,
    isConnected: false 
  });
  const [account2, setAccount2] = useState({ 
    isRunning: false, 
    ping: 0, 
    balance: 0,
    isConnected: false 
  });
  
  // 3. Config - Load from localStorage or use defaults
  const [config, setConfig] = useState<BetConfig>(() => {
    try {
      const saved = storage.getItem('arb_config');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  // 4. Scanner Data (Live Opportunities) - Placeholder for now
  const [scannerData, setScannerData] = useState<LiveOpp[]>([]);

  // 5. Execution History
  const [historyData, setHistoryData] = useState<BetHistory[]>([]);

  // 6. Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    createLogEntry('INFO', 'ArbBot Pro Dashboard initialized')
  ]);

  // 7. Initial balance tracking
  const [initialBalance] = useState(15420.50);

  // --- HELPER FUNCTIONS ---
  
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs(prev => [createLogEntry(level, message), ...prev.slice(0, 99)]);
  }, []);

  // --- API INTEGRATION ---

  // Fetch system health from backend
  const fetchSystemHealth = useCallback(async () => {
    try {
      const healthData = await apiClient.getSystemHealth();
      const mappedHealth = mapSystemHealthToUI(healthData);
      setHealth(mappedHealth);

      // Update worker pings
      if (healthData.workers[0]) {
        setAccount1(prev => ({ 
          ...prev, 
          ping: healthData.workers[0].last_ping_ms || 0,
          isConnected: healthData.workers[0].connected 
        }));
      }
      if (healthData.workers[1]) {
        setAccount2(prev => ({ 
          ...prev, 
          ping: healthData.workers[1].last_ping_ms || 0,
          isConnected: healthData.workers[1].connected 
        }));
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setHealth({
        engineApi: ConnectionStatus.ERROR,
        database: ConnectionStatus.ERROR,
        redis: ConnectionStatus.ERROR,
        worker: ConnectionStatus.ERROR
      });
    }
  }, []);

  // Fetch login status and update account states
  const fetchLoginStatus = useCallback(async () => {
    try {
      const { workers } = await apiClient.getLoginStatus();
      
      if (workers[0]) {
        const mapped = mapLoginStatusToAccount(workers[0]);
        setAccount1(prev => ({ ...prev, ...mapped }));
      }
      if (workers[1]) {
        const mapped = mapLoginStatusToAccount(workers[1]);
        setAccount2(prev => ({ ...prev, ...mapped }));
      }
    } catch (error) {
      console.error('Failed to fetch login status:', error);
    }
  }, []);

  // Fetch bet history from backend
  const fetchBetHistory = useCallback(async () => {
    try {
      const { history } = await apiClient.getBetHistory();
      const mappedHistory = history.map(mapBetHistoryToUI);
      setHistoryData(mappedHistory.slice(0, 20)); // Keep last 20
    } catch (error) {
      console.error('Failed to fetch bet history:', error);
    }
  }, []);

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      const settings = await apiClient.getSettings();
      
      // Map backend settings to UI config
      const mappedConfig: BetConfig = {
        tier1: config.tier1, // Backend doesn't store tiers
        tier2: config.tier2,
        tier3: config.tier3,
        minProfit: settings.min_percent,
        maxProfit: settings.max_percent,
        maxMinuteHT: settings.minute_limit_ht,
        maxMinuteFT: settings.minute_limit_ft,
        matchFilter: settings.match_filter === 'live_only' ? 'LIVE' : 
                     settings.match_filter === 'prematch_only' ? 'PREMATCH' : 'MIXED',
        markets: {
          ftHdp: settings.market_filter.ft_hdp,
          ftOu: settings.market_filter.ft_ou,
          ft1x2: settings.market_filter.ft_1x2,
          htHdp: settings.market_filter.ht_hdp,
          htOu: settings.market_filter.ht_ou,
          ht1x2: settings.market_filter.ht_1x2,
        },
      };
      
      setConfig(mappedConfig);
      addLog('SUCCESS', 'Settings loaded from backend');
    } catch (error) {
      console.error('Failed to load settings:', error);
      addLog('WARN', 'Using default settings');
    }
  }, [config.tier1, config.tier2, config.tier3, addLog]);

  // Save settings to backend
  const saveSettings = useCallback(async (newConfig: BetConfig) => {
    try {
      const backendSettings = {
        min_percent: newConfig.minProfit,
        max_percent: newConfig.maxProfit,
        minute_limit_ht: newConfig.maxMinuteHT,
        minute_limit_ft: newConfig.maxMinuteFT,
        market_filter: {
          ft_hdp: newConfig.markets.ftHdp,
          ft_ou: newConfig.markets.ftOu,
          ft_1x2: newConfig.markets.ft1x2,
          ht_hdp: newConfig.markets.htHdp,
          ht_ou: newConfig.markets.htOu,
          ht_1x2: newConfig.markets.ht1x2,
        },
        match_filter: newConfig.matchFilter === 'LIVE' ? 'live_only' as const : 
                      newConfig.matchFilter === 'PREMATCH' ? 'prematch_only' as const : 'all' as const,
        round_off: 5, // Default round off
      };

      await apiClient.saveSettings(backendSettings);
      storage.setItem('arb_config', JSON.stringify(newConfig));
      addLog('SUCCESS', 'Configuration saved to backend');
    } catch (error) {
      console.error('Failed to save settings:', error);
      addLog('ERROR', 'Failed to save configuration');
    }
  }, [addLog]);

  // --- LIFECYCLE ---

  // Initial data load
  useEffect(() => {
    fetchSystemHealth();
    fetchLoginStatus();
    fetchBetHistory();
    loadSettings();
    
    addLog('INFO', 'Connecting to backend API...');
  }, []);

  // Poll system health every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchLoginStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSystemHealth, fetchLoginStatus]);

  // Poll bet history every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchBetHistory, 10000);
    return () => clearInterval(interval);
  }, [fetchBetHistory]);

  // --- EVENT HANDLERS ---

  const handleConfigChange = useCallback((newConfig: BetConfig) => {
    setConfig(newConfig);
    saveSettings(newConfig);
  }, [saveSettings]);

  const toggleAccount1 = useCallback(async () => {
    const newState = !account1.isRunning;
    
    try {
      if (newState) {
        // Trigger login
        await apiClient.login([{
          url: 'https://qq188.com',
          username: 'account1_user',
          password: 'account1_pass'
        }]);
        addLog('SUCCESS', '*** ACCOUNT 1 (Soft) STARTED ***');
      } else {
        addLog('WARN', '*** ACCOUNT 1 (Soft) STOPPED ***');
      }
      
      setAccount1(prev => ({ ...prev, isRunning: newState }));
    } catch (error) {
      addLog('ERROR', `Failed to ${newState ? 'start' : 'stop'} Account 1`);
    }
  }, [account1.isRunning, addLog]);

  const toggleAccount2 = useCallback(async () => {
    const newState = !account2.isRunning;
    
    try {
      if (newState) {
        // Trigger login
        await apiClient.login([{
          url: 'https://qq188.com',
          username: 'account2_user',
          password: 'account2_pass'
        }]);
        addLog('SUCCESS', '*** ACCOUNT 2 (Sharp) STARTED ***');
      } else {
        addLog('WARN', '*** ACCOUNT 2 (Sharp) STOPPED ***');
      }
      
      setAccount2(prev => ({ ...prev, isRunning: newState }));
    } catch (error) {
      addLog('ERROR', `Failed to ${newState ? 'start' : 'stop'} Account 2`);
    }
  }, [account2.isRunning, addLog]);

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-gray-950 text-slate-200 font-sans pb-8">
      
      <Header health={health} totalBalance={account1.balance + account2.balance} />

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Accounts & Config (3 cols) */}
          <div className="lg:col-span-3 space-y-4 flex flex-col">
            {/* Account Panel 1 */}
            <AccountPanel 
              label="Account A (Soft)" 
              initialSportsbook="nova88/saba"
              balance={account1.balance}
              isConnected={account1.isConnected} 
              isRunning={account1.isRunning} 
              ping={account1.ping}
              onToggleBot={toggleAccount1}
            />
            
            {/* Account Panel 2 */}
            <AccountPanel 
              label="Account B (Sharp)" 
              initialSportsbook="qq188/s bet"
              balance={account2.balance}
              isConnected={account2.isConnected} 
              isRunning={account2.isRunning} 
              ping={account2.ping}
              onToggleBot={toggleAccount2}
            />
            
            <div className="flex-1">
              <Configuration config={config} onChange={handleConfigChange} />
            </div>
          </div>

          {/* Right Column: Monitoring & Logs (9 cols) */}
          <div className="lg:col-span-9 space-y-4 flex flex-col">
            <div className="flex-1">
              <Monitoring 
                scannerData={scannerData} 
                historyData={historyData}
                initialBalance={initialBalance}
                currentBalance={account1.balance + account2.balance}
              />
            </div>
            <div className="h-64">
              <Logs logs={logs} />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default App;
