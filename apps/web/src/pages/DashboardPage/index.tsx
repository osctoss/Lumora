import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  TrendingDown,
  Users,
  Wind,
  Thermometer,
  Sun,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { apiRequest } from '../../lib/api/client.js';
import { getSocket } from '../../lib/websocket/socket.js';

interface DashboardData {
  range: { start: string; end: string };
  energy: {
    consumptionKwh: number;
    savedKwh: number;
    expectedKwh?: number;
    unaccountedKwh?: number;
  };
  current: {
    occupancy: number;
    averageCo2Ppm: number | null;
    averageRoomTemperatureC: number | null;
    environmentalTemperatureC: number | null;
  };
  rooms: Array<{
    id: string;
    name: string;
    floor: number;
    capacity: number;
    powerSupplyOn: boolean;
    occupancyCount: number;
    temperatureC: number;
    co2Ppm: number;
    totalPowerW: number;
    energySavedKwh: number;
    deviceCount: number;
  }>;
  trend: Array<{
    timestamp: string;
    consumptionKwh: number;
    savedKwh?: number;
    expectedKwh?: number;
    averagePowerW: number;
    averagePowerKw?: number;
  }>;
  alerts: Array<{
    id: string;
    roomId: string;
    roomName: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    reason: string;
    timestamp: string;
  }>;
  recentEvents: Array<{
    id: string;
    roomId?: string;
    eventType: string;
    source: string;
    timestamp: string;
    payload?: any;
  }>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '7d'>('24h');
  const [chartMetric, setChartMetric] = useState<'power' | 'energy' | 'savings'>('power');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Anchored to backend simulation clock via timeRange parameter (Correction §6.2, §59)
      const res = await apiRequest<DashboardData>(`/dashboard/building?timeRange=${timeRange}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load building dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  useEffect(() => {
    const socket = getSocket();

    const onMeterReading = () => {
      // Whenever a 5-minute interval completes, refresh aggregated data
      fetchDashboardData();
    };

    const onAlertCreated = (alert: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: [alert, ...prev.alerts.filter((a) => a.id !== alert.id)],
        };
      });
    };

    socket.on('METER_READING', onMeterReading);
    socket.on('ALERT_CREATED', onAlertCreated);
    socket.on('SIMULATION_RESUMED', fetchDashboardData);
    socket.on('SIMULATION_RESET', fetchDashboardData);

    // Gentle 15-second polling fallback
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      socket.off('METER_READING', onMeterReading);
      socket.off('ALERT_CREATED', onAlertCreated);
      socket.off('SIMULATION_RESUMED', fetchDashboardData);
      socket.off('SIMULATION_RESET', fetchDashboardData);
      clearInterval(interval);
    };
  }, [timeRange]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Building Digital Twin...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.current;
  const energy = data?.energy;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Building Overview Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Realtime building electrical consumption, counterfactual savings, and indoor environmental state
          </p>
        </div>

        {/* Time-Range Selector (Correction §6.3) */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start md:self-auto">
          {(['1h', '6h', '12h', '24h', '7d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === r
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards (Correction §6.2, §6.4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Building Consumption */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Consumption</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {energy?.consumptionKwh !== undefined ? energy.consumptionKwh.toFixed(2) : '0.00'}
            <span className="text-xs font-normal text-slate-400 ml-1">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total in {timeRange} window
          </div>
        </div>

        {/* 2. Energy Saved */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <span>Energy Saved</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Simulated
              </span>
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {energy?.savedKwh !== undefined ? energy.savedKwh.toFixed(2) : '0.00'}
            <span className="text-xs font-normal text-emerald-500 ml-1">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            In {timeRange} window • ₹{((energy?.savedKwh || 0) * 8.0).toFixed(1)} saved • {((energy?.savedKwh || 0) * 0.82).toFixed(1)}kg CO₂
          </div>
          <div className="text-[10px] text-slate-500 mt-1 italic">
            Counterfactual copy-room vacancy savings
          </div>
        </div>

        {/* 3. Total Occupancy */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Occupancy</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis?.occupancy ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">people</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {data?.rooms.length || 0} configured rooms
          </div>
        </div>

        {/* 4. Average CO2 */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Average CO₂</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis?.averageCo2Ppm !== null && kpis?.averageCo2Ppm !== undefined
              ? Math.round(kpis.averageCo2Ppm)
              : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">ppm</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {kpis?.averageCo2Ppm && kpis.averageCo2Ppm < 800 ? 'Good air quality' : 'Moderate ventilation'}
          </div>
        </div>

        {/* 5. Average Room Temp */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Room Temp</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis?.averageRoomTemperatureC !== null && kpis?.averageRoomTemperatureC !== undefined
              ? kpis.averageRoomTemperatureC.toFixed(1)
              : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Indoor average comfort
          </div>
        </div>

        {/* 6. Environmental Temp (Correction §6.4: Separate from Room Temp) */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Outdoor Temp</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis?.environmentalTemperatureC !== null && kpis?.environmentalTemperatureC !== undefined
              ? kpis.environmentalTemperatureC.toFixed(1)
              : '32.0'}
            <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
          </div>
          <div className="text-[11px] text-orange-400/80 mt-1">
            Environmental weather
          </div>
        </div>
      </div>

      {/* Main Grid: Energy Trend Chart + Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 columns) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                {chartMetric === 'power'
                  ? 'Building Load Profile'
                  : chartMetric === 'energy'
                  ? '5-Minute Metered Energy'
                  : 'Counterfactual Energy Saved'}
              </h2>
              <p className="text-xs text-slate-400">
                {chartMetric === 'power'
                  ? 'Average real power load (kW) across rooms for each 5-minute interval'
                  : chartMetric === 'energy'
                  ? 'Actual metered electrical consumption (kWh) per 5-minute interval'
                  : 'Simulated energy saved (kWh) via vacancy automation per 5-minute interval'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setChartMetric('power')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartMetric === 'power'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Power (kW)
                </button>
                <button
                  onClick={() => setChartMetric('energy')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartMetric === 'energy'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Energy (kWh)
                </button>
                <button
                  onClick={() => setChartMetric('savings')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartMetric === 'savings'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Savings (kWh)
                </button>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                {timeRange} window
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.trend && data.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartMetric === 'savings' ? '#06b6d4' : '#10b981'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartMetric === 'savings' ? '#06b6d4' : '#10b981'} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const point = payload[0].payload;
                      const timeStr = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                          <div className="text-slate-400 font-sans text-[11px] mb-1.5 border-b border-slate-800 pb-1">
                            Interval Ending: <span className="text-white font-semibold">{timeStr}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-400">
                            <span>Actual Load:</span>
                            <span>{Number(point.averagePowerKw || 0).toFixed(2)} kW ({Number(point.consumptionKwh || 0).toFixed(3)} kWh)</span>
                          </div>
                          {point.expectedKwh !== undefined && point.expectedKwh > 0 && (
                            <div className="flex justify-between gap-4 text-amber-400">
                              <span>Expected Baseline:</span>
                              <span>{Number(point.expectedKwh).toFixed(3)} kWh</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4 text-cyan-400">
                            <span>Energy Saved:</span>
                            <span>{Number(point.savedKwh || 0).toFixed(3)} kWh</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric === 'power' ? 'averagePowerKw' : chartMetric === 'energy' ? 'consumptionKwh' : 'savedKwh'}
                    name={chartMetric === 'power' ? 'Average Power (kW)' : chartMetric === 'energy' ? 'Consumption (kWh)' : 'Saved (kWh)'}
                    stroke={chartMetric === 'savings' ? '#06b6d4' : '#10b981'}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#consumptionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Accumulating 5-minute interval meter data...
              </div>
            )}
          </div>
        </div>

        {/* Active Alerts Panel */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Active Alerts</h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {data?.alerts.length || 0} active
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
            {data?.alerts && data.alerts.length > 0 ? (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span>{alert.roomName || 'Building'}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/30">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{alert.message}</p>
                  <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-xs">No active alerts</p>
                <p className="text-[10px] text-slate-600 mt-0.5">All building systems operating within optimal thresholds</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Summary Overview (Correction §6.5) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Configured Rooms</h2>
            <p className="text-xs text-slate-400">Live operational status across all building zones</p>
          </div>
          <button
            onClick={() => navigate('/rooms')}
            className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <span>View All Rooms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                    {room.floor}F
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-emerald-300 transition-colors">
                      {room.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">{room.deviceCount} devices registered</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      room.powerSupplyOn
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    Power {room.powerSupplyOn ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Metrics strip */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Occupancy</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5 font-mono">
                    {room.occupancyCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Temp</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5 font-mono">
                    {room.temperatureC.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Power</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5 font-mono">
                    {room.totalPowerW}W
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Saved</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5 font-mono">
                    {room.energySavedKwh.toFixed(2)} kWh
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Live Event Feed</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {data?.recentEvents?.length || 0}/20
            </span>
          </div>
          <span className="text-xs text-slate-400">Rolling FIFO log (last 20 events retained)</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {data?.recentEvents && data.recentEvents.length > 0 ? (
            data.recentEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold">
                    {e.eventType}
                  </span>
                  <span className="text-slate-300">
                    {e.payload?.reason || e.payload?.message || `Event generated by ${e.source}`}
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">Awaiting events from simulation...</p>
          )}
        </div>
      </div>
    </div>
  );
}
