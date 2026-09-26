export const SENSOR_TYPES = {
  OCCUPANCY_PIR: 'OCCUPANCY_PIR',
  OCCUPANCY_MMWAVE: 'OCCUPANCY_MMWAVE',
  TEMPERATURE: 'TEMPERATURE',
  HUMIDITY: 'HUMIDITY',
  CO2: 'CO2',
  AMBIENT_LIGHT: 'AMBIENT_LIGHT',
  ENERGY_METER: 'ENERGY_METER',
} as const;

export const SENSOR_DEFAULTS = {
  OCCUPANCY_PIR: { unit: 'boolean', sampleIntervalSec: 5 },
  OCCUPANCY_MMWAVE: { unit: 'boolean', sampleIntervalSec: 2 },
  TEMPERATURE: { unit: '°C', sampleIntervalSec: 10, min: 10, max: 50 },
  HUMIDITY: { unit: '%', sampleIntervalSec: 10, min: 0, max: 100 },
  CO2: { unit: 'ppm', sampleIntervalSec: 10, min: 300, max: 5000 },
  AMBIENT_LIGHT: { unit: 'lux', sampleIntervalSec: 10, min: 0, max: 2000 },
  ENERGY_METER: { unit: 'W', sampleIntervalSec: 5 },
} as const;
