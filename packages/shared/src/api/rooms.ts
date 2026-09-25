import type { RoomDto, OccupancyState, RoomSimulationState } from '../domain/room.js';

export interface UpdateRoomRequest {
  name?: string;
  floor?: number;
  capacity?: number;
  areaSqMeters?: number;
}

export interface RoomListResponse {
  rooms: RoomDto[];
  total: number;
}

export interface RoomDetailResponse {
  room: RoomDto;
  state: RoomSimulationState;
}

export interface UpdateOccupancyRequest {
  state: OccupancyState;
  peopleCount?: number;
}
