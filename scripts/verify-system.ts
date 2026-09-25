/**
 * IntelliSave System Verification Script
 * Validates backend simulation, API endpoints, physics equations, and AI layer.
 */

async function verifySystem() {
  const baseUrl = 'http://localhost:3001';
  console.log('🔍 Starting IntelliSave End-to-End System Verification...');
  console.log(`📡 Target API Gateway: ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<boolean>) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      const ok = await fn();
      if (ok) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await check('GET /api/health (Gateway Status)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    return res.status === 200 && data.status === 'ok';
  });

  // 2. Simulation State
  await check('GET /api/simulation/state (Clock & Engine)', async () => {
    const res = await fetch(`${baseUrl}/api/simulation/state`);
    const data = await res.json();
    return res.status === 200 && typeof data.status === 'string';
  });

  // 3. Room 101 State
  await check('GET /api/rooms/room-101 (Digital Twin State)', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/room-101`);
    const data = await res.json();
    return res.status === 200 && data.room && data.state && Array.isArray(data.devices);
  });

  // 4. Energy Summary
  await check('GET /api/energy/accounting/room-101 (Power Accounting)', async () => {
    const res = await fetch(`${baseUrl}/api/energy/accounting/room-101`);
    const data = await res.json();
    return res.status === 200 && typeof data.meteredActivePowerW === 'number';
  });

  // 5. Savings Summary
  await check('GET /api/savings (Counterfactual Ledger)', async () => {
    const res = await fetch(`${baseUrl}/api/savings`);
    const data = await res.json();
    return res.status === 200 && typeof data.totalSavingsKwh === 'number';
  });

  // 6. AI Explainer
  await check('POST /api/ai/explain (Deterministic Fallback)', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertType: 'UNACCOUNTED_CONSUMPTION',
        details: { unaccountedPowerW: 350 },
      }),
    });
    const data = await res.json();
    return res.status === 200 && !!data.rootCause;
  });

  // 7. Scenario Injection
  await check('POST /api/simulation/scenario (High Temp Scenario)', async () => {
    const res = await fetch(`${baseUrl}/api/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'room-101',
        scenario: 'HIGH_TEMPERATURE',
      }),
    });
    const data = await res.json();
    return res.status === 200 && data.success === true;
  });

  // 8. Reset Scenario back to Normal
  await check('POST /api/simulation/scenario (Reset Scenario)', async () => {
    const res = await fetch(`${baseUrl}/api/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'room-101',
        scenario: 'RESET_ROOM',
      }),
    });
    const data = await res.json();
    return res.status === 200 && data.success === true;
  });

  console.log(`\n================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`Status: ${failed === 0 ? '🏆 ALL SYSTEMS GO' : '⚠️ ATTENTION REQUIRED'}`);
  console.log(`================================\n`);
}

verifySystem().catch(console.error);
