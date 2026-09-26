import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DoorOpen,
  Plus,
  Power,
  Users,
  Thermometer,
  Wind,
  Zap,
  TrendingDown,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../../lib/api/client.js';
import { getSocket } from '../../lib/websocket/socket.js';

interface RoomItem {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  powerSupplyOn: boolean;
  occupancyCount: number;
  currentTemperature: number;
  currentHumidity: number;
  currentCo2: number;
  totalActivePowerW: number;
  energySavedKwh: number;
  deviceCount: number;
}

export function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomCapacity, setNewRoomCapacity] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await apiRequest<{ rooms: RoomItem[] }>('/rooms');
      setRooms(res.rooms || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onRoomCreated = () => fetchRooms();
    const onPowerChanged = () => fetchRooms();
    const onSimulationTick = () => fetchRooms();

    socket.on('ROOM_CREATED', onRoomCreated);
    socket.on('ROOM_POWER_ON', onPowerChanged);
    socket.on('ROOM_POWER_OFF', onPowerChanged);
    socket.on('SIMULATION_TICK', onSimulationTick);

    return () => {
      socket.off('ROOM_CREATED', onRoomCreated);
      socket.off('ROOM_POWER_ON', onPowerChanged);
      socket.off('ROOM_POWER_OFF', onPowerChanged);
      socket.off('SIMULATION_TICK', onSimulationTick);
    };
  }, []);

  const handleTogglePower = async (e: React.MouseEvent, room: RoomItem) => {
    e.stopPropagation(); // Don't trigger card navigation
    const action = room.powerSupplyOn ? 'off' : 'on';
    try {
      await apiRequest(`/rooms/${room.id}/power/${action}`, { method: 'POST', body: JSON.stringify({}) });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, powerSupplyOn: !r.powerSupplyOn } : r)),
      );
    } catch (err) {
      console.error(`Failed to turn ${action} room power:`, err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiRequest<{ success: boolean; room: any }>('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: newRoomName.trim(),
          floor: Number(newRoomFloor) || 1,
          capacity: Number(newRoomCapacity) || 30,
        }),
      });

      setIsModalOpen(false);
      setNewRoomName('');
      setNewRoomFloor(1);
      setNewRoomCapacity(30);
      await fetchRooms();

      // Navigate to the newly created room dashboard
      if (res?.room?.roomId) {
        navigate(`/rooms/${res.room.roomId}`);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Title & Add Room Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Building Rooms
          </h1>
          <p className="text-sm text-slate-400">
            Manage virtual rooms, master electrical power supply, and occupancy zones
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Room</span>
        </button>
      </div>

      {/* Room Cards Grid (Correction §7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => navigate(`/rooms/${room.id}`)}
            className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 group flex flex-col justify-between"
          >
            <div>
              {/* Header: Name, Floor, Power Switch */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm group-hover:bg-emerald-500/20 transition-colors">
                    {room.floor}F
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white group-hover:text-emerald-300 transition-colors">
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cap: {room.capacity} • {room.deviceCount} Devices
                    </p>
                  </div>
                </div>

                {/* Master Electrical Power Toggle Button (Correction §13) */}
                <button
                  onClick={(e) => handleTogglePower(e, room)}
                  title={`Turn room electrical power ${room.powerSupplyOn ? 'OFF' : 'ON'}`}
                  className={`p-2 rounded-xl transition-all border flex items-center space-x-1.5 ${
                    room.powerSupplyOn
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300'
                      : 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span className="text-[11px] font-bold">
                    {room.powerSupplyOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Live Sensor & State Metrics */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 mb-4 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>
                    Occupancy: <strong className="text-white font-mono">{room.occupancyCount}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Thermometer className="w-4 h-4 text-indigo-400" />
                  <span>
                    Temp: <strong className="text-white font-mono">{room.currentTemperature.toFixed(1)}°C</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Wind className="w-4 h-4 text-teal-400" />
                  <span>
                    CO₂: <strong className="text-white font-mono">{Math.round(room.currentCo2)} ppm</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>
                    Power: <strong className="text-white font-mono">{room.totalActivePowerW}W</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Energy Saved + Click to View */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{room.energySavedKwh.toFixed(2)} kWh saved</span>
              </div>
              <span className="flex items-center space-x-1 text-slate-400 group-hover:text-emerald-400 transition-colors">
                <span>View Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}

        {/* Empty state or Create Room Card */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="glass-card p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-3 min-h-[220px] group"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-300 group-hover:text-white">Create New Room</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Instantly instantiate a new virtual room with environmental sensors, meter, and zero devices
            </p>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Create Virtual Room</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conference Hall B, Room 103"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Floor Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Capacity (People)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automatic Initialization</span>
                </div>
                <p>New rooms start with power ON, 25°C baseline, virtual meter, and 0 devices.</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newRoomName.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
