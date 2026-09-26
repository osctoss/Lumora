import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  DoorOpen,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getSocket } from '../../lib/websocket/socket.js';
import { apiRequest } from '../../lib/api/client.js';

export function AppLayout() {
  const [isConnected, setIsConnected] = useState(false);
  const [simRunning, setSimRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTime, setSimTime] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const onTick = (data: any) => {
      const ts = data?.payload?.timestamp || data?.timestamp;
      if (ts) {
        const d = new Date(ts);
        setSimTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
      const clock = data?.payload?.clock || data?.clock;
      if (clock?.status) {
        setSimRunning(clock.status === 'RUNNING');
      }
      if (clock?.speedMultiplier) {
        setSimSpeed(clock.speedMultiplier);
      }
    };

    const onPaused = () => setSimRunning(false);
    const onResumed = () => setSimRunning(true);

    socket.on('SIMULATION_TICK', onTick);
    socket.on('SIMULATION_PAUSED', onPaused);
    socket.on('SIMULATION_RESUMED', onResumed);

    // Check initial clock status
    apiRequest('/simulation/state')
      .then((clock) => {
        if (clock) {
          setSimRunning(clock.status === 'RUNNING');
          setSimSpeed(clock.speedMultiplier || 1);
          if (clock.simulatedTime) {
            const d = new Date(clock.simulatedTime);
            setSimTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        }
      })
      .catch(() => {});

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('SIMULATION_TICK', onTick);
      socket.off('SIMULATION_PAUSED', onPaused);
      socket.off('SIMULATION_RESUMED', onResumed);
    };
  }, []);

  const handleToggleSimulation = async () => {
    try {
      if (simRunning) {
        setSimRunning(false);
        await apiRequest('/simulation/pause', { method: 'POST', body: '{}' });
      } else {
        setSimRunning(true);
        await apiRequest('/simulation/resume', { method: 'POST', body: '{}' });
      }
    } catch (err) {
      console.error('Failed to toggle simulation:', err);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    try {
      setSimSpeed(speed);
      await apiRequest('/simulation/speed', {
        method: 'POST',
        body: JSON.stringify({ speed, speedMultiplier: speed }),
      });
    } catch (err) {
      console.error('Failed to set speed:', err);
    }
  };

  const handleReset = async () => {
    try {
      setSimRunning(true);
      setSimSpeed(1);
      const state = await apiRequest('/simulation/reset', { method: 'POST', body: '{}' });
      if (state?.simulatedTime) {
        const d = new Date(state.simulatedTime);
        setSimTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Lumora
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Digital Twin
                </span>
              </div>
              <p className="text-xs text-slate-400">Smart Building Energy Operating System</p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Building Dashboard</span>
            </NavLink>

            <NavLink
              to="/rooms"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <DoorOpen className="w-4 h-4" />
              <span>Rooms</span>
            </NavLink>
          </nav>
        </div>

        {/* Live Simulation Control Bar */}
        <div className="flex items-center space-x-3">
          {/* Realtime clock & status */}
          <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              ></span>
            </span>
            <span className="text-slate-400 font-mono">
              {simTime || '09:00:00 AM'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-medium">
              {simRunning ? `${simSpeed}x Speed` : 'Paused'}
            </span>
          </div>

          {/* Controls: Play/Pause, Speeds, Reset */}
          <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={handleToggleSimulation}
              title={simRunning ? 'Pause simulation' : 'Resume simulation'}
              className={`p-1.5 rounded-md transition-colors ${
                simRunning
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-emerald-400" />}
            </button>

            {/* Speed Multipliers */}
            <div className="hidden md:flex items-center space-x-0.5">
              {[1, 2, 5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 text-xs rounded font-mono font-medium transition-all ${
                    simSpeed === s
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleReset}
              title="Reset simulation to 09:00 AM"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Lumora Smart Building Digital Twin</span>
          <span className="font-mono text-slate-600">Deterministic Realtime Simulation • PostgreSQL Persistent</span>
        </div>
      </footer>
    </div>
  );
}
