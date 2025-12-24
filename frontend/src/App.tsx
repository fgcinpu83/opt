import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AccountPanel } from './components/AccountPanel';
import { LiveScanner } from './components/LiveScanner';
import { ExecutionHistory } from './components/ExecutionHistory';
import { DailyProfit } from './components/DailyProfit';
import { Configuration } from './components/Configuration';
import { Logs } from './components/Logs';
import { SystemHealth, ConnectionStatus, BetConfig, LiveOpp, ExecutedBet, LogEntry } from './types';

function App() {
    const [isRunning, setIsRunning] = useState(false);
    const [ping, setPing] = useState(45);
    const [accounts, setAccounts] = useState<any[]>([]);

    const [health, setHealth] = useState<SystemHealth>({
        engineApi: ConnectionStatus.CONNECTED,
        database: ConnectionStatus.CONNECTED,
        redis: ConnectionStatus.CONNECTED,
        worker: ConnectionStatus.STANDBY
    });

    const [config, setConfig] = useState<BetConfig>({
        tier1: 100,
        tier2: 50,
        tier3: 25,
        minProfit: 1.5,
        maxProfit: 5.0,
        maxMinuteHT: 40,
        maxMinuteFT: 85,
        matchFilter: 'MIXED',
        markets: {
            ftHdp: true,
            ftOu: true,
            ft1x2: false,
            htHdp: true,
            htOu: true,
            ht1x2: false
        }
    });

    const [scannerData, setScannerData] = useState<LiveOpp[]>([]);
    const [historyData, setHistoryData] = useState<ExecutedBet[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System initialized successfully.' },
        { id: '2', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'Connected to engine API.' },
    ]);

    const toggleBot = () => {
        setIsRunning(!isRunning);
        setHealth(prev => ({
            ...prev,
            worker: !isRunning ? ConnectionStatus.PROCESSING : ConnectionStatus.STANDBY
        }));
        addLog(!isRunning ? 'Bot started trading.' : 'Bot stopped.', !isRunning ? 'SUCCESS' : 'WARN');
    };

    const addLog = (message: string, level: LogEntry['level'] = 'INFO') => {
        const newLog: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
        };
        setLogs(prev => [...prev.slice(-49), newLog]);
    };

    // Fetch accounts on mount
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/sessions?user_id=1`);
                const data = await response.json();
                if (data.success && data.accounts) {
                    setAccounts(data.accounts);
                }
            } catch (error) {
                console.error('Failed to fetch accounts:', error);
            }
        };
        fetchAccounts();
    }, []);

    // Native WebSocket connection (NO socket.io)
    useEffect(() => {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/opportunities';
        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    addLog('WebSocket connected', 'SUCCESS');
                    setHealth(prev => ({ ...prev, engineApi: ConnectionStatus.CONNECTED }));
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        if (message.type === 'opportunity') {
                            const opp = message.data;
                            const transformed: LiveOpp = {
                                match_id: opp.match_id,
                                sport: opp.sport || 'unknown',
                                league: opp.league || 'unknown',
                                home_team: opp.home_team,
                                away_team: opp.away_team,
                                match_time: opp.match_time,
                                market: opp.bet1.market,
                                account_a: {
                                    provider: opp.bet1.bookmaker,
                                    selection: opp.bet1.selection,
                                    hk_odds: opp.bet1.odds.hk_odds,
                                    stake: opp.bet1.stake.rounded
                                },
                                account_b: {
                                    provider: opp.bet2.bookmaker,
                                    selection: opp.bet2.selection,
                                    hk_odds: opp.bet2.odds.hk_odds,
                                    stake: opp.bet2.stake.rounded
                                },
                                profit: opp.profit,
                                roi: opp.roi
                            };

                            setScannerData(prev => {
                                const filtered = prev.filter(item => item.match_id !== transformed.match_id);
                                return [transformed, ...filtered].slice(0, 50);
                            });

                            addLog(`New opportunity: ${opp.home_team} vs ${opp.away_team}`, 'INFO');
                        }

                        if (message.type === 'execution') {
                            const exec = message.data;
                            const transformed: ExecutedBet = {
                                match_id: exec.match_id,
                                sport: exec.sport || 'unknown',
                                league: exec.league || 'unknown',
                                home_team: exec.home_team,
                                away_team: exec.away_team,
                                match_time: exec.match_time,
                                market: exec.market,
                                account_a: {
                                    provider: exec.account_a.provider,
                                    selection: exec.account_a.selection,
                                    hk_odds: exec.account_a.hk_odds,
                                    stake: exec.account_a.stake,
                                    status: exec.account_a.status
                                },
                                account_b: {
                                    provider: exec.account_b.provider,
                                    selection: exec.account_b.selection,
                                    hk_odds: exec.account_b.hk_odds,
                                    stake: exec.account_b.stake,
                                    status: exec.account_b.status
                                },
                                profit: exec.profit,
                                roi: exec.roi,
                                executed_at: exec.executed_at
                            };

                            setHistoryData(prev => [transformed, ...prev].slice(0, 100));

                            setScannerData(prev => prev.filter(item => item.match_id !== exec.match_id));

                            addLog(`Executed: ${exec.home_team} vs ${exec.away_team}`, 'SUCCESS');
                        }
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };

                ws.onerror = (error) => {
                    addLog('WebSocket error', 'ERROR');
                    setHealth(prev => ({ ...prev, engineApi: ConnectionStatus.ERROR }));
                };

                ws.onclose = () => {
                    addLog('WebSocket disconnected', 'WARN');
                    setHealth(prev => ({ ...prev, engineApi: ConnectionStatus.DISCONNECTED }));
                    reconnectTimeout = setTimeout(connect, 5000);
                };
            } catch (error) {
                console.error('WebSocket connection failed:', error);
                reconnectTimeout = setTimeout(connect, 5000);
            }
        };

        connect();

        return () => {
            if (ws) {
                ws.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        };
    }, []);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setPing(Math.floor(Math.random() * 50) + 30);
        }, 2000);

        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-indigo-500/30">
            <Header health={health} />

            <main className="max-w-[1600px] mx-auto p-4 grid grid-cols-12 gap-4">

                <div className="col-span-12 lg:col-span-3 space-y-4 flex flex-col h-[calc(100vh-100px)]">
                    <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
                        {accounts.length > 0 ? (
                            accounts.slice(0, 2).map((account, idx) => (
                                <AccountPanel
                                    key={account.id}
                                    label={`Account ${String.fromCharCode(65 + idx)}`}
                                    initialSportsbook={account.sportsbook}
                                    isConnected={account.status === 'online'}
                                    isRunning={isRunning}
                                    ping={ping + idx * 12}
                                    balance={account.balance || 0}
                                    onToggleBot={toggleBot}
                                />
                            ))
                        ) : (
                            <>
                                <AccountPanel
                                    label="Account A"
                                    initialSportsbook="NOVA"
                                    isConnected={false}
                                    isRunning={isRunning}
                                    ping={ping}
                                    balance={0}
                                    onToggleBot={toggleBot}
                                />
                                <AccountPanel
                                    label="Account B"
                                    initialSportsbook="SBOBET"
                                    isConnected={false}
                                    isRunning={isRunning}
                                    ping={ping + 12}
                                    balance={0}
                                    onToggleBot={toggleBot}
                                />
                            </>
                        )}
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <Configuration config={config} onChange={setConfig} />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 space-y-4 h-[calc(100vh-100px)] flex flex-col">
                    <div className="h-1/3 min-h-[250px]">
                        <ExecutionHistory history={historyData} />
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <LiveScanner data={scannerData} />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-3 space-y-4 h-[calc(100vh-100px)] flex flex-col">
                    <div className="h-[200px] shrink-0">
                        <DailyProfit initialBalance={8000} currentBalance={8340.50} />
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <Logs logs={logs} />
                    </div>
                </div>

            </main>
        </div>
    );
}

export default App;
