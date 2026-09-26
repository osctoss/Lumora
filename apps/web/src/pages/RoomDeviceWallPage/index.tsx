import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DoorOpen,
  Power,
  Users,
  UserPlus,
  UserMinus,
  Plus,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Lightbulb,
  Fan,
  Snowflake,
  Tv,
  X,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  Trash2,
  Shield,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../../lib/api/client.js';
import { getSocket } from '../../lib/websocket/socket.js';

interface VirtualRoomData {
  room: {
    id: string;
    name: string;
    floor: number;
    capacity: number;
    powerSupplyOn: boolean;
    occupancyState: string;
    acSetpointC: number;
  };
  sensors: {
    temperatureC: number;
    humidityPercent: number;
    co2Ppm: number;
    occupancy: number;
    ambientLux?: number;
    environmentalTemperatureC: number;
  };
  powerSupply: {
    isOn: boolean;
  };
  people: Array<{
    id: string;
    displayName: string;
    active: boolean;
  }>;
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
    isControllable: boolean;
  }>;
}

export function RoomDeviceWallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<VirtualRoomData | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Temperature state (0-50°C)
  const [manualTemp, setManualTemp] = useState<number>(24);
  const [tempUpdating, setTempUpdating] = useState(false);

  // Add Device modal state
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState('LED');
  const [newDevPower, setNewDevPower] = useState(36);
  const [newDevStandby, setNewDevStandby] = useState(0);

  // Add Person state
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [personName, setPersonName] = useState('');

  // Selected device for configuration popup
  const [selectedDevice, setSelectedDevice] = useState<VirtualRoomData['devices'][0] | null>(null);
  const [acSetpoint, setAcSetpoint] = useState<number>(24);

  const fetchVirtualRoom = async () => {
    if (!roomId) return;
    try {
      const res = await apiRequest<VirtualRoomData>(`/rooms/${roomId}/virtual`);
      setData(res);
      if (res.sensors?.temperatureC) {
        setManualTemp(Math.round(res.sensors.temperatureC));
      }
      if (res.room?.acSetpointC) {
        setAcSetpoint(res.room.acSetpointC);
      }
    } catch (err) {
      console.error('Failed to load virtual room:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirtualRoom();
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();

    const onTick = (tickData: any) => {
      if (tickData?.roomId === roomId) {
        fetchVirtualRoom();
      }
    };

    const onStateChange = () => fetchVirtualRoom();

    socket.on('SIMULATION_TICK', onTick);
    socket.on('DEVICE_STATE_CHANGED', onStateChange);
    socket.on('DEVICE_TURNED_ON', onStateChange);
    socket.on('DEVICE_TURNED_OFF', onStateChange);
    socket.on('PERSON_ADDED', onStateChange);
    socket.on('PERSON_REMOVED', onStateChange);
    socket.on('ROOM_POWER_ON', onStateChange);
    socket.on('ROOM_POWER_OFF', onStateChange);

    return () => {
      socket.off('SIMULATION_TICK', onTick);
      socket.off('DEVICE_STATE_CHANGED', onStateChange);
      socket.off('DEVICE_TURNED_ON', onStateChange);
      socket.off('DEVICE_TURNED_OFF', onStateChange);
      socket.off('PERSON_ADDED', onStateChange);
      socket.off('PERSON_REMOVED', onStateChange);
      socket.off('ROOM_POWER_ON', onStateChange);
      socket.off('ROOM_POWER_OFF', onStateChange);
    };
  }, [roomId]);

  const handleTogglePower = async () => {
    if (!data?.room) return;
    const action = data.room.powerSupplyOn ? 'off' : 'on';
    try {
      await apiRequest(`/rooms/${roomId}/power/${action}`, { method: 'POST', body: JSON.stringify({}) });
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to toggle room power:', err);
    }
  };

  const handleSetTemperature = async (tempVal: number) => {
    setTempUpdating(true);
    try {
      await apiRequest(`/rooms/${roomId}/temperature`, {
        method: 'POST',
        body: JSON.stringify({ temperatureC: tempVal }),
      });
      setManualTemp(tempVal);
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to set room temperature:', err);
    } finally {
      setTempUpdating(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/rooms/${roomId}/people`, {
        method: 'POST',
        body: JSON.stringify({ displayName: personName.trim() || undefined }),
      });
      setIsAddPersonOpen(false);
      setPersonName('');
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to add person:', err);
    }
  };

  const handleRemovePerson = async (personId: string) => {
    try {
      await apiRequest(`/rooms/${roomId}/people/${personId}`, {
        method: 'DELETE',
      });
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to remove person:', err);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/rooms/${roomId}/devices`, {
        method: 'POST',
        body: JSON.stringify({
          name: newDevName.trim() || `${newDevType} Device`,
          type: newDevType,
          ratedPowerW: Number(newDevPower) || 50,
          compressorOffPowerW: Number(newDevStandby) || 0,
        }),
      });
      setIsAddDeviceOpen(false);
      setNewDevName('');
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to add device:', err);
    }
  };

  const handleToggleDevice = async (device: VirtualRoomData['devices'][0]) => {
    const action = device.isPoweredOn && device.currentState !== 'OFF' ? 'off' : 'on';
    try {
      await apiRequest(`/devices/${device.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ roomId }),
      });
      await fetchVirtualRoom();
      if (selectedDevice && selectedDevice.id === device.id) {
        setSelectedDevice((prev) => (prev ? { ...prev, isPoweredOn: action === 'on' } : null));
      }
    } catch (err) {
      console.error(`Failed to turn ${action} device:`, err);
    }
  };

  const handleUpdateDeviceConfig = async () => {
    if (!selectedDevice) return;
    try {
      await apiRequest(`/devices/${selectedDevice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          roomId,
          name: selectedDevice.name,
          ratedPowerW: selectedDevice.ratedPowerW,
          standbyPowerW: selectedDevice.standbyPowerW,
          acSetpointC: selectedDevice.type === 'AC' ? acSetpoint : undefined,
        }),
      });
      setSelectedDevice(null);
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to update device config:', err);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await apiRequest(`/devices/${deviceId}`, {
        method: 'DELETE',
        body: JSON.stringify({ roomId }),
      });
      setSelectedDevice(null);
      await fetchVirtualRoom();
    } catch (err) {
      console.error('Failed to delete device:', err);
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
  const sensors = data?.sensors;
  const powerOn = room?.powerSupplyOn ?? true;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <button
            onClick={() => navigate(`/rooms/${roomId}`)}
            className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Room Dashboard</span>
          </button>
          <span>/</span>
          <span className="text-white font-medium">{room?.name} — Virtual Space</span>
        </div>

        {/* Master Power Toggle Button */}
        <button
          onClick={handleTogglePower}
          className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all self-start sm:self-auto ${
            powerOn
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
              : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>Room Power {powerOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Sensor Strip (Correction §10, §55) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Room Temp</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {sensors?.temperatureC !== undefined ? sensors.temperatureC.toFixed(1) : '--'}°C
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span>CO₂ Level</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {sensors?.co2Ppm !== undefined ? Math.round(sensors.co2Ppm) : '--'} ppm
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Humidity</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {sensors?.humidityPercent !== undefined ? Math.round(sensors.humidityPercent) : '--'}%
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Occupants</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {sensors?.occupancy ?? 0}
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Ambient Lux</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {sensors?.ambientLux ?? 500} lx
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Sun className="w-3.5 h-3.5 text-orange-400" />
            <span>Outdoor</span>
          </div>
          <div className="text-lg font-bold text-orange-300 font-mono">
            {sensors?.environmentalTemperatureC !== undefined
              ? sensors.environmentalTemperatureC.toFixed(1)
              : '32.0'}°C
          </div>
        </div>
      </div>

      {/* Controls Toolbar: Add Person, Manual Temp (0-50°C), Add Device */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* People Controls (Correction §19, §20) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddPersonOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Person</span>
          </button>

          {data?.people && data.people.length > 0 && (
            <button
              onClick={() => handleRemovePerson(data.people[data.people.length - 1].id)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 text-xs font-semibold transition-colors"
            >
              <UserMinus className="w-4 h-4" />
              <span>Remove Last Person</span>
            </button>
          )}
        </div>

        {/* Manual Temperature Setting (0–50°C range per Correction §18) */}
        <div className="flex items-center space-x-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1 text-xs text-slate-300 font-medium">
            <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Manual Temp:</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={manualTemp}
            onChange={(e) => setManualTemp(Number(e.target.value))}
            onMouseUp={() => handleSetTemperature(manualTemp)}
            onTouchEnd={() => handleSetTemperature(manualTemp)}
            className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="font-mono text-xs font-bold text-white w-8">
            {manualTemp}°C
          </span>
          <button
            onClick={() => handleSetTemperature(manualTemp)}
            disabled={tempUpdating}
            className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors"
          >
            {tempUpdating ? 'Setting...' : 'Apply'}
          </button>
        </div>

        {/* Add Device Button */}
        <button
          onClick={() => setIsAddDeviceOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Device</span>
        </button>
      </div>

      {/* People Floor Line (Correction §20) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Occupants Present on Floor ({data?.people.length || 0})</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Occupancy is driven by active person entities
          </span>
        </div>

        <div className="min-h-[60px] p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center gap-2">
          {data?.people && data.people.length > 0 ? (
            data.people.map((person) => (
              <div
                key={person.id}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-white animate-in zoom-in-95 group"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span>{person.displayName}</span>
                <button
                  onClick={() => handleRemovePerson(person.id)}
                  title="Remove person from room"
                  className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="w-full text-center text-xs text-slate-500 py-2">
              Room is vacant. Click <strong>Add Person</strong> to simulate occupancy.
            </div>
          )}
        </div>
      </div>

      {/* Virtual Device Wall (Correction §10, §24) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Device Wall & State Visualization</span>
            {!powerOn && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                Electrical Cutoff Active
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-400">Click any device to configure or toggle</span>
        </div>

        {data?.devices && data.devices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.devices.map((device) => {
              const isOperating = powerOn && device.isPoweredOn && device.currentState !== 'OFF';

              return (
                <div
                  key={device.id}
                  onClick={() => {
                    setSelectedDevice(device);
                    if (device.type === 'AC') {
                      setAcSetpoint(room?.acSetpointC || 24);
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                    isOperating
                      ? device.type === 'LED'
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : device.type === 'AC'
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon with state animation */}
                    <div
                      className={`p-3 rounded-xl transition-all ${
                        isOperating
                          ? device.type === 'LED'
                            ? 'bg-amber-500/20 text-amber-300 glow-cyan'
                            : device.type === 'FAN'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {device.type === 'AC' ? (
                        <Snowflake className={`w-6 h-6 ${isOperating ? 'animate-pulse' : ''}`} />
                      ) : device.type === 'FAN' ? (
                        <Fan className={`w-6 h-6 ${isOperating ? 'animate-spin' : ''}`} />
                      ) : device.type === 'LED' ? (
                        <Lightbulb className="w-6 h-6" />
                      ) : (
                        <Tv className="w-6 h-6" />
                      )}
                    </div>

                    {/* Quick Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDevice(device);
                      }}
                      disabled={!powerOn || device.isProtected}
                      title={device.isProtected ? 'Protected load' : 'Toggle state'}
                      className={`p-2 rounded-xl transition-colors ${
                        isOperating
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-300'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Device Info */}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h4 className="font-bold text-sm text-white truncate">{device.name}</h4>
                      {device.isProtected && (
                        <span title="Protected Load">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {device.ratedPowerW}W rated
                    </div>
                  </div>

                  {/* State badge & Power draw */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isOperating
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isOperating ? device.currentState : 'OFF'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {isOperating ? `${device.currentPowerW}W` : '0W'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-10 rounded-2xl border-2 border-dashed border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No devices added yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Add an LED, Fan, AC, Freezer, or generic equipment to start simulating load physics and savings
              </p>
            </div>
            <button
              onClick={() => setIsAddDeviceOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
            >
              Add First Device
            </button>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add Device to Room</h3>
              <button
                onClick={() => setIsAddDeviceOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Device Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LED', 'FAN', 'AC', 'FREEZER'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setNewDevType(t);
                        if (t === 'LED') setNewDevPower(36);
                        else if (t === 'FAN') setNewDevPower(65);
                        else if (t === 'AC') {
                          setNewDevPower(1800);
                          setNewDevStandby(45);
                        } else if (t === 'FREEZER') {
                          setNewDevPower(350);
                          setNewDevStandby(15);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                        newDevType === t
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Master ${newDevType}`}
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Rated Power (W)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newDevPower}
                    onChange={(e) => setNewDevPower(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {(newDevType === 'AC' || newDevType === 'FREEZER') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Standby / Comp OFF (W)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={newDevStandby}
                      onChange={(e) => setNewDevStandby(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {isAddPersonOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add Person</h3>
              <button
                onClick={() => setIsAddPersonOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  placeholder={`Person ${(data?.people.length || 0) + 1}`}
                  value={personName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Configuration Modal (Correction §25, §26) */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedDevice.name}</h3>
                <span className="text-xs text-slate-400 font-mono uppercase">{selectedDevice.type} Configuration</span>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Device Name
                </label>
                <input
                  type="text"
                  value={selectedDevice.name}
                  onChange={(e) => setSelectedDevice({ ...selectedDevice, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Rated Power (W)
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedDevice.ratedPowerW}
                  onChange={(e) =>
                    setSelectedDevice({ ...selectedDevice, ratedPowerW: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* AC Setpoint Configuration (Correction §26: 18°C <= Setpoint <= 28°C) */}
              {selectedDevice.type === 'AC' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-medium text-slate-300">AC Cooling Setpoint</span>
                    <span className="font-mono font-bold text-emerald-400">{acSetpoint}°C</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="28"
                    step="1"
                    value={acSetpoint}
                    onChange={(e) => setAcSetpoint(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>18°C (Max Cooling)</span>
                    <span>28°C (Eco)</span>
                  </div>
                </div>
              )}

              {/* Standby / Comp OFF power for AC/Freezer */}
              {(selectedDevice.type === 'AC' || selectedDevice.type === 'FREEZER') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Compressor-OFF Rated Power (W)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedDevice.standbyPowerW}
                    onChange={(e) =>
                      setSelectedDevice({ ...selectedDevice, standbyPowerW: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteDevice(selectedDevice.id)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Device</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateDeviceConfig}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
