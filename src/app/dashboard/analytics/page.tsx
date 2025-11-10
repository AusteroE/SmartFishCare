'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
    date: string;
    count: number;
    avgLength: number;
    avgWidth: number;
    totalLength: number;
    totalWidth: number;
    rawDate: string;
}

interface Totals {
    totalCount: number;
    avgLength: number;
    avgWidth: number;
    totalRecords: number;
}

export default function AnalyticsPage() {
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [totals, setTotals] = useState<Totals>({ totalCount: 0, avgLength: 0, avgWidth: 0, totalRecords: 0 });
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log(`[Analytics Page] Fetching analytics for period: ${period}`);

            const response = await fetch(`/api/harvest/analytics?period=${period}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`[Analytics Page] Received response:`, {
                success: data.success,
                dataLength: data.data?.length || 0,
                totals: data.totals,
                dateRange: data.dateRange,
                debug: data.debug,
            });

            if (data.success) {
                setChartData(data.data || []);
                setTotals(data.totals || { totalCount: 0, avgLength: 0, avgWidth: 0, totalRecords: 0 });

                if (data.data && data.data.length === 0) {
                    console.log('[Analytics Page] No data returned from API');
                    if (data.debug) {
                        console.log('[Analytics Page] Debug info:', data.debug);
                        if (data.debug.allFishCount === 0) {
                            console.warn('[Analytics Page] User has no fish detection data at all');
                        } else if (data.debug.totalLargeFishCount === 0) {
                            console.warn('[Analytics Page] User has fish detection data but no large fish');
                        } else if (data.debug.foundInRange === 0) {
                            console.warn('[Analytics Page] User has large fish data but none in selected date range');
                        }
                    }
                } else {
                    console.log(`[Analytics Page] Successfully loaded ${data.data.length} data points`);
                    if (data.debug?.usingAllData) {
                        console.log('[Analytics Page] Showing all available data (outside selected date range)');
                    }
                }
            } else {
                const errorMsg = data.message || 'Failed to fetch analytics';
                console.error('[Analytics Page] API returned error:', errorMsg);
                setError(errorMsg);
            }
        } catch (err: any) {
            console.error('[Analytics Page] Error fetching analytics:', err);
            setError(err.message || 'Failed to load analytics data. Please check your database connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = () => {
        window.open(`/api/harvest/export-pdf?period=${period}`, '_blank');
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen w-full">
                {/* Header */}
                <header className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e6e9ef] mb-2">
                                Harvest Analytics
                            </h1>
                            <p className="text-sm sm:text-base text-[#a2a8b6]">
                                Track and analyze large fish ready to harvest over time
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateReport}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#7c5cff] to-[#6b4ce6] text-white rounded-lg text-sm sm:text-base font-semibold hover:from-[#6b4ce6] hover:to-[#5a4cd6] transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                            <i className="fas fa-file-pdf text-sm"></i>
                            <span>Generate Report</span>
                        </button>
                    </div>
                </header>

                {/* Period Filter */}
                <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm sm:text-base font-semibold text-[#e6e9ef]">Filter Period:</label>
                        <div className="flex flex-wrap gap-2">
                            {(['day', 'week', 'month', 'year'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                        ? 'bg-[#7c5cff] text-white shadow-lg'
                                        : 'bg-white/5 text-[#a2a8b6] hover:bg-white/10 hover:text-[#e6e9ef]'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs sm:text-sm text-[#a2a8b6] mb-1">Total Large Fish</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-[#e6e9ef]">{totals.totalCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-fish text-xl text-blue-400"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs sm:text-sm text-[#a2a8b6] mb-1">Avg Length (cm)</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-[#e6e9ef]">{totals.avgLength.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-ruler-horizontal text-xl text-green-400"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs sm:text-sm text-[#a2a8b6] mb-1">Avg Width (cm)</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-[#e6e9ef]">{totals.avgWidth.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-ruler-vertical text-xl text-yellow-400"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs sm:text-sm text-[#a2a8b6] mb-1">Total Records</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-[#e6e9ef]">{totals.totalRecords}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-chart-line text-xl text-purple-400"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                {loading ? (
                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-8 sm:p-10 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-[#7c5cff] mb-3"></i>
                        <p className="text-[#a2a8b6]">Loading analytics...</p>
                    </div>
                ) : error ? (
                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-8 sm:p-10 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center">
                        <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-3"></i>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 bg-[#7c5cff] text-white rounded-lg hover:bg-[#6b4ce6] transition-colors text-sm"
                        >
                            <i className="fas fa-redo mr-2"></i>Retry
                        </button>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-8 sm:p-10 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center">
                        <i className="fas fa-chart-line text-4xl text-[#a2a8b6] mb-3"></i>
                        <p className="text-[#e6e9ef] text-lg font-semibold mb-2">No Large Fish Detection Data</p>
                        <p className="text-[#a2a8b6] text-sm mb-4">No large fish ready to harvest found for the selected period ({period})</p>
                        <div className="text-left max-w-md mx-auto bg-white/5 rounded-lg p-4 text-xs text-[#a2a8b6] space-y-2 mb-4">
                            <p className="font-semibold text-[#e6e9ef] mb-2">To see data here:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Use the fish detection feature on the dashboard</li>
                                <li>Ensure fish are detected as "Large" size category (length &gt; harvest threshold)</li>
                                <li>Try selecting a different time period (Day, Week, Month, Year)</li>
                                <li>Check that fish detection data is being saved to the database</li>
                                <li>Verify you're logged in as the user who created the detections</li>
                            </ul>
                        </div>
                        <div className="text-xs text-[#a2a8b6] italic mb-4">
                            <p>💡 Tip: Check the browser console (F12) for detailed debugging information</p>
                        </div>
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 bg-[#7c5cff] text-white rounded-lg hover:bg-[#6b4ce6] transition-colors text-sm"
                        >
                            <i className="fas fa-redo mr-2"></i>Refresh Data
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Count Chart */}
                        <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-[#e6e9ef] mb-4">Large Fish Detected Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#a2a8b6"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#a2a8b6"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1f35',
                                            border: '1px solid #ffffff20',
                                            borderRadius: '8px',
                                            color: '#e6e9ef'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#7c5cff"
                                        strokeWidth={2}
                                        dot={{ fill: '#7c5cff', r: 4 }}
                                        name="Fish Count"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Average Size Chart */}
                        <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                            <h2 className="text-lg sm:text-xl font-bold text-[#e6e9ef] mb-4">Average Fish Size Over Time (cm)</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#a2a8b6"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#a2a8b6"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1f35',
                                            border: '1px solid #ffffff20',
                                            borderRadius: '8px',
                                            color: '#e6e9ef'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="avgLength"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ fill: '#10b981', r: 4 }}
                                        name="Avg Length (cm)"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avgWidth"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={{ fill: '#f59e0b', r: 4 }}
                                        name="Avg Width (cm)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

