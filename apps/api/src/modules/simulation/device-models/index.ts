import type { DeviceType } from '@intellisave/shared';
import type { IDeviceModel } from './base-device-model.js';
import { AcDeviceModel } from './ac-model.js';
import { FanDeviceModel } from './fan-model.js';
import { LedDeviceModel } from './led-model.js';
import { FreezerDeviceModel } from './freezer-model.js';
import { LaptopPortDeviceModel } from './laptop-port-model.js';
import { GenericDeviceModel } from './generic-device-model.js';

export * from './base-device-model.js';

const models: Partial<Record<DeviceType, IDeviceModel>> = {
  AC: new AcDeviceModel(),
  FAN: new FanDeviceModel(),
  LED: new LedDeviceModel(),
  TUBE_LIGHT: new LedDeviceModel(),
  FREEZER: new FreezerDeviceModel(),
  LAPTOP_PORT: new LaptopPortDeviceModel(),
  GENERIC: new GenericDeviceModel(),
  PROJECTOR: new GenericDeviceModel(),
  DESKTOP: new GenericDeviceModel(),
};

const defaultModel = new GenericDeviceModel();

export function getDeviceModel(type: DeviceType): IDeviceModel {
  return models[type] || defaultModel;
}
