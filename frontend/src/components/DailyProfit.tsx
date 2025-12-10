import React from 'react';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyProfitProps {
    initialBalance: number;
    currentBalance: number;
}

export const DailyProfit: React.FC<DailyProfitProps> = ({ initialBalance, currentBalance }) => {
    const profit = currentBalance - initialBalance;
    const isProfitPositive = profit >= 0;

    // Chart data preparation
    const chartData = [
        { name: 'Start', amount: initialBalance },
        { name: 'Current', amount: currentBalance },
    ];

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-xl flex flex-col justify-between h-full">
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Daily P&L</h3>
                <div className={`text-2xl font-mono font-bold mt-2 ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfitPositive ? '+' : ''}{profit.toFixed(2)} USD
                </div>
                <p className="text-xs text-gray-500 mt-1">From initial {initialBalance}</p>
            </div>

            <div className="h-32 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px' }}
                            itemStyle={{ color: '#e5e7eb' }}
                        />
                        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
