import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Starting Lumora database seed...');

  // 1. Building
  const building = await prisma.building.upsert({
    where: { id: 'building-demo-01' },
    update: {},
    create: {
      id: 'building-demo-01',
      name: 'Lumora Demo Building',
      address: 'Innovation Campus, Block A',
      electricityTariffInrPerKwh: 8.0,
      co2FactorKgPerKwh: 0.82,
    },
  });
  console.log(`✓ Building ready: ${building.name}`);

  // 2. System Settings
  const settings = [
    { key: 'tariffRateInrPerKwh', value: '8.00', description: 'Commercial electricity tariff rate' },
    { key: 'gridEmissionsFactorKgPerKwh', value: '0.82', description: 'Grid emission intensity factor' },
    { key: 'targetTemperatureC', value: '24.0', description: 'Target indoor temperature setpoint' },
    { key: 'vacancyConfirmationSec', value: '300', description: 'Vacancy confirmation time window' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✓ System settings configured`);

  // 3. Device Catalog
  const catalogItems = [
    { id: 'cat-ac-1500', type: 'AC' as const, brand: 'Voltas', model: 'Inverter Split 1.5T', ratedPowerW: 1500, standbyPowerW: 8, voltageV: 230, minRunTimeSec: 180, minRestTimeSec: 180, isControllable: true, isProtected: false, defaultPriority: 1 },
    { id: 'cat-fan-60', type: 'FAN' as const, brand: 'Atomberg', model: 'BLDC Renesa 1200mm', ratedPowerW: 60, standbyPowerW: 1.5, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: true, isProtected: false, defaultPriority: 2 },
    { id: 'cat-led-36', type: 'LED' as const, brand: 'Philips', model: 'Smart Troffer 2x2', ratedPowerW: 36, standbyPowerW: 0.5, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: true, isProtected: false, defaultPriority: 3 },
    { id: 'cat-freezer-250', type: 'FREEZER' as const, brand: 'Blue Star', model: 'Deep Freezer 200L', ratedPowerW: 250, standbyPowerW: 12, voltageV: 230, minRunTimeSec: 300, minRestTimeSec: 300, isControllable: false, isProtected: true, defaultPriority: 10 },
    { id: 'cat-laptop-port-65', type: 'LAPTOP_PORT' as const, brand: 'Legrand', model: 'USB-C PD 65W Pod', ratedPowerW: 65, standbyPowerW: 0.3, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: false, isProtected: true, defaultPriority: 9 },
    { id: 'cat-tubelight-20', type: 'TUBE_LIGHT' as const, brand: 'Havells', model: 'Batten LED 20W', ratedPowerW: 20, standbyPowerW: 0, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: true, isProtected: false, defaultPriority: 3 },
    { id: 'cat-desktop-180', type: 'DESKTOP' as const, brand: 'Dell', model: 'OptiPlex 7090', ratedPowerW: 180, standbyPowerW: 3, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: false, isProtected: true, defaultPriority: 8 },
    { id: 'cat-projector-280', type: 'PROJECTOR' as const, brand: 'Epson', model: 'PowerLite 118', ratedPowerW: 280, standbyPowerW: 2, voltageV: 230, minRunTimeSec: 120, minRestTimeSec: 180, isControllable: true, isProtected: false, defaultPriority: 2 },
    { id: 'cat-generic-100', type: 'GENERIC' as const, brand: 'Generic', model: 'Appliance 100W', ratedPowerW: 100, standbyPowerW: 0, voltageV: 230, minRunTimeSec: 0, minRestTimeSec: 0, isControllable: true, isProtected: false, defaultPriority: 4 },
  ];

  for (const cat of catalogItems) {
    await prisma.deviceCatalog.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  console.log(`✓ Device catalog seeded (${catalogItems.length} types)`);

  // 4. Room 101
  const room = await prisma.room.upsert({
    where: { id: 'room-101' },
    update: {},
    create: {
      id: 'room-101',
      buildingId: building.id,
      name: 'Room 101 - Smart Classroom',
      floor: 1,
      capacity: 30,
      areaSqMeters: 45.0,
      baselineExpectedPowerW: 1692.0,
      status: 'ACTIVE',
      currentOccupancyState: 'VACANT',
      currentTemperature: 24.0,
      currentHumidity: 50.0,
      currentCo2: 450.0,
      currentLux: 500.0,
      currentComfortScore: 96.0,
      totalActivePowerW: 0.0,
      totalExpectedPowerW: 0.0,
      unaccountedPowerW: 0.0,
    },
  });

  // Room Settings
  await prisma.roomSettings.upsert({
    where: { roomId: room.id },
    update: {},
    create: {
      roomId: room.id,
      targetTempC: 24.0,
      minTempC: 21.0,
      maxTempC: 26.0,
      targetHumidityPct: 50.0,
      minHumidityPct: 30.0,
      maxHumidityPct: 60.0,
      targetLux: 500.0,
      co2WarningThreshold: 1000.0,
      co2CriticalThreshold: 1500.0,
      vacancyGracePeriodSec: 60,
      vacancyConfirmationTimeSec: 300,
      preCoolTimeMinutes: 15,
      autoControlAc: true,
      autoControlLights: true,
      autoControlFans: true,
      maxUnaccountedPowerW: 50.0,
      unregisteredLoadGraceSec: 60,
    },
  });
  console.log(`✓ Room 101 and RoomSettings seeded`);

  // 5. Sensors for Room 101
  const sensors = [
    { id: 'sensor-pir-101', roomId: room.id, name: 'PIR Motion Sensor', type: 'OCCUPANCY_PIR' as const, unit: 'boolean', sampleIntervalSec: 5, lastValue: 0 },
    { id: 'sensor-mmwave-101', roomId: room.id, name: 'mmWave Micro-Presence', type: 'OCCUPANCY_MMWAVE' as const, unit: 'boolean', sampleIntervalSec: 2, lastValue: 0 },
    { id: 'sensor-temp-101', roomId: room.id, name: 'Temperature Sensor', type: 'TEMPERATURE' as const, unit: '°C', sampleIntervalSec: 10, lastValue: 24.0 },
    { id: 'sensor-humidity-101', roomId: room.id, name: 'Humidity Sensor', type: 'HUMIDITY' as const, unit: '%', sampleIntervalSec: 10, lastValue: 50.0 },
    { id: 'sensor-co2-101', roomId: room.id, name: 'CO2 Air Quality Sensor', type: 'CO2' as const, unit: 'ppm', sampleIntervalSec: 10, lastValue: 450.0 },
    { id: 'sensor-light-101', roomId: room.id, name: 'Ambient Light Sensor', type: 'AMBIENT_LIGHT' as const, unit: 'lux', sampleIntervalSec: 10, lastValue: 500.0 },
    { id: 'sensor-meter-101', roomId: room.id, name: 'Smart Submeter Panel', type: 'ENERGY_METER' as const, unit: 'W', sampleIntervalSec: 5, lastValue: 0.0 },
  ];

  for (const s of sensors) {
    await prisma.sensor.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log(`✓ Room 101 sensors configured (${sensors.length} sensors)`);

  // 6. Devices for Room 101
  const devices = [
    { id: 'dev-ac-101', roomId: room.id, catalogId: 'cat-ac-1500', name: 'Main Air Conditioner (1.5T)', type: 'AC' as const, ratedPowerW: 1500, standbyPowerW: 8, currentState: 'OFF' as const, isPoweredOn: false, currentPowerW: 0, isProtected: false, isControllable: true, priority: 1, policy: { turnOffOnVacancy: true, allowPreCool: true, priority: 1, tempThresholdC: 24 } },
    { id: 'dev-led-1-101', roomId: room.id, catalogId: 'cat-led-36', name: 'Front Troffer Lights', type: 'LED' as const, ratedPowerW: 36, standbyPowerW: 0.5, currentState: 'OFF' as const, isPoweredOn: false, currentPowerW: 0, isProtected: false, isControllable: true, priority: 3, policy: { turnOffOnVacancy: true, allowPreCool: false, priority: 3, luxThreshold: 500 } },
    { id: 'dev-led-2-101', roomId: room.id, catalogId: 'cat-led-36', name: 'Rear Troffer Lights', type: 'LED' as const, ratedPowerW: 36, standbyPowerW: 0.5, currentState: 'OFF' as const, isPoweredOn: false, currentPowerW: 0, isProtected: false, isControllable: true, priority: 3, policy: { turnOffOnVacancy: true, allowPreCool: false, priority: 3, luxThreshold: 500 } },
    { id: 'dev-fan-101', roomId: room.id, catalogId: 'cat-fan-60', name: 'Ceiling BLDC Fan', type: 'FAN' as const, ratedPowerW: 60, standbyPowerW: 1.5, currentState: 'OFF' as const, isPoweredOn: false, currentPowerW: 0, isProtected: false, isControllable: true, priority: 2, policy: { turnOffOnVacancy: true, allowPreCool: false, priority: 2 } },
    { id: 'dev-freezer-101', roomId: room.id, catalogId: 'cat-freezer-250', name: 'Lab Deep Freezer [PROTECTED]', type: 'FREEZER' as const, ratedPowerW: 250, standbyPowerW: 12, currentState: 'COMPRESSOR_ON' as const, isPoweredOn: true, currentPowerW: 250, isProtected: true, isControllable: false, priority: 10, policy: { turnOffOnVacancy: false, allowPreCool: false, priority: 10 } },
    { id: 'dev-laptop-101', roomId: room.id, catalogId: 'cat-laptop-port-65', name: 'Instructor Workstation PD [PROTECTED]', type: 'LAPTOP_PORT' as const, ratedPowerW: 65, standbyPowerW: 0.3, currentState: 'ON' as const, isPoweredOn: true, currentPowerW: 45, isProtected: true, isControllable: false, priority: 9, policy: { turnOffOnVacancy: false, allowPreCool: false, priority: 9 } },
  ];

  for (const d of devices) {
    const { policy, ...deviceData } = d;
    const createdDevice = await prisma.device.upsert({
      where: { id: deviceData.id },
      update: {},
      create: deviceData,
    });

    await prisma.devicePolicy.upsert({
      where: { deviceId: createdDevice.id },
      update: {},
      create: {
        deviceId: createdDevice.id,
        ...policy,
      },
    });
  }
  console.log(`✓ Room 101 devices and policies configured (${devices.length} devices)`);

  console.log('✅ Lumora seed completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
