import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Activity,
  Zap,
  Building2,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Lock,
  Power,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Radio,
  UserPlus,
  UserMinus,
  Bot,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import type { DeviceDto, DeviceState } from '@intellisave/shared';

interface TelemetryPoint {
  time: string;
  actualPower: number;
  expectedPower: number;
  temp: number;
  co2: number;
}

interface ActivityEvent {
  id: string;
  time: string;
  title: string;
  desc: string;
  type: 'automation' | 'alert' | 'user' | 'scenario';
}

interface AiExplanation {
  summary: string;
  rootCause: string;
  recommendedAction: string;
  financialImpact: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rooms' | 'savings' | 'settings'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [simRunning, setSimRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  // AI Explainer Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // What-If Calculator State
  const [whatIfTemp, setWhatIfTemp] = useState(25);
  const [whatIfDelay, setWhatIfDelay] = useState(120);

  // Live Simulation Room State
  const [metrics, setMetrics] = useState({
    temperature: 24.1,
    humidity: 52.0,
    co2: 640.0,
    ambientLight: 520,
    occupancyDetected: true,
    peopleCount: 15,
    occupancyState: 'OCCUPIED' as 'OCCUPIED' | 'VACANCY_PENDING' | 'VACANT',
    totalActivePowerW: 1610,
    totalExpectedPowerW: 1610,
    unaccountedPowerW: 0,
    comfortScore: 95.0,
    voltageV: 230.1,
    powerFactor: 0.95,
  });

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [savings, setSavings] = useState({
    todayKwh: 23.4,
    todayInr: 187.2,
    todayCo2: 19.18,
    activeSessions: 1,
  });

  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: 'ev-1',
      time: '09:00:00',
      title: 'Simulation Loop Online',
      desc: '1Hz physical differential equation engine active',
      type: 'automation',
    },
    {
      id: 'ev-2',
      time: '09:00:05',
      title: 'Comfort Engine Synchronized',
      desc: 'ASHRAE-55 index tracking Room 101 indoor air quality',
      type: 'automation',
    },
  ]);

  const socketRef = useRef<Socket | null>(null);

  // ─── Initial Data Fetch & Socket Connection ────────────────────────
  useEffect(() => {
    // 1. Fetch initial room state and devices
    fetch('/api/rooms/room-101')
      .then((res) => res.json())
      .then((data) => {
        if (data.state) {
          setMetrics((prev) => ({
            ...prev,
            temperature: data.state.temperatureC,
            humidity: data.state.humidityPct,
            co2: data.state.co2Ppm,
            ambientLight: data.state.ambientLightLux,
            occupancyState: data.state.occupancyState,
            occupancyDetected: data.state.occupancyCount > 0,
            peopleCount: data.state.occupancyCount,
            totalActivePowerW: Math.round(data.state.totalPowerKw * 1000),
            totalExpectedPowerW: Math.round(data.state.expectedRegisteredPowerKw * 1000),
            unaccountedPowerW: Math.round(data.state.unaccountedPowerKw * 1000),
            comfortScore: data.state.comfortScore || 95,
          }));
        }
        if (data.devices) {
          setDevices(data.devices);
        }
      })
      .catch((err) => console.warn('Could not fetch room initial state:', err));

    // Fetch initial savings
    fetch('/api/savings')
      .then((res) => res.json())
      .then((data) => {
        setSavings({
          todayKwh: data.totalSavingsKwh || 23.4,
          todayInr: data.totalCostSavedInr || 187.2,
          todayCo2: data.totalCo2SavedKg || 19.18,
          activeSessions: data.activeSessionsCount || 0,
        });
      })
      .catch((err) => console.warn('Could not fetch savings:', err));

    // 2. Connect Socket.IO
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:room', 'room-101');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle SIMULATION_TICK
    socket.on('SIMULATION_TICK', (event: any) => {
      const m = event.payload?.metrics;
      if (!m) return;

      setMetrics((prev) => ({
        ...prev,
        temperature: m.temperature,
        humidity: m.humidity,
        co2: m.co2,
        ambientLight: m.ambientLight,
        occupancyDetected: m.occupancyDetected,
        peopleCount: m.peopleCount,
        occupancyState: m.occupancyState,
        totalActivePowerW: Math.round(m.totalActivePowerW),
        totalExpectedPowerW: Math.round(m.totalExpectedPowerW),
        unaccountedPowerW: Math.round(m.unaccountedPowerW),
        comfortScore: m.comfortScore,
        voltageV: m.voltageV,
        powerFactor: m.powerFactor,
      }));

      // Append to telemetry sparkline history (max 25 points)
      setHistory((prev) => {
        const timeStr = new Date(event.timestamp).toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const next = [
          ...prev,
          {
            time: timeStr,
            actualPower: Math.round(m.totalActivePowerW),
            expectedPower: Math.round(m.totalExpectedPowerW),
            temp: m.temperature,
            co2: m.co2,
          },
        ];
        return next.slice(-25);
      });
    });

    // Handle DEVICE_STATE_CHANGED
    socket.on('DEVICE_STATE_CHANGED', (event: any) => {
      const { deviceId, newState, powerW, reason } = event.payload || {};
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                currentState: newState,
                isPoweredOn: newState !== 'OFF',
                currentPowerW: powerW ?? d.currentPowerW,
              }
            : d,
        ),
      );

      const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          title: `Device ${deviceId} -> ${newState}`,
          desc: reason || 'State changed by automation engine',
          type: 'automation',
        },
        ...prev.slice(0, 20),
      ]);
    });

    // Handle SCENARIO_TRIGGERED
    socket.on('SCENARIO_TRIGGERED', (event: any) => {
      const { scenario, description } = event.payload || {};
      setActiveScenario(scenario);
      const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          title: `Scenario: ${scenario}`,
          desc: description,
          type: 'scenario',
        },
        ...prev.slice(0, 20),
      ]);
    });

    // Handle ANOMALY_DETECTED
    socket.on('ANOMALY_DETECTED', (event: any) => {
      const { message } = event.payload || {};
      const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          title: `Anomaly Alert`,
          desc: message,
          type: 'alert',
        },
        ...prev.slice(0, 20),
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ─── Control Handlers ──────────────────────────────────────────────
  const toggleSimulation = async () => {
    const endpoint = simRunning ? '/api/simulation/pause' : '/api/simulation/resume';
    await fetch(endpoint, { method: 'POST' });
    setSimRunning(!simRunning);
  };

  const changeSpeed = async (speed: number) => {
    await fetch('/api/simulation/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    });
    setSimSpeed(speed);
  };

  const resetSimulation = async () => {
    await fetch('/api/simulation/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'RESET_ROOM', roomId: 'room-101' }),
    });
    setActiveScenario(null);
  };

  const triggerScenario = async (name: string, params?: Record<string, unknown>) => {
    setActiveScenario(name);
    await fetch('/api/simulation/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: name, roomId: 'room-101', params }),
    });
  };

  const toggleDevice = async (device: DeviceDto) => {
    if (device.isProtected) return;
    const targetState: DeviceState = device.currentState === 'OFF' ? 'ON' : 'OFF';
    await fetch(`/api/devices/${device.id}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: targetState,
        roomId: 'room-101',
        reason: 'Manual dashboard toggle',
      }),
    });
  };

  const changeOccupancyCount = async (delta: number) => {
    const newCount = Math.max(0, metrics.peopleCount + delta);
    await fetch('/api/rooms/room-101/occupancy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: newCount }),
    });
  };

  const requestAiExplanation = async (alertType: string = 'UNACCOUNTED_CONSUMPTION') => {
    setIsExplaining(true);
    setAiModalOpen(true);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType,
          details: {
            unaccountedPowerW: metrics.unaccountedPowerW || 350,
            wastePowerW: metrics.totalActivePowerW,
            co2Ppm: metrics.co2,
          },
        }),
      });
      const data = await res.json();
      setAiExplanation(data);
    } catch {
      setAiExplanation({
        summary: 'Smart building analyzer detected power discrepancy.',
        rootCause: 'Submeter reads higher than sum of registered active devices.',
        recommendedAction: 'Inspect physical sockets for unauthorized heating elements.',
        financialImpact: 'Estimated ₹2.80/hour avoidable consumption.',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  // What-if calculation derived values
  const projectedSavingsPct = Math.round((whatIfTemp - 23) * 6.5 + (whatIfDelay <= 120 ? 8 : 4));
  const projectedAnnualInr = Math.round(12500 * (projectedSavingsPct / 100) * 8.0);
  const projectedAnnualCo2 = Math.round(12500 * (projectedSavingsPct / 100) * 0.82);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between p-4 z-20">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                IntelliSave
              </h1>
              <p className="text-xs text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                AUTONOMOUS OPTIMIZATION
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="h-4 w-4" />
              Building Energy & Telemetry
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rooms'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Device Wall & Room 101
            </button>
            <button
              onClick={() => setActiveTab('savings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'savings'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Verified Savings Ledger
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Policy Engine & Tariffs
            </button>
          </nav>
        </div>

        {/* Real-time Gateway Health Status */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Radio className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              Socket.IO Gateway
            </span>
            <span className={`font-semibold text-[11px] ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConnected ? 'LIVE 1Hz' : 'CONNECTING'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Room 101 Subscribed</span>
            <span className="font-mono text-emerald-400">#room-101</span>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header & Simulation Controller */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              {activeTab === 'dashboard' && 'Building Energy & Comfort Center'}
              {activeTab === 'rooms' && 'Interactive Digital Twin — Room 101'}
              {activeTab === 'savings' && 'Verified Counterfactual Energy Savings'}
              {activeTab === 'settings' && 'System Rules & Automation Policy Engine'}
            </h2>
            {activeScenario && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Scenario: {activeScenario}
              </span>
            )}
          </div>

          {/* Interactive Simulation Toolbar */}
          <div className="flex items-center gap-3">
            {metrics.unaccountedPowerW > 0 && (
              <button
                onClick={() => requestAiExplanation('UNACCOUNTED_CONSUMPTION')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all animate-bounce"
              >
                <Bot className="h-3.5 w-3.5" /> Explain Anomaly
              </button>
            )}

            <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 shadow-lg text-xs">
              <button
                onClick={toggleSimulation}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  simRunning
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-amber-500 text-slate-950 font-semibold'
                }`}
              >
                {simRunning ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                {simRunning ? 'Running' : 'Paused'}
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {[1, 5, 10, 30].map((speed) => (
                <button
                  key={speed}
                  onClick={() => changeSpeed(speed)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-all ${
                    simSpeed === speed
                      ? 'bg-slate-700 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                onClick={resetSimulation}
                title="Reset simulation to baseline"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Cards (Always visible for real-time awareness) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Real-Time Power Card */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Real-Time Power Draw</span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-100 mt-2 flex items-baseline gap-2">
                {metrics.totalActivePowerW}{' '}
                <span className="text-xs text-slate-400 font-normal">Watts</span>
              </div>
              <div className="text-xs mt-2 flex items-center justify-between font-medium">
                <span className="text-slate-400">Expected: {metrics.totalExpectedPowerW}W</span>
                {metrics.unaccountedPowerW > 0 ? (
                  <span className="text-rose-400 font-semibold animate-pulse">
                    +{metrics.unaccountedPowerW}W Ghost Load
                  </span>
                ) : (
                  <span className="text-emerald-400">Zero Ghost Load</span>
                )}
              </div>
            </div>

            {/* Occupancy Status Card with direct +/- incrementers */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Room Occupancy State</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeOccupancyCount(-1)}
                    title="Remove 1 person"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <UserMinus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => changeOccupancyCount(1)}
                    title="Add 1 person"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <UserPlus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 flex items-center gap-2">
                {metrics.occupancyState === 'OCCUPIED' && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    OCCUPIED
                  </span>
                )}
                {metrics.occupancyState === 'VACANCY_PENDING' && (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                    VACANCY PENDING
                  </span>
                )}
                {metrics.occupancyState === 'VACANT' && (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    CONFIRMED VACANT
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>{metrics.peopleCount} occupants in room</span>
                <span className="text-[11px] text-emerald-400 font-mono">PIR+mmWave</span>
              </div>
            </div>

            {/* Verified Savings Card */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Today's Verified Savings</span>
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 flex items-baseline gap-2">
                ₹{savings.todayInr.toFixed(2)}
                <span className="text-xs text-slate-400 font-normal">({savings.todayKwh.toFixed(1)} kWh)</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>Avoided Carbon:</span>
                <span className="text-emerald-400 font-semibold">{savings.todayCo2.toFixed(1)} kg CO₂</span>
              </div>
            </div>

            {/* ASHRAE Comfort Score Card */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>ASHRAE-55 Comfort Score</span>
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-3xl font-extrabold text-cyan-400 mt-2 flex items-baseline gap-2">
                {metrics.comfortScore.toFixed(1)}{' '}
                <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>{metrics.temperature}°C</span>
                <span>•</span>
                <span>{metrics.humidity}% RH</span>
                <span>•</span>
                <span>{metrics.co2} ppm</span>
              </div>
            </div>
          </div>

          {/* Scenario Injection Bar (Instant Hackathon Demonstration Controls) */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                Live Scenario Injection Engine (One-Click Edge Case Testing)
              </span>
              <span className="text-xs text-slate-400">Clicking triggers physical equations in backend</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                onClick={() => triggerScenario('ROOM_EMPTY')}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 transition-all text-slate-200"
              >
                🚪 Room Empties
              </button>
              <button
                onClick={() => triggerScenario('HIGH_HEAT')}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-orange-500/20 hover:text-orange-300 border border-slate-700/60 hover:border-orange-500/40 transition-all text-slate-200"
              >
                ☀️ 41.5°C Heat Wave
              </button>
              <button
                onClick={() => triggerScenario('HIGH_CO2')}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-purple-500/20 hover:text-purple-300 border border-slate-700/60 hover:border-purple-500/40 transition-all text-slate-200"
              >
                👥 CO₂ Surge (Crowd)
              </button>
              <button
                onClick={() => triggerScenario('UNREGISTERED_LOAD', { watts: 350 })}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-all text-slate-200"
              >
                ⚠️ +350W Ghost Load
              </button>
              <button
                onClick={() => triggerScenario('RESET_ROOM')}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/40 transition-all text-slate-200"
              >
                🔄 Restore Baseline
              </button>
            </div>
          </div>

          {/* TAB 1: Building Overview & Real-Time Telemetry */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Telemetry Visualizer / Chart */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Live Power & Baseline Stream</h3>
                    <p className="text-xs text-slate-400">Comparing actual metered power (W) vs registered demand</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Metered Power
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> Expected Registered
                    </span>
                  </div>
                </div>

                {/* SVG Realtime Sparkline */}
                <div className="h-48 w-full bg-slate-900/80 rounded-xl p-4 border border-slate-800 relative flex flex-col justify-end">
                  <div className="absolute top-3 left-4 text-[10px] text-slate-500 font-mono">
                    VOLTAGE: {metrics.voltageV}V | PF: {metrics.powerFactor}
                  </div>
                  {history.length > 1 ? (
                    <svg className="w-full h-36 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeDasharray="2" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeDasharray="2" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" strokeDasharray="2" strokeWidth="0.5" />

                      {/* Actual Power Line */}
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        points={history
                          .map((pt, idx) => {
                            const x = (idx / (history.length - 1)) * 100;
                            const y = Math.max(5, 100 - (pt.actualPower / 2500) * 90);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />

                      {/* Expected Power Line */}
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        points={history
                          .map((pt, idx) => {
                            const x = (idx / (history.length - 1)) * 100;
                            const y = Math.max(5, 100 - (pt.expectedPower / 2500) * 90);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                      Collecting physical simulation ticks...
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-1 border-t border-slate-800">
                    <span>{history[0]?.time || '00:00:00'}</span>
                    <span>Live 1Hz Stream</span>
                    <span>{history[history.length - 1]?.time || '00:00:00'}</span>
                  </div>
                </div>

                {/* 4 Environmental Sensor Meters */}
                <div className="grid grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-rose-400" /> Temperature
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{metrics.temperature}°C</div>
                    <div className="text-[10px] text-slate-500">Target: 24.0°C</div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5 text-cyan-400" /> Humidity
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{metrics.humidity}%</div>
                    <div className="text-[10px] text-slate-500">Ideal: 35-60%</div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Wind className="h-3.5 w-3.5 text-emerald-400" /> CO₂ Air Quality
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{metrics.co2} ppm</div>
                    <div className="text-[10px] text-slate-500">Clean: &lt;800 ppm</div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-amber-400" /> Ambient Lux
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{metrics.ambientLight} lx</div>
                    <div className="text-[10px] text-slate-500">Target: 500 lx</div>
                  </div>
                </div>
              </div>

              {/* Event Timeline / Audit Trail */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Autonomous Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time decisions taken by IntelliSave</p>

                  <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1 transition-all hover:border-slate-700"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span>{ev.time}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold uppercase ${
                              ev.type === 'alert'
                                ? 'bg-rose-500/20 text-rose-300'
                                : ev.type === 'scenario'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {ev.type}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-200">{ev.title}</div>
                        <div className="text-slate-400 leading-relaxed text-[11px]">{ev.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Device Wall & Digital Twin Room */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">Room 101 — Smart Classroom Device Wall</h3>
                  <p className="text-xs text-slate-400">
                    Interact directly with individual equipment or observe autonomous policy shutoffs
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 2 Protected Loads Locked
                  </span>
                </div>
              </div>

              {/* Grid of Devices */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={`rounded-2xl border p-5 transition-all relative overflow-hidden ${
                      device.isPoweredOn
                        ? 'bg-slate-900/80 border-slate-700/80 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{device.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 capitalize">{device.type.toLowerCase()}</span>
                      </div>

                      {device.isProtected ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          <Lock className="h-3 w-3" /> PROTECTED
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleDevice(device)}
                          className={`p-1.5 rounded-xl border transition-all ${
                            device.isPoweredOn
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                          title={device.isPoweredOn ? 'Switch OFF' : 'Switch ON'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Middle specs */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-extrabold text-slate-100 font-mono">
                          {device.currentPowerW} <span className="text-xs text-slate-400 font-normal">W</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Rated: {device.ratedPowerW}W</div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                            device.currentState === 'OFF'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {device.currentState}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">Priority #{device.priority || 1}</div>
                      </div>
                    </div>

                    {/* Policy metadata */}
                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Vacancy Auto-Shutoff:</span>
                      <span className={device.isProtected ? 'text-cyan-400 font-medium' : 'text-emerald-400 font-medium'}>
                        {device.isProtected ? 'Bypassed (Critical)' : 'Enabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Verified Savings Ledger & What-If Optimizer */}
          {activeTab === 'savings' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
                <h3 className="text-base font-semibold text-slate-100">Counterfactual Ledger & Methodology</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Unlike naive baselines, IntelliSave proves every watt saved by calculating the counterfactual load
                  that would have run continuously had our autonomous vacancy shutoff not intervened.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400">Total Energy Avoided Today</span>
                    <div className="text-2xl font-bold text-emerald-400">{savings.todayKwh.toFixed(2)} kWh</div>
                    <p className="text-[11px] text-slate-500">Equivalent to running a 1.5T AC for ~16 hours</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400">Total Financial Savings</span>
                    <div className="text-2xl font-bold text-emerald-400">₹{savings.todayInr.toFixed(2)}</div>
                    <p className="text-[11px] text-slate-500">Calculated at commercial tariff ₹8.00 / kWh</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400">Avoided Scope 2 GHG Emissions</span>
                    <div className="text-2xl font-bold text-cyan-400">{savings.todayCo2.toFixed(2)} kg CO₂</div>
                    <p className="text-[11px] text-slate-500">Based on national grid factor 0.82 kg CO₂/kWh</p>
                  </div>
                </div>
              </div>

              {/* What-If Scenario Projection Engine */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-emerald-400" />
                      Interactive What-If Simulation Calculator
                    </h3>
                    <p className="text-xs text-slate-400">Project annual ROI by adjusting temperature setpoints and vacancy timers</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
                    +{projectedSavingsPct}% Total Efficiency
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Target Cooling Setpoint:</span>
                        <span className="font-bold text-emerald-400">{whatIfTemp}°C</span>
                      </div>
                      <input
                        type="range"
                        min="21"
                        max="27"
                        step="1"
                        value={whatIfTemp}
                        onChange={(e) => setWhatIfTemp(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-800"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>21°C (Overcooled)</span>
                        <span>24°C (ASHRAE Ideal)</span>
                        <span>27°C (Warm)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Vacancy Confirmation Delay:</span>
                        <span className="font-bold text-cyan-400">{whatIfDelay} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="300"
                        step="30"
                        value={whatIfDelay}
                        onChange={(e) => setWhatIfDelay(Number(e.target.value))}
                        className="w-full accent-cyan-500 bg-slate-800"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>60s (Aggressive)</span>
                        <span>180s (Balanced)</span>
                        <span>300s (Conservative)</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-200">Projected Annual Institutional Impact</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500">Annual Cost Saved</div>
                        <div className="text-xl font-bold text-emerald-400">₹{projectedAnnualInr.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Avoided GHG Emissions</div>
                        <div className="text-xl font-bold text-cyan-400">{projectedAnnualCo2.toLocaleString()} kg</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Policy & System Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl glass-card rounded-2xl p-6 border border-slate-800/80 space-y-6">
              <h3 className="text-base font-semibold text-slate-100">Building Automation Policies</h3>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Vacancy Confirmation Grace Period</div>
                    <div className="text-slate-400">Delay before entering confirmed vacant shutoff</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">300 seconds (5 min)</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Commercial Electricity Tariff</div>
                    <div className="text-slate-400">Energy accounting billing multiplier</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">₹8.00 / kWh</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Grid Carbon Factor</div>
                    <div className="text-slate-400">GHG intensity coefficient</div>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold">0.82 kg CO₂ / kWh</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Target Comfort Setpoint</div>
                    <div className="text-slate-400">Thermostat baseline for classroom cooling</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">24.0°C</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI Root Cause Explainer Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">IntelliSave AI Diagnostics</h3>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {isExplaining ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono animate-pulse">
                Analyzing submeter discrepancies and physics model...
              </div>
            ) : (
              aiExplanation && (
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="font-semibold text-slate-300">Summary:</span>
                    <p className="text-slate-400 mt-1">{aiExplanation.summary}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="font-semibold text-slate-300">Root Cause:</span>
                    <p className="text-slate-400 mt-1">{aiExplanation.rootCause}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                    <span className="font-semibold text-emerald-400">Recommended Action:</span>
                    <p className="text-slate-300 mt-1">{aiExplanation.recommendedAction}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                    <span className="font-semibold text-amber-400">Financial Impact:</span>
                    <p className="text-slate-300 mt-1">{aiExplanation.financialImpact}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
