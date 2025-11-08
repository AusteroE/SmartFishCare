'use client';

import { useEffect, useState } from 'react';

interface Alert {
    id: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    timestamp: Date;
    dismissed: boolean;
}

interface SensorData {
    ph: number | null;
    temperature: number | null;
}

interface WaterParameter {
    id: number;
    parameterName: string;
    normalMin: number;
    normalMax: number;
    dangerMin: number | null;
    dangerMax: number | null;
    unit: string;
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [sensorData, setSensorData] = useState<SensorData>({ ph: null, temperature: null });
    const [waterParams, setWaterParams] = useState<WaterParameter[]>([]);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [loading, setLoading] = useState(true);
    const [lastDataTimestamp, setLastDataTimestamp] = useState<number>(Date.now());

    useEffect(() => {
        // Fetch water parameters (only once on mount)
        fetch('/api/records/water-parameters')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setWaterParams(data.data);
                    console.log('Water parameters loaded:', data.data.length);
                }
            })
            .catch((err) => console.error('Error fetching water parameters:', err));

        // Fetch initial sensor data immediately
        const fetchInitialData = async () => {
            try {
                const response = await fetch('/api/iot-data?t=' + new Date().getTime());
                const json = await response.json();
                console.log('Alerts: Initial data fetch:', json);

                if (json.data) {
                    const ph = json.data.ph !== null && json.data.ph !== undefined
                        ? parseFloat(json.data.ph.toString())
                        : null;
                    const temperature = json.data.temperature !== null && json.data.temperature !== undefined
                        ? parseFloat(json.data.temperature.toString())
                        : null;

                    const isPHValid = ph !== null && !isNaN(ph) && ph >= 0 && ph <= 14;
                    const isTempValid = temperature !== null && !isNaN(temperature) && temperature > -20 && temperature < 100;

                    setSensorData({
                        ph: isPHValid ? ph : null,
                        temperature: isTempValid ? temperature : null,
                    });
                    if (isPHValid || isTempValid) {
                        setLastDataTimestamp(Date.now()); // Update timestamp when valid data is received
                    }
                    setConnectionStatus(true);
                }
            } catch (err) {
                console.error('Error fetching initial sensor data:', err);
                setConnectionStatus(false);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        // Set up polling as primary method (real-time updates every 1 second)
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/iot-data?t=' + new Date().getTime());
                const json = await response.json();

                if (json.data) {
                    const ph = json.data.ph !== null && json.data.ph !== undefined
                        ? parseFloat(json.data.ph.toString())
                        : null;
                    const temperature = json.data.temperature !== null && json.data.temperature !== undefined
                        ? parseFloat(json.data.temperature.toString())
                        : null;

                    const isPHValid = ph !== null && !isNaN(ph) && ph >= 0 && ph <= 14;
                    const isTempValid = temperature !== null && !isNaN(temperature) && temperature > -20 && temperature < 100;

                    setSensorData({
                        ph: isPHValid ? ph : null,
                        temperature: isTempValid ? temperature : null,
                    });
                    if (isPHValid || isTempValid) {
                        setLastDataTimestamp(Date.now()); // Update timestamp when valid data is received
                    }
                    setConnectionStatus(true);
                }
            } catch (err) {
                console.error('Error polling sensor data:', err);
                setConnectionStatus(false);
            }
        }, 1000); // Poll every 1 second for real-time updates

        // Subscribe to real-time sensor updates via SSE (secondary method)
        const eventSource = new EventSource('/api/iot-data/stream');

        eventSource.onopen = () => {
            console.log('Alerts: SSE connection opened');
            setConnectionStatus(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const ph = data.ph !== null && data.ph !== undefined
                    ? parseFloat(data.ph.toString())
                    : null;
                const temperature = data.temperature !== null && data.temperature !== undefined
                    ? parseFloat(data.temperature.toString())
                    : null;

                const isPHValid = ph !== null && !isNaN(ph) && ph >= 0.0 && ph <= 14.0;
                const isTempValid = temperature !== null && !isNaN(temperature) && temperature > -20 && temperature < 100;

                if (isPHValid || isTempValid) {
                    setSensorData({
                        ph: isPHValid ? ph : null,
                        temperature: isTempValid ? temperature : null,
                    });
                    setLastDataTimestamp(Date.now()); // Update timestamp when valid data is received
                    setConnectionStatus(true);
                }
            } catch (err) {
                console.error('Error parsing SSE data:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('Alerts: SSE connection error:', err);
            // Don't close immediately - SSE will auto-reconnect
            if (eventSource.readyState === EventSource.CLOSED) {
                eventSource.close();
                setConnectionStatus(false);
            }
        };

        return () => {
            clearInterval(pollInterval);
            eventSource.close();
        };
    }, []);

    // Separate effect for timeout check (runs independently)
    useEffect(() => {
        const timeoutInterval = setInterval(() => {
            const timeSinceLastData = Date.now() - lastDataTimestamp;
            if (timeSinceLastData > 5000 && (sensorData.ph !== null || sensorData.temperature !== null)) {
                console.log('Alerts: No sensor data received in 5 seconds, clearing display');
                setSensorData({ ph: null, temperature: null });
                setConnectionStatus(false);
            }
        }, 1000); // Check every second

        return () => {
            clearInterval(timeoutInterval);
        };
    }, [lastDataTimestamp, sensorData]);

    useEffect(() => {
        // Load dismissed alerts from localStorage
        const dismissedKey = 'sfc_alerts_dismissed_v1';
        const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

        // Generate alerts based on sensor data and water parameters (real-time)
        const newAlerts: Alert[] = [];

        // Get pH and temperature parameters
        const phParam = waterParams.find(p => p.parameterName.toLowerCase() === 'ph' || p.parameterName.toLowerCase() === 'ph level');
        const tempParam = waterParams.find(p =>
            p.parameterName.toLowerCase().includes('temp') ||
            p.parameterName.toLowerCase().includes('temperature')
        );

        console.log('Alerts: Checking sensor data - pH:', sensorData.ph, 'Temp:', sensorData.temperature);
        console.log('Alerts: Water params - pH:', phParam, 'Temp:', tempParam);

        // Check pH alerts (real-time)
        if (sensorData.ph !== null && !isNaN(sensorData.ph)) {
            if (phParam) {
                const phNormal = sensorData.ph >= phParam.normalMin && sensorData.ph <= phParam.normalMax;
                const phDanger = (phParam.dangerMin !== null && sensorData.ph < phParam.dangerMin) ||
                    (phParam.dangerMax !== null && sensorData.ph > phParam.dangerMax);

                if (phDanger) {
                    const alertId = `ph-danger-${Math.round(sensorData.ph * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `⚠️ pH is critically out of range: ${sensorData.ph.toFixed(2)} ${phParam.unit || ''} (Normal: ${phParam.normalMin}-${phParam.normalMax})`,
                            type: 'danger',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                } else if (!phNormal) {
                    const alertId = `ph-warning-${Math.round(sensorData.ph * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `⚠️ pH is out of normal range: ${sensorData.ph.toFixed(2)} ${phParam.unit || ''} (Normal: ${phParam.normalMin}-${phParam.normalMax})`,
                            type: 'warning',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                } else {
                    // pH is normal - add success alert if not dismissed
                    const alertId = 'ph-normal';
                    if (!dismissed.includes(alertId) && sensorData.ph >= phParam.normalMin && sensorData.ph <= phParam.normalMax) {
                        // Only show success if we had a previous alert
                        // For now, we'll skip success alerts to avoid clutter
                    }
                }
            } else {
                // No pH parameter configured - use default ranges
                if (sensorData.ph < 6.5 || sensorData.ph > 8.0) {
                    const alertId = `ph-warning-default-${Math.round(sensorData.ph * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `⚠️ pH is out of recommended range: ${sensorData.ph.toFixed(2)} (Recommended: 6.5-8.0)`,
                            type: 'warning',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                }
            }
        }

        // Check temperature alerts (real-time)
        if (sensorData.temperature !== null && !isNaN(sensorData.temperature)) {
            if (tempParam) {
                const tempNormal = sensorData.temperature >= tempParam.normalMin && sensorData.temperature <= tempParam.normalMax;
                const tempDanger = (tempParam.dangerMin !== null && sensorData.temperature < tempParam.dangerMin) ||
                    (tempParam.dangerMax !== null && sensorData.temperature > tempParam.dangerMax);

                if (tempDanger) {
                    const alertId = `temp-danger-${Math.round(sensorData.temperature * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `🌡️ Temperature is critically out of range: ${sensorData.temperature.toFixed(2)} ${tempParam.unit || '°C'} (Normal: ${tempParam.normalMin}-${tempParam.normalMax})`,
                            type: 'danger',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                } else if (!tempNormal) {
                    const alertId = `temp-warning-${Math.round(sensorData.temperature * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `🌡️ Temperature is out of normal range: ${sensorData.temperature.toFixed(2)} ${tempParam.unit || '°C'} (Normal: ${tempParam.normalMin}-${tempParam.normalMax})`,
                            type: 'warning',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                }
            } else {
                // No temperature parameter configured - use default ranges
                if (sensorData.temperature < 24 || sensorData.temperature > 27) {
                    const alertId = `temp-warning-default-${Math.round(sensorData.temperature * 10)}`;
                    if (!dismissed.includes(alertId)) {
                        newAlerts.push({
                            id: alertId,
                            message: `🌡️ Temperature is out of recommended range: ${sensorData.temperature.toFixed(2)}°C (Recommended: 24-27°C)`,
                            type: 'warning',
                            timestamp: new Date(),
                            dismissed: false,
                        });
                    }
                }
            }
        }

        // Check for no sensor data (real-time check)
        if (!loading && sensorData.ph === null && sensorData.temperature === null) {
            const alertId = 'no-sensor-data';
            if (!dismissed.includes(alertId)) {
                if (!connectionStatus) {
                    newAlerts.push({
                        id: alertId,
                        message: '❌ No valid sensor data detected. Please check your sensor connection.',
                        type: 'danger',
                        timestamp: new Date(),
                        dismissed: false,
                    });
                } else {
                    newAlerts.push({
                        id: alertId,
                        message: 'ℹ️ Waiting for sensor data...',
                        type: 'info',
                        timestamp: new Date(),
                        dismissed: false,
                    });
                }
            }
        } else if (sensorData.ph !== null || sensorData.temperature !== null) {
            // Remove "no sensor data" alert if we have data
            const noDataAlert = newAlerts.find(a => a.id === 'no-sensor-data');
            if (noDataAlert) {
                // Don't add it if we have data
            }
        }

        // Add welcome message on first load
        const sampleSeeded = localStorage.getItem('sfc_sample_seeded');
        if (!sampleSeeded) {
            newAlerts.push({
                id: 'welcome',
                message: '✅ System initialized: Smart Fish Care UI ready',
                type: 'success',
                timestamp: new Date(),
                dismissed: false,
            });
            newAlerts.push({
                id: 'tip',
                message: '💡 Tip: Set feeding schedule for each fish size category',
                type: 'info',
                timestamp: new Date(),
                dismissed: false,
            });
            localStorage.setItem('sfc_sample_seeded', '1');
        }

        setAlerts(newAlerts);
    }, [sensorData, waterParams, connectionStatus, loading]);

    const dismissAlert = (alertId: string) => {
        const dismissedKey = 'sfc_alerts_dismissed_v1';
        const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
        dismissed.push(alertId);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
        setAlerts(alerts.filter(alert => alert.id !== alertId));
    };

    const getAlertBadgeColor = (type: string) => {
        switch (type) {
            case 'danger':
                return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'warning':
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'info':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'success':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'danger':
                return 'fa-exclamation-triangle';
            case 'warning':
                return 'fa-exclamation-circle';
            case 'info':
                return 'fa-info-circle';
            case 'success':
                return 'fa-check-circle';
            default:
                return 'fa-bell';
        }
    };

    const activeAlerts = alerts.filter(alert => !alert.dismissed);
    const alertCounts = {
        danger: activeAlerts.filter(a => a.type === 'danger').length,
        warning: activeAlerts.filter(a => a.type === 'warning').length,
        info: activeAlerts.filter(a => a.type === 'info').length,
        success: activeAlerts.filter(a => a.type === 'success').length,
    };

    return (
        <div className="min-h-screen w-full">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e6e9ef] mb-2">Alerts & Notifications</h1>
                <p className="text-sm sm:text-base text-[#a2a8b6]">Monitor system alerts and sensor readings</p>
            </header>

            {/* Alert Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-gradient-to-b from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#a2a8b6] mb-1">Critical</p>
                            <p className="text-2xl font-bold text-red-400">{alertCounts.danger}</p>
                        </div>
                        <i className="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                    </div>
                </div>
                <div className="bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#a2a8b6] mb-1">Warnings</p>
                            <p className="text-2xl font-bold text-yellow-400">{alertCounts.warning}</p>
                        </div>
                        <i className="fas fa-exclamation-circle text-2xl text-yellow-400"></i>
                    </div>
                </div>
                <div className="bg-gradient-to-b from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#a2a8b6] mb-1">Info</p>
                            <p className="text-2xl font-bold text-blue-400">{alertCounts.info}</p>
                        </div>
                        <i className="fas fa-info-circle text-2xl text-blue-400"></i>
                    </div>
                </div>
                <div className="bg-gradient-to-b from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#a2a8b6] mb-1">Success</p>
                            <p className="text-2xl font-bold text-green-400">{alertCounts.success}</p>
                        </div>
                        <i className="fas fa-check-circle text-2xl text-green-400"></i>
                    </div>
                </div>
            </div>

            {/* Current Sensor Readings */}
            <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-[#e6e9ef]">Current Sensor Readings</h2>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${connectionStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className="text-xs text-[#a2a8b6]">
                            {connectionStatus ? 'Live' : 'Disconnected'}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white/4 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#a2a8b6] mb-1">pH Level</p>
                                <p className="text-2xl font-bold text-[#e6e9ef]">
                                    {sensorData.ph !== null ? sensorData.ph.toFixed(2) : 'N/A'}
                                </p>
                                {sensorData.ph !== null && (
                                    <p className="text-xs text-[#a2a8b6] mt-1">
                                        Updated: {new Date().toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                            <i className={`fas fa-flask text-3xl ${sensorData.ph !== null ? 'text-[#7c5cff]' : 'text-[#a2a8b6]'}`}></i>
                        </div>
                    </div>
                    <div className="bg-white/4 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#a2a8b6] mb-1">Temperature</p>
                                <p className="text-2xl font-bold text-[#e6e9ef]">
                                    {sensorData.temperature !== null ? `${sensorData.temperature.toFixed(2)}°C` : 'N/A'}
                                </p>
                                {sensorData.temperature !== null && (
                                    <p className="text-xs text-[#a2a8b6] mt-1">
                                        Updated: {new Date().toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                            <i className={`fas fa-thermometer-half text-3xl ${sensorData.temperature !== null ? 'text-[#7c5cff]' : 'text-[#a2a8b6]'}`}></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#e6e9ef]">Active Alerts</h2>
                    {activeAlerts.length > 0 && (
                        <span className="px-3 py-1 bg-[#7c5cff]/20 text-[#7c5cff] rounded-full text-sm font-medium">
                            {activeAlerts.length} {activeAlerts.length === 1 ? 'alert' : 'alerts'}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <i className="fas fa-spinner fa-spin text-2xl text-[#7c5cff] mb-3"></i>
                        <p className="text-[#a2a8b6]">Loading alerts...</p>
                    </div>
                ) : activeAlerts.length === 0 ? (
                    <div className="text-center py-10">
                        <i className="fas fa-check-circle text-4xl text-green-400 mb-3"></i>
                        <p className="text-[#a2a8b6] text-lg">No active alerts</p>
                        <p className="text-[#a2a8b6] text-sm mt-2">All systems are operating normally</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`flex items-start justify-between p-4 rounded-lg border ${getAlertBadgeColor(alert.type)}`}
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <i className={`fas ${getAlertIcon(alert.type)} text-lg mt-0.5`}></i>
                                    <div className="flex-1">
                                        <p className="text-[#e6e9ef]">{alert.message}</p>
                                        <p className="text-xs text-[#a2a8b6] mt-1">
                                            {alert.timestamp.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="ml-4 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-[#e6e9ef] rounded-lg transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

