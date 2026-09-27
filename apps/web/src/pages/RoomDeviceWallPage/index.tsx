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
  Clock,
  Cpu,
  Plug,
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
    turnOnDelayMin?: number;
    turnOffDelayMin?: number;
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
          name: newDevName.trim() || `${newDevType === 'GENERIC' ? 'Other' : newDevType} Device`,
          type: newDevType,
          ratedPowerW: Number(newDevPower) || 50,
          compressorOffPowerW: Number(newDevStandby) || 0,
        }),
      });
      setIsAddDeviceOpen(false);
      setNewDevName('');
      setNewDevStandby(0);
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
          turnOnDelayMin: selectedDevice.turnOnDelayMin,
          turnOffDelayMin: selectedDevice.turnOffDelayMin,
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
                    const isProt = device.isProtected || device.type === 'FREEZER';
                    const defaultTurnOn = isProt ? undefined : (device.turnOnDelayMin !== undefined ? device.turnOnDelayMin : 0);
                    const defaultTurnOff = isProt
                      ? undefined
                      : (device.turnOffDelayMin !== undefined
                          ? device.turnOffDelayMin
                          : (device.type === 'AC' ? 10 : (device.type === 'LED' || device.type === 'TUBE_LIGHT' || device.type === 'FAN') ? 0 : 5));
                    setSelectedDevice({
                      ...device,
                      turnOnDelayMin: defaultTurnOn,
                      turnOffDelayMin: defaultTurnOff,
                    });
                    if (device.type === 'AC') {
                      setAcSetpoint(room?.acSetpointC || 24);
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                    isOperating
                      ? device.type === 'LED' || device.type === 'TUBE_LIGHT'
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : device.type === 'AC'
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : device.type === 'FAN'
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : device.type === 'FREEZER'
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon with state animation */}
                    <div
                      className={`p-3 rounded-xl transition-all ${
                        isOperating
                          ? device.type === 'LED' || device.type === 'TUBE_LIGHT'
                            ? 'bg-amber-500/20 text-amber-300 glow-cyan'
                            : device.type === 'FAN'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : device.type === 'AC'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : device.type === 'FREEZER'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {device.type === 'AC' ? (
                        <Snowflake className={`w-6 h-6 ${isOperating ? 'animate-pulse' : ''}`} />
                      ) : device.type === 'FAN' ? (
                        <Fan className={`w-6 h-6 ${isOperating ? 'animate-spin' : ''}`} />
                      ) : device.type === 'LED' || device.type === 'TUBE_LIGHT' ? (
                        <Lightbulb className="w-6 h-6" />
                      ) : device.type === 'FREEZER' ? (
                        <Shield className="w-6 h-6" />
                      ) : (
                        <Cpu className="w-6 h-6" />
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
                        <span title="Protected Load - Always ON">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                      <span>{device.ratedPowerW}W rated</span>
                      {device.isProtected || device.type === 'FREEZER' ? (
                        <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Protected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-750">
                          ON: {device.turnOnDelayMin === -1 ? 'Man' : (device.turnOnDelayMin || 0) === 0 ? 'Imm' : `${device.turnOnDelayMin}m`} • OFF: {device.turnOffDelayMin === -1 ? 'Man' : (device.turnOffDelayMin ?? (device.type === 'AC' ? 10 : 0)) === 0 ? 'Imm' : `${device.turnOffDelayMin ?? (device.type === 'AC' ? 10 : 0)}m`}
                        </span>
                      )}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'LED', label: 'LED Light', icon: Lightbulb, power: 36, standby: 0 },
                    { id: 'FAN', label: 'Ceiling Fan', icon: Fan, power: 65, standby: 0 },
                    { id: 'AC', label: 'Air Cond.', icon: Snowflake, power: 1800, standby: 45 },
                    { id: 'FREEZER', label: 'Freezer', icon: Shield, power: 350, standby: 15 },
                    { id: 'GENERIC', label: 'Other', icon: Cpu, power: 100, standby: 5 },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = newDevType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNewDevType(item.id);
                          setNewDevPower(item.power);
                          setNewDevStandby(item.standby);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newDevType === 'GENERIC'
                      ? 'e.g. Projector, Desktop PC, Water Dispenser'
                      : `e.g. Master ${newDevType}`
                  }
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
                {(newDevType === 'AC' || newDevType === 'FREEZER' || newDevType === 'GENERIC') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {newDevType === 'GENERIC' ? 'Standby / Idle (W)' : 'Standby / Comp OFF (W)'}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white">{selectedDevice.name}</h3>
                  {(selectedDevice.isProtected || selectedDevice.type === 'FREEZER') && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <Shield className="w-3 h-3" />
                      PROTECTED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono uppercase">
                  {selectedDevice.type === 'GENERIC' ? 'OTHER DEVICE' : selectedDevice.type} Configuration
                </span>
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

              {/* Standby / Comp OFF power for AC/Freezer/Other */}
              {(selectedDevice.type === 'AC' || selectedDevice.type === 'FREEZER' || selectedDevice.type === 'GENERIC') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {selectedDevice.type === 'AC' || selectedDevice.type === 'FREEZER'
                      ? 'Compressor-OFF Rated Power (W)'
                      : 'Standby / Idle Power (W)'}
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

              {/* Occupancy Automation Controls */}
              {selectedDevice.isProtected || selectedDevice.type === 'FREEZER' ? (
                /* Protected Load Banner */
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Protected Continuous Load</p>
                    <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                      This device is marked as a critical protected appliance (e.g. food/sample refrigeration). It cannot be automatically or manually turned OFF on occupancy or vacancy events to prevent spoilage or system disruption.
                    </p>
                  </div>
                </div>
              ) : (
                /* Configurable Occupancy Delay Controls */
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Occupancy Automation Timers</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Smart Savings
                    </span>
                  </div>

                  {/* Turn-ON Delay */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Turn ON when Person Enters (0 &rarr; &gt;0)</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        {selectedDevice.turnOnDelayMin === -1
                          ? 'Manual Only'
                          : (selectedDevice.turnOnDelayMin || 0) === 0
                          ? 'Immediate'
                          : `${selectedDevice.turnOnDelayMin} min`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {[
                        { label: 'Immediate', value: 0 },
                        { label: '2 min', value: 2 },
                        { label: '5 min', value: 5 },
                        { label: '10 min', value: 10 },
                        { label: '20 min', value: 20 },
                        { label: 'Manual Only', value: -1 },
                      ].map((opt) => {
                        const active =
                          (selectedDevice.turnOnDelayMin !== undefined ? selectedDevice.turnOnDelayMin : 0) === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSelectedDevice({ ...selectedDevice, turnOnDelayMin: opt.value })}
                            className={`py-2 px-1 text-center rounded-xl text-xs transition-all ${
                              active
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Turn-OFF Delay */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>Turn OFF when Person Leaves (Room Vacant)</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        {selectedDevice.turnOffDelayMin === -1
                          ? 'Manual Only'
                          : (selectedDevice.turnOffDelayMin ?? (selectedDevice.type === 'AC' ? 10 : 0)) === 0
                          ? 'Immediate'
                          : `${selectedDevice.turnOffDelayMin ?? (selectedDevice.type === 'AC' ? 10 : 0)} min`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {[
                        { label: 'Immediate', value: 0 },
                        { label: '2 min', value: 2 },
                        { label: '5 min', value: 5 },
                        { label: '10 min', value: 10 },
                        { label: '20 min', value: 20 },
                        { label: 'Manual Only', value: -1 },
                      ].map((opt) => {
                        const defaultOff =
                          selectedDevice.type === 'AC'
                            ? 10
                            : selectedDevice.type === 'LED' ||
                              selectedDevice.type === 'TUBE_LIGHT' ||
                              selectedDevice.type === 'FAN'
                            ? 0
                            : 5;
                        const currentVal =
                          selectedDevice.turnOffDelayMin !== undefined ? selectedDevice.turnOffDelayMin : defaultOff;
                        const active = currentVal === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSelectedDevice({ ...selectedDevice, turnOffDelayMin: opt.value })}
                            className={`py-2 px-1 text-center rounded-xl text-xs transition-all ${
                              active
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Informational Guidance Tip */}
                  {selectedDevice.type === 'AC' ? (
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                      <Snowflake className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-cyan-300">Intelligent AC Modulation: </span>
                        The AC powers on/off based on your selected delay timer. While powered ON, the compressor automatically cycles between cooling ({selectedDevice.ratedPowerW}W) and standby circulation ({selectedDevice.standbyPowerW || 45}W) to maintain {acSetpoint}°C.
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-emerald-200/90 text-[11px] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Energy Saver Tip:</strong> Setting Turn-OFF to <em>Immediate</em> or <em>2 min</em> eliminates vampire power when the room is empty.
                      </span>
                    </div>
                  )}
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
