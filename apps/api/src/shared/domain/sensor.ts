export type SensorType =
  | 'OCCUPANCY_PIR'
  | 'OCCUPANCY_MMWAVE'
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'CO2'
  | 'AMBIENT_LIGHT'
  | 'ENERGY_METER';

export interface SensorDto {
  id: string;
  roomId: string;
  name: string;
  type: SensorType;
  unit: string;
  sampleIntervalSec?: number;
  lastValue?: number | null;
  lastUpdatedAt?: string | null;
  enabled?: boolean;
  virtual?: boolean;
}
