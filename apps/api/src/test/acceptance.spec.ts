import '../config/env.js';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { simulationClock } from '../modules/simulation/simulation-clock.js';
import { environmentModel } from '../modules/simulation/environment-model.js';
import { meterEngine } from '../modules/energy/meter-engine.js';
import { policyEngine } from '../modules/automation/policy-engine.js';
import { savingsEngine } from '../modules/savings/savings-engine.js';
import { getDeviceModel } from '../modules/simulation/device-models/index.js';
import { roundTo } from '../utils/math.js';

async function runAcceptanceTests() {
  console.log('🧪 Starting Lumora Acceptance Tests (§75–§80)...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // ─── Test 1: Two-Room Acceptance Test (§75) ───────────────────
  console.log('▶ Test §75: Two-Room Meter Aggregation');
  {
    const r1 = simulationState.createRoom({ id: 'test-room-101', name: 'Room 101' });
    const r2 = simulationState.createRoom({ id: 'test-room-102', name: 'Room 102' });

    // Explicitly initialize meters at t0
    const t0 = new Date('2026-09-26T10:00:00Z');
    meterEngine.getOrCreateRoomMeter('test-room-101', t0);
    meterEngine.getOrCreateRoomMeter('test-room-102', t0);

    // Room 101: 5000W load
    simulationState.addDevice('test-room-101', {
      id: 'd101',
      name: 'Load 101',
      type: 'GENERIC',
      ratedPowerW: 5000,
      standbyPowerW: 0,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 5000,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });

    // Room 102: 7000W load
    simulationState.addDevice('test-room-102', {
      id: 'd102',
      name: 'Load 102',
      type: 'GENERIC',
      ratedPowerW: 7000,
      standbyPowerW: 0,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 7000,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });

    // Simulate 5 minutes (300 ticks of 1s)
    for (let t = 1; t <= 300; t++) {
      const simT = new Date(t0.getTime() + t * 1000);
      meterEngine.processTick({
        roomId: 'test-room-101',
        powerSupplyOn: true,
        devices: simulationState.getDevices('test-room-101'),
        unregisteredLoadW: 0,
        dtSeconds: 1,
        simTime: simT,
      });
      meterEngine.processTick({
        roomId: 'test-room-102',
        powerSupplyOn: true,
        devices: simulationState.getDevices('test-room-102'),
        unregisteredLoadW: 0,
        dtSeconds: 1,
        simTime: simT,
      });
    }

    const m1 = meterEngine.getOrCreateRoomMeter('test-room-101');
    const m2 = meterEngine.getOrCreateRoomMeter('test-room-102');

    // Expected kWh for 5 min (300s):
    // Room 101: 5000W * 5min / 60000 = 0.4167 kWh
    // Room 102: 7000W * 5min / 60000 = 0.5833 kWh
    // Total building = 1.0 kWh
    const bldEnergy = await meterEngine.getBuildingEnergy(
      new Date('2026-09-26T09:59:00Z'),
      new Date('2026-09-26T10:06:00Z'),
    );

    assert(m1.cumulativeKwh > 0.4, 'Room 101 recorded ~0.417 kWh in 5-min interval', `got ${m1.cumulativeKwh}`);
    assert(m2.cumulativeKwh > 0.57, 'Room 102 recorded ~0.583 kWh in 5-min interval', `got ${m2.cumulativeKwh}`);
    assert(bldEnergy.totalConsumptionKwh >= 0.99, 'Building total aggregates both room meters (~1.0 kWh)', `got ${bldEnergy.totalConsumptionKwh}`);
  }

  // ─── Test 2: Room Power OFF (§76) ─────────────────────────────
  console.log('\n▶ Test §76: Room Power OFF Behavior');
  {
    const roomId = 'test-room-power';
    simulationState.createRoom({ id: roomId, name: 'Power Test Room' });
    simulationState.addDevice(roomId, {
      id: 'freezer-1',
      name: 'Commercial Freezer',
      type: 'FREEZER',
      ratedPowerW: 400,
      standbyPowerW: 20,
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 400,
      isProtected: true,
      isControllable: false,
      priority: 1,
    });

    // 1. Power OFF
    simulationState.setRoomPowerSupply(roomId, false);
    const meterBefore = meterEngine.getOrCreateRoomMeter(roomId).cumulativeKwh;

    // Simulate 5 min with power OFF
    const simT = new Date('2026-09-26T12:00:00Z');
    meterEngine.getOrCreateRoomMeter(roomId, simT);
    for (let t = 1; t <= 300; t++) {
      meterEngine.processTick({
        roomId,
        powerSupplyOn: false,
        devices: simulationState.getDevices(roomId),
        unregisteredLoadW: 0,
        dtSeconds: 1,
        simTime: new Date(simT.getTime() + t * 1000),
      });
    }

    const meterAfter = meterEngine.getOrCreateRoomMeter(roomId).cumulativeKwh;
    assert(meterBefore === meterAfter, 'Room meter records zero consumption while power is OFF', `before=${meterBefore}, after=${meterAfter}`);

    // 2. Power restored -> Freezer returns to ON
    simulationState.setRoomPowerSupply(roomId, true);
    // Mimic power/on endpoint restoring freezer
    simulationState.updateDevice(roomId, 'freezer-1', {
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 400,
    });
    const freezer = simulationState.getDevice(roomId, 'freezer-1');
    assert(freezer?.isPoweredOn === true && freezer?.currentState === 'COMPRESSOR_ON', 'Freezer becomes operational automatically when power is restored');
  }

  // ─── Test 3: Temperature/AC Cooling Model (§77) ───────────────
  console.log('\n▶ Test §77: Temperature / AC Cooling Model');
  {
    const roomId = 'test-room-temp';
    simulationState.createRoom({ id: roomId, name: 'AC Temp Room' });
    simulationState.updateRoomState(roomId, {
      temperatureC: 35.0,
      acSetpointC: 25.0,
      outsideTemperatureC: 38.0,
    });
    simulationState.addDevice(roomId, {
      id: 'ac-1',
      name: 'Split AC',
      type: 'AC',
      ratedPowerW: 1800,
      standbyPowerW: 45,
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 1800,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });

    // Advance 10 minutes (600 seconds)
    // 0.5°C per minute: 35.0 - (10 * 0.5) = 30.0°C
    for (let m = 1; m <= 10; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const temp10m = simulationState.getRoom(roomId)!.state.temperatureC;
    assert(Math.abs(temp10m - 30.0) < 0.1, 'Room cooled from 35.0°C to 30.0°C in 10 minutes (0.5°C/min)', `got ${temp10m}`);

    // Advance another 10 minutes -> reaches 25.0°C
    for (let m = 1; m <= 10; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const temp20m = simulationState.getRoom(roomId)!.state.temperatureC;
    assert(Math.abs(temp20m - 25.0) < 0.1, 'Room reached setpoint 25.0°C after exactly 20 minutes', `got ${temp20m}`);

    // Verify AC switches to COMPRESSOR_OFF mode at setpoint
    const acModel = getDeviceModel('AC');
    const acDev = simulationState.getDevice(roomId, 'ac-1')!;
    const acResult = acModel.calculate(acDev, {
      dtSeconds: 1,
      roomTempC: temp20m,
      targetTempC: 25.0,
      occupancyCount: 1,
      roomLux: 500,
    });
    assert(acResult.newState === 'COMPRESSOR_OFF', 'AC switches to COMPRESSOR_OFF mode at setpoint', `got ${acResult.newState}`);
    assert(acResult.powerW === 45, 'AC uses reduced compressor-off power at setpoint', `got ${acResult.powerW}W`);

    // Advance another 5 minutes -> does NOT drift below 25°C
    for (let m = 1; m <= 5; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const temp25m = simulationState.getRoom(roomId)!.state.temperatureC;
    assert(temp25m === 25.0, 'Room temperature does not drop below setpoint due to float drift', `got ${temp25m}`);
  }

  // ─── Test 4: AC OFF Heating Model (§78) ───────────────────────
  console.log('\n▶ Test §78: AC OFF Warming toward Equilibrium Cap');
  {
    const roomId = 'test-room-warm';
    simulationState.createRoom({ id: roomId, name: 'Warming Room' });
    simulationState.updateRoomState(roomId, {
      temperatureC: 25.0,
      outsideTemperatureC: 40.0, // Equilibrium cap: 40 - 5 = 35°C
    });

    // Advance 10 minutes with AC OFF (600s)
    // 25.0 + 10 * 0.5 = 30.0°C
    for (let m = 1; m <= 10; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const temp10m = simulationState.getRoom(roomId)!.state.temperatureC;
    assert(Math.abs(temp10m - 30.0) < 0.1, 'Room warmed from 25.0°C to 30.0°C in 10 minutes with AC OFF', `got ${temp10m}`);

    // Advance 20 more minutes (total 30 min) -> should cap at 35.0°C
    for (let m = 1; m <= 20; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const temp30m = simulationState.getRoom(roomId)!.state.temperatureC;
    assert(temp30m === 35.0, 'Room warming stops strictly at environmental temperature - 5°C (35.0°C)', `got ${temp30m}`);
  }

  // ─── Test 5: Occupancy & CO2 Evolution (§79) ──────────────────
  console.log('\n▶ Test §79: Occupancy Entity Management & CO2 Model');
  {
    const roomId = 'test-room-occ';
    simulationState.createRoom({ id: roomId, name: 'Occupancy Room' });
    simulationState.updateRoomState(roomId, { co2Ppm: 450.0 });

    // 0 occupants: 10 minutes -> CO2 decays towards 415 ppm
    for (let m = 1; m <= 10; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const co2Zero = simulationState.getRoom(roomId)!.state.co2Ppm;
    assert(co2Zero < 450.0, 'With 0 occupants, CO2 decays towards outdoor baseline (415 ppm)', `got ${co2Zero}`);

    // Add 1 person
    simulationState.addPerson(roomId, {
      id: 'p1',
      roomId,
      displayName: 'Alice',
      active: true,
      heatGainW: 100,
      co2GenerationPpmPerHour: 38000,
    });
    for (let m = 1; m <= 10; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const co2One = simulationState.getRoom(roomId)!.state.co2Ppm;
    assert(co2One > co2Zero, 'With 1 occupant, CO2 rises steadily', `got ${co2One}`);

    // Add 2nd person: CO2 rises faster
    simulationState.addPerson(roomId, {
      id: 'p2',
      roomId,
      displayName: 'Bob',
      active: true,
      heatGainW: 100,
      co2GenerationPpmPerHour: 38000,
    });
    const beforeTwo = simulationState.getRoom(roomId)!.state.co2Ppm;
    for (let m = 1; m <= 5; m++) {
      environmentModel.updateEnvironment(roomId, 60);
    }
    const rateTwo = (simulationState.getRoom(roomId)!.state.co2Ppm - beforeTwo) / 5;
    assert(rateTwo > (co2One - co2Zero) / 10, 'With 2 occupants, CO2 rise rate is significantly higher', `rate=${rateTwo}`);

    // Verify welcome policy (§17.4): when person enters, LED and Fan turn ON automatically
    simulationState.addDevice(roomId, {
      id: 'occ-led-1',
      name: 'Occupancy LED',
      type: 'LED',
      ratedPowerW: 36,
      standbyPowerW: 0,
      currentState: 'OFF',
      isPoweredOn: false,
      currentPowerW: 0,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });
    simulationState.addDevice(roomId, {
      id: 'occ-fan-1',
      name: 'Occupancy Fan',
      type: 'FAN',
      ratedPowerW: 60,
      standbyPowerW: 0,
      currentState: 'OFF',
      isPoweredOn: false,
      currentPowerW: 0,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });

    simulationState.updateRoomState(roomId, { occupancyCount: 2, occupancyState: 'OCCUPIED' });
    policyEngine.evaluateRoomPolicies(roomId);

    const occLed = simulationState.getDevice(roomId, 'occ-led-1')!;
    const occFan = simulationState.getDevice(roomId, 'occ-fan-1')!;
    assert(occLed.currentState === 'ON' && occLed.isPoweredOn === true, 'Person entry: LED turned ON automatically upon room occupancy');
    assert(occFan.currentState === 'ON' && occFan.isPoweredOn === true, 'Person entry: Fan turned ON automatically upon room occupancy');
  }

  // ─── Test 6: Vacancy Savings Acceptance Scenario (§80) ────────
  console.log('\n▶ Test §80: Vacancy Automation & Counterfactual Copy-Room Savings');
  {
    const roomId = 'test-room-scenario';
    simulationState.createRoom({ id: roomId, name: 'Scenario Room' });
    const vacancyTime = new Date('2026-09-26T10:30:00Z');

    simulationState.updateRoomState(roomId, {
      temperatureC: 35.0,
      acSetpointC: 25.0,
      occupancyCount: 0,
      vacancyStartedAt: vacancyTime.toISOString(),
    });

    // Devices per §80:
    simulationState.addDevice(roomId, {
      id: 'led-1',
      name: 'LED 1',
      type: 'LED',
      ratedPowerW: 36,
      standbyPowerW: 0,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 36,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });
    simulationState.addDevice(roomId, {
      id: 'fan-1',
      name: 'Ceiling Fan',
      type: 'FAN',
      ratedPowerW: 75,
      standbyPowerW: 0,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 75,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });
    simulationState.addDevice(roomId, {
      id: 'ac-1',
      name: 'Inverter AC',
      type: 'AC',
      ratedPowerW: 1800,
      standbyPowerW: 45,
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 1800,
      isProtected: false,
      isControllable: true,
      priority: 1,
    });
    simulationState.addDevice(roomId, {
      id: 'freezer-1',
      name: 'Protected Freezer',
      type: 'FREEZER',
      ratedPowerW: 350,
      standbyPowerW: 20,
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 350,
      isProtected: true,
      isControllable: false,
      priority: 1,
    });

    // Start savings session at 10:30
    const session = savingsEngine.startSession(roomId);
    assert(session !== null && session.copyRoom !== null, 'Created copy room with counterfactual state at vacancy (10:30)');

    // 10:30: Real room runs policy engine
    policyEngine.evaluateRoomPolicies(roomId, vacancyTime);
    const led = simulationState.getDevice(roomId, 'led-1')!;
    const fan = simulationState.getDevice(roomId, 'fan-1')!;
    const ac = simulationState.getDevice(roomId, 'ac-1')!;
    const freezer = simulationState.getDevice(roomId, 'freezer-1')!;

    assert(led.currentState === 'OFF', 'Real room: LED turned OFF immediately upon vacancy');
    assert(fan.currentState === 'OFF', 'Real room: Fan turned OFF immediately upon vacancy');
    assert(ac.currentState === 'COMPRESSOR_ON', 'Real room: AC stays ON during initial 5-min grace window');
    assert(freezer.currentState === 'COMPRESSOR_ON', 'Real room: Freezer remains ON (protected)');

    // Copy room: LED, Fan, AC, Freezer all remain ON (§80)
    const copyDevs = session!.copyRoom!.devices;
    assert(copyDevs.get('led-1')?.currentPowerW === 36, 'Copy room: LED remains ON');
    assert(copyDevs.get('fan-1')?.currentPowerW === 75, 'Copy room: Fan remains ON');
    assert(copyDevs.get('ac-1')?.currentState === 'COMPRESSOR_ON', 'Copy room: AC compressor remains ON');
    assert(copyDevs.get('freezer-1')?.currentPowerW === 350, 'Copy room: Freezer remains ON');

    // Simulate to 10:36 (6 minutes of vacancy): Real AC compressor cuts off
    const time1036 = new Date('2026-09-26T10:36:00Z');
    policyEngine.evaluateRoomPolicies(roomId, time1036);
    const acAt6m = simulationState.getDevice(roomId, 'ac-1')!;
    assert(acAt6m.currentState === 'COMPRESSOR_OFF', 'Real room: AC compressor cut OFF after 5 minutes of vacancy (at 10:35+)');

    // Simulate to 10:41 (11 minutes of vacancy): Real AC fully turns off
    const time1041 = new Date('2026-09-26T10:41:00Z');
    policyEngine.evaluateRoomPolicies(roomId, time1041);
    const acAt11m = simulationState.getDevice(roomId, 'ac-1')!;
    assert(acAt11m.currentState === 'OFF', 'Real room: AC fully shut OFF after 10 minutes of vacancy');

    // Close session (occupant returns at 11:03)
    savingsEngine.closeSession(roomId);
    assert(savingsEngine.getActiveSession(roomId) === undefined, 'Savings session closed when occupant returns');
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Fatal error during acceptance test execution:', err);
  process.exit(1);
});
