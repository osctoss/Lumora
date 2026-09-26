export interface PersonDto {
  id: string;
  roomId: string;
  displayName: string;
  active: boolean;
  heatGainW: number;
  co2GenerationPpmPerHour: number;
}

export interface CreatePersonRequest {
  displayName: string;
  movementBehavior?: string;
}
