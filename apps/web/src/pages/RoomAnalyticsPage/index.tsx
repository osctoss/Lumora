import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DoorOpen,
  Power,
  TrendingDown,
  Zap,
  Users,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  Tv,
  Fan,
  Lightbulb,
  Snowflake,
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

interface RoomDashboardData {
  room: {
    id: string;
    name: string;
    floor: number;
    capacity: number;
    powerSupplyOn: boolean;
    occupancyState: string;
    deviceCount: number;
  };
  range: { start: string; end: string };
  energy: {
    consumptionKwh: number;
    savedKwh: number;
    expectedKwh?: number;
    unaccountedKwh?: number;
  };
  current: {
    occupancy: number;
    temperatureC: number;
    humidityPercent: number;
    co2Ppm: number;
    ambientLux?: number;
    environmentalTemperatureC: number;
    currentPowerW?: number;
  };
  devices: Array<{
    id: string;
    name: string;
    type: string;
    currentState: string;
    isPoweredOn: boolean;
    currentPowerW: number;
    ratedPowerW: number;
    standbyPowerW: number;
    isProtected: boolean;
  }>;
  alerts: Array<{
    id: string;
    roomId: string;
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
  trend: Array<{
    timestamp: string;
    consumptionKwh: number;
    averagePowerW: number;
  }>;
}

export function RoomAnalyticsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RoomDashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);

  const fetchRoomData = async () => {
    if (!roomId) return;
    try {
      const now = new Date();
      let startMs = 24 * 60 * 60 * 1000;
      if (timeRange === '1h') startMs = 1 * 60 * 60 * 1000;
      else if (timeRange === '6h') startMs = 6 * 60 * 60 * 1000;
      else if (timeRange === '12h') startMs = 12 * 60 * 60 * 1000;
      else if (timeRange === '7d') startMs = 7 * 24 * 60 * 60 * 1000;

      const startDate = new Date(now.getTime() - startMs).toISOString();
      const res = await apiRequest<RoomDashboardData>(`/rooms/${roomId}/dashboard?start=${startDate}&end=${now.toISOString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load room dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 10000);
    return () => clearInterval(interval);
  }, [roomId, timeRange]);

  useEffect(() => {
    const socket = getSocket();

    const onTick = () => fetchRoomData();
    const onMeter = () => fetchRoomData();

    socket.on('SIMULATION_TICK', onTick);
    socket.on('METER_READING', onMeter);

    return () => {
      socket.off('SIMULATION_TICK', onTick);
      socket.off('METER_READING', onMeter);
    };
  }, [roomId]);

  const handleTogglePower = async () => {
    if (!data?.room) return;
    const action = data.room.powerSupplyOn ? 'off' : 'on';
    try {
      await apiRequest(`/rooms/${roomId}/power/${action}`, { method: 'POST', body: JSON.stringify({}) });
      setData((prev) =>
        prev
          ? {
              ...prev,
              room: { ...prev.room, powerSupplyOn: !prev.room.powerSupplyOn },
            }
          : prev,
      );
    } catch (err) {
      console.error('Failed to toggle power:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const room = data?.room;
  const current = data?.current;
  const energy = data?.energy;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <button
          onClick={() => navigate('/rooms')}
          className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Rooms</span>
        </button>
        <span>/</span>
        <span className="text-white font-medium">{room?.name || 'Room Details'}</span>
      </div>

      {/* Room Header with "Go to Room" button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            {room?.floor}F
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{room?.name}</h1>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  room?.powerSupplyOn
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/40 text-red-400'
                }`}
              >
                Electrical Power {room?.powerSupplyOn ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Capacity: {room?.capacity} people • {room?.deviceCount} registered devices
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Power toggle */}
          <button
            onClick={handleTogglePower}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
              room?.powerSupplyOn
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Power {room?.powerSupplyOn ? 'Cut' : 'Restore'}</span>
          </button>

          {/* CRITICAL: "Go to Room" Button (Correction §8, §54) */}
          <button
            onClick={() => navigate(`/rooms/${roomId}/virtual`)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <span>Go to Room</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Room Energy Consumption */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Room Energy</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {energy?.consumptionKwh !== undefined ? energy.consumptionKwh.toFixed(2) : '0.00'}
            <span className="text-xs font-normal text-slate-400 ml-1">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active: {current?.currentPowerW ?? 0}W
          </div>
        </div>

        {/* Room Energy Saved */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Energy Saved</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {energy?.savedKwh !== undefined ? energy.savedKwh.toFixed(2) : '0.00'}
            <span className="text-xs font-normal text-emerald-500 ml-1">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ₹{((energy?.savedKwh || 0) * 8.0).toFixed(1)} saved
          </div>
        </div>

        {/* Occupancy */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Occupancy</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {current?.occupancy ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">people</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Status: {room?.occupancyState || 'VACANT'}
          </div>
        </div>

        {/* Temperature */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Temperature</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {current?.temperatureC !== undefined ? current.temperatureC.toFixed(1) : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Outdoor: {current?.environmentalTemperatureC?.toFixed(1) ?? '32.0'}°C
          </div>
        </div>

        {/* Humidity */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Humidity</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {current?.humidityPercent !== undefined ? Math.round(current.humidityPercent) : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Comfort range
          </div>
        </div>

        {/* CO2 */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">CO₂ Level</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {current?.co2Ppm !== undefined ? Math.round(current.co2Ppm) : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">ppm</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Physical indoor air quality
          </div>
        </div>
      </div>

      {/* Trend Chart & Registered Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Room Meter Consumption Trend</h2>
              <p className="text-xs text-slate-400">5-minute interval energy readings (kWh)</p>
            </div>
            {/* Time range buttons */}
            <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              {(['1h', '6h', '12h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    timeRange === r
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.trend && data.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roomConsumptionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(str) => new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  />
                  <Area
                    type="monotone"
                    dataKey="consumptionKwh"
                    name="Energy (kWh)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#roomConsumptionGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Accumulating 5-minute room meter intervals...
              </div>
            )}
          </div>
        </div>

        {/* Registered Devices Overview */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Registered Devices</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {data?.devices.length || 0} total
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-64 pr-1">
            {data?.devices && data.devices.length > 0 ? (
              data.devices.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-emerald-400">
                      {dev.type === 'AC' ? (
                        <Snowflake className="w-4 h-4" />
                      ) : dev.type === 'FAN' ? (
                        <Fan className="w-4 h-4" />
                      ) : dev.type === 'LED' ? (
                        <Lightbulb className="w-4 h-4" />
                      ) : (
                        <Tv className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{dev.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {dev.ratedPowerW}W rated
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dev.isPoweredOn
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {dev.currentState}
                    </span>
                    <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                      {dev.currentPowerW}W
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <p className="text-xs">No devices added yet</p>
                <button
                  onClick={() => navigate(`/rooms/${roomId}/virtual`)}
                  className="mt-2 text-xs text-emerald-400 hover:underline"
                >
                  Add devices in Virtual Room
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
