// @intellisave/shared — Domain types, event schemas, and constants
// Shared between apps/api and apps/web

// Domain types
export * from './domain/room.js';
export * from './domain/device.js';
export * from './domain/sensor.js';
export * from './domain/person.js';
export * from './domain/savings.js';
export * from './domain/alerts.js';

// Events
export * from './events/event-types.js';
export * from './events/event-schema.js';

// Constants
export * from './constants/device-types.js';
export * from './constants/sensor-types.js';
export * from './constants/thresholds.js';

// Simulation types
export * from './simulation/simulation-types.js';

// API Request/Response DTOs
export * from './api/dashboard.js';
export * from './api/rooms.js';
export * from './api/devices.js';
export * from './api/energy.js';
export * from './api/people.js';
export * from './api/savings.js';
