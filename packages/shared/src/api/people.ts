import type { PersonDto } from '../domain/person.js';

export interface PeopleListResponse {
  roomId: string;
  people: PersonDto[];
  totalActive: number;
}

export interface AddPersonRequest {
  roomId: string;
  displayName: string;
  heatGainW?: number;
  co2GenerationPpmPerHour?: number;
}
