import type { AlertDto } from '../domain/alerts.js';
import type { RoomDto } from '../domain/room.js';

export interface DashboardKpis {
  totalRooms: number;
  activeRooms: number;
  totalActivePowerW: number;
  expectedPowerW: number;
  instantaneousSavingsW: number;
  todaySavingsKwh: number;
  todaySavingsInr: number;
  todayCo2AvoidedKg: number;
  averageComfortScore: number;
  activeAlertsCount: number;
}

export interface DashboardOverviewResponse {
  kpis: DashboardKpis;
  rooms: RoomDto[];
  recentAlerts: AlertDto[];
  timestamp: string;
}
