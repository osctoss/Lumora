// Device catalog defaults from spec §31
export const DEVICE_CATALOG_DEFAULTS = {
  AC:          { ratedPowerW: 1500, voltageV: 230, controllable: true,  protected: false },
  FAN:         { ratedPowerW: 60,   voltageV: 230, controllable: true,  protected: false },
  LED:         { ratedPowerW: 9,    voltageV: 230, controllable: true,  protected: false },
  FREEZER:     { ratedPowerW: 180,  voltageV: 230, controllable: false, protected: true  },
  LAPTOP_PORT: { ratedPowerW: 65,   voltageV: 230, controllable: false, protected: true  },
  TUBE_LIGHT:  { ratedPowerW: 20,   voltageV: 230, controllable: true,  protected: false },
  DESKTOP:     { ratedPowerW: 150,  voltageV: 230, controllable: true,  protected: false },
  PROJECTOR:   { ratedPowerW: 250,  voltageV: 230, controllable: true,  protected: false },
  GENERIC:     { ratedPowerW: 100,  voltageV: 230, controllable: true,  protected: false },
} as const;
