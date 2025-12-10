import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AccountPanel } from './components/AccountPanel';
import { LiveScanner } from './components/LiveScanner';
import { ExecutionHistory } from './components/ExecutionHistory';
import { DailyProfit } from './components/DailyProfit';
import { Configuration } from './components/Configuration';
import { Logs } from './components/Logs';
import { SystemHealth, ConnectionStatus, BetConfig, LiveOpp, BetHistory, LogEntry } from './types';

function App() {
    // --- State Management ---
    const [isRunning, setIsRunning] = useState(false);
    const [ping, setPing] = useState(45);

    // Mock Health Status
    const [health, setHealth] = useState<SystemHealth>({
        engineApi: ConnectionStatus.CONNECTED,
        database: ConnectionStatus.CONNECTED,
        redis: ConnectionStatus.CONNECTED,
        worker: ConnectionStatus.STANDBY
    });

    // Configuration State
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

    // Mock Data
    const [scannerData, setScannerData] = useState<LiveOpp[]>([
        {
            id: '1',
            time: '02:03:51',
            profit: 4.00,
            legs: [
                { site: 'Nova', match: 'MU', league: 'EPL', market: 'HT/HDP', pick: '0.25', odds: 2.05 },
                { site: 'SBO', match: 'Arsenal', league: 'EPL', market: 'HT/HDP', pick: '-0.25', odds: 1.98 }
            ]
        },
        {
            id: '2',
            time: '02:04:10',
            profit: 2.50,
            legs: [
                { site: 'Bet365', match: 'Lakers', league: 'NBA', market: 'FT/OU', pick: 'Over 220.5', odds: 1.90 },
                { site: 'Pinnacle', match: 'Lakers', league: 'NBA', market: 'FT/OU', pick: 'Under 220.5', odds: 2.15 }
            ]
        }
    ]);

    const [historyData, setHistoryData] = useState<BetHistory[]>([
        { id: '1', time: '02:01:00', site: 'Nova', match: 'MU vs Arsenal', pick: 'MU +0.25', odds: 2.05, stake: 100, status: 'ACCEPTED' },
        { id: '2', time: '02:01:00', site: 'SBO', match: 'MU vs Arsenal', pick: 'Arsenal -0.25', odds: 1.98, stake: 104, status: 'ACCEPTED' }
    ]);

    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System initialized successfully.' },
        { id: '2', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'Connected to engine API.' },
    ]);

    // --- Handlers ---
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

    // Simulate some activity
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            // Random ping fluctuation
            setPing(Math.floor(Math.random() * 50) + 30);
        }, 2000);

        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-indigo-500/30">
            <Header health={health} />

            <main className="max-w-[1600px] mx-auto p-4 grid grid-cols-12 gap-4">

                {/* Left Column: Accounts & Config (3 cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-4 flex flex-col h-[calc(100vh-100px)]">
                    <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
                        <AccountPanel
                            label="Account 1"
                            initialSportsbook="NOVA"
                            isConnected={true}
                            isRunning={isRunning}
                            ping={ping}
                            balance={5240.50}
                            onToggleBot={toggleBot}
                        />
                        <AccountPanel
                            label="Account 2"
                            initialSportsbook="SBOBET"
                            isConnected={true}
                            isRunning={isRunning}
                            ping={ping + 12}
                            balance={3100.00}
                            onToggleBot={toggleBot}
                        />
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <Configuration config={config} onChange={setConfig} />
                    </div>
                </div>

                {/* Middle Column: History & Scanner (6 cols) */}
                <div className="col-span-12 lg:col-span-6 space-y-4 h-[calc(100vh-100px)] flex flex-col">
                    {/* Execution History (Top) */}
                    <div className="h-1/3 min-h-[250px]">
                        <ExecutionHistory history={historyData} />
                    </div>

                    {/* Live Scanner (Bottom) */}
                    <div className="flex-1 min-h-[300px]">
                        <LiveScanner data={scannerData} />
                    </div>
                </div>

                {/* Right Column: Profit & Logs (3 cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-4 h-[calc(100vh-100px)] flex flex-col">
                    {/* Daily Profit (Top) */}
                    <div className="h-[200px] shrink-0">
                        <DailyProfit initialBalance={8000} currentBalance={8340.50} />
                    </div>

                    {/* Logs (Bottom) */}
                    <div className="flex-1 min-h-[300px]">
                        <Logs logs={logs} />
                    </div>
                </div>

            </main>
        </div>
    );
}

export default App;
