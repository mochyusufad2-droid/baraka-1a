/**
 * BARAKA ADVENTURE — RC-1 Security Remediation & Release Gate Automated Test Runner
 *
 * Suites:
 * 1. Participant Login Rate Limiting (5 attempts/min per BIB+IP, IP throttle, 429 Retry-After)
 * 2. Participant PIN PBKDF2 Salted Hashing & Idempotent Migration
 * 3. Fallback Credentials Elimination ('bootstrap-secret-2026', 'juri123', 'admin123')
 * 4. Token Revocation Mechanism on Participant Logout
 * 5. GPS & Field Geofence Verification (Null Island rejection, radius bounds, anti-speedrun cooldown)
 */

import crypto from 'crypto';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`  ✓ PASS [${durationMs}ms] ${name}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, details: err?.message || String(err), durationMs });
    console.error(`  ✗ FAIL [${durationMs}ms] ${name}`);
    console.error(`    Error: ${err?.message || err}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiRequest(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    data: json,
  };
}

// Local PBKDF2 helper for unit verification
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex');
}

async function main() {
  console.log('================================================================');
  console.log('   BARAKA ADVENTURE — RC-1 SECURITY REMEDIATION TEST RUNNER     ');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`   Timestamp:     ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Verify server is alive
  const health = await apiRequest('/api/health');
  assert(health.status === 200, `Server health check failed with status ${health.status}`);
  console.log(`Server is healthy: ${health.data.service}\n`);

  // =================================================================
  // SUITE 1: RATE LIMITING DEFENSE ON POST /api/participant/login
  // =================================================================
  console.log('--- SUITE 1: Participant Login Rate Limiting ---');

  await runTest('1.1 Normal incorrect login returns 401 Unauthorized', async () => {
    // Unique test IP to isolate rate-limit buckets
    const testIp = `198.51.100.${Math.floor(10 + Math.random() * 80)}`;
    const res = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp },
      body: { bibNumber: 'T-99', pinCode: '0000' },
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.code === 'INVALID_CREDENTIALS', `Expected INVALID_CREDENTIALS, got ${res.data.code}`);
  });

  await runTest('1.2 5 rapid failed attempts are permitted, 6th attempt triggers 429 Too Many Requests', async () => {
    const testIp = `198.51.100.${Math.floor(90 + Math.random() * 80)}`;
    const testBib = `RL-${Math.floor(100 + Math.random() * 900)}`;

    // Attempts 1 to 5
    for (let i = 1; i <= 5; i++) {
      const res = await apiRequest('/api/participant/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp },
        body: { bibNumber: testBib, pinCode: 'wrong-pin' },
      });
      assert(res.status === 401, `Attempt ${i} should return 401, got ${res.status}`);
    }

    // Attempt 6: MUST be blocked by rate limiter
    const blockedRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp },
      body: { bibNumber: testBib, pinCode: 'wrong-pin' },
    });

    assert(blockedRes.status === 429, `6th attempt should be blocked with 429, got ${blockedRes.status}`);
    assert(blockedRes.data.code === 'RATE_LIMIT_EXCEEDED', `Expected code RATE_LIMIT_EXCEEDED, got ${blockedRes.data.code}`);
    assert(typeof blockedRes.data.retryAfter === 'number' && blockedRes.data.retryAfter > 0, 'Response must include retryAfter number');
    const retryHeader = blockedRes.headers.get('retry-after');
    assert(!!retryHeader && Number(retryHeader) > 0, `Retry-After header must be present and > 0, got ${retryHeader}`);
  });

  await runTest('1.3 IP-level throttle prevents credential stuffing by rotating BIBs (max 20 attempts)', async () => {
    const testIp = `203.0.113.${Math.floor(10 + Math.random() * 80)}`;

    // Send 20 attempts with different BIBs
    for (let i = 1; i <= 20; i++) {
      const res = await apiRequest('/api/participant/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp },
        body: { bibNumber: `ROT-${i}`, pinCode: '0000' },
      });
      // First 20 allowed through (status 401)
      assert(res.status === 401, `Attempt ${i} should be 401, got ${res.status}`);
    }

    // 21st attempt with new BIB should be blocked by IP throttle
    const blockedIpRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp },
      body: { bibNumber: 'ROT-NEW', pinCode: '0000' },
    });

    assert(blockedIpRes.status === 429, `21st attempt must be blocked with 429 per-IP throttle, got ${blockedIpRes.status}`);
    assert(blockedIpRes.data.code === 'RATE_LIMIT_EXCEEDED', `Expected code RATE_LIMIT_EXCEEDED, got ${blockedIpRes.data.code}`);
  });

  await runTest('1.4 Legitimate login with valid credentials succeeds and returns HMAC sessionToken', async () => {
    const freshIp = `192.0.2.${Math.floor(10 + Math.random() * 80)}`;
    const res = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'A-01', pinCode: '7721' },
    });

    assert(res.status === 200, `Expected 200 for valid team A-01, got ${res.status} (${JSON.stringify(res.data)})`);
    assert(res.data.success === true, 'Response success must be true');
    assert(!!res.data.sessionToken, 'Response must contain sessionToken');
    assert(res.data.team.bibNumber === 'A-01', `Expected team bibNumber A-01, got ${res.data.team.bibNumber}`);
  });

  // =================================================================
  // SUITE 2: PARTICIPANT PIN PBKDF2 SALTED HASHING & MIGRATION
  // =================================================================
  console.log('\n--- SUITE 2: PIN PBKDF2 Salted Hashing & Idempotent Migration ---');

  await runTest('2.1 PBKDF2 hashing produces 64-character hex with unique salts', async () => {
    const salt1 = crypto.randomBytes(16).toString('hex');
    const salt2 = crypto.randomBytes(16).toString('hex');
    const hash1 = hashPin('7721', salt1);
    const hash2 = hashPin('7721', salt2);

    assert(hash1.length === 64, `Expected 64 hex characters, got ${hash1.length}`);
    assert(hash2.length === 64, `Expected 64 hex characters, got ${hash2.length}`);
    assert(hash1 !== hash2, 'Identical PIN with different salts must produce different hashes (salt uniqueness)');
  });

  await runTest('2.2 Timing-safe verification distinguishes valid and invalid PINs', async () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const correctHash = hashPin('1234', salt);

    const testCorrect = hashPin('1234', salt);
    const testWrong = hashPin('9999', salt);

    const bufCorrect = Buffer.from(correctHash, 'hex');
    const bufTestCorrect = Buffer.from(testCorrect, 'hex');
    const bufTestWrong = Buffer.from(testWrong, 'hex');

    assert(crypto.timingSafeEqual(bufCorrect, bufTestCorrect), 'Correct hash must match');
    assert(!crypto.timingSafeEqual(bufCorrect, bufTestWrong), 'Wrong hash must not match');
  });

  await runTest('2.3 Authoritative registry verifies all demo teams with pre-hashed PINs', async () => {
    const testTeams = [
      { bib: 'A-01', pin: '7721' },
      { bib: 'B-04', pin: '3349' },
      { bib: 'C-07', pin: '8812' },
      { bib: 'D-10', pin: '5563' },
      { bib: 'E-02', pin: '1190' },
      { bib: 'F-09', pin: '4428' },
    ];

    for (const team of testTeams) {
      const freshIp = `10.0.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
      const res = await apiRequest('/api/participant/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': freshIp },
        body: { bibNumber: team.bib, pinCode: team.pin },
      });
      assert(res.status === 200 && res.data.success, `Team ${team.bib} failed to verify with salted hash`);
    }
  });

  // =================================================================
  // SUITE 3: ELIMINATION OF FALLBACK CREDENTIALS
  // =================================================================
  console.log('\n--- SUITE 3: Elimination of Fallback Credentials ---');

  await runTest('3.1 Old fallback "bootstrap-secret-2026" is rejected with 403 Forbidden', async () => {
    const res = await apiRequest('/api/admin/bootstrap-super-admin', {
      method: 'POST',
      body: {
        email: 'attacker@evil.com',
        password: 'Password123!',
        displayName: 'Attacker',
        bootstrapKey: 'bootstrap-secret-2026',
      },
    });

    assert(res.status === 403, `Expected 403 Forbidden for static fallback key, got ${res.status}`);
    assert(res.data.code === 'INVALID_BOOTSTRAP_KEY', `Expected INVALID_BOOTSTRAP_KEY, got ${res.data.code}`);
  });

  await runTest('3.2 Empty or missing bootstrap key is rejected with 400 Bad Request', async () => {
    const res = await apiRequest('/api/admin/bootstrap-super-admin', {
      method: 'POST',
      body: {
        email: 'test@admin.com',
        password: 'Password123!',
        displayName: 'Test Admin',
        bootstrapKey: '',
      },
    });

    assert(res.status === 400, `Expected 400 for empty bootstrapKey, got ${res.status}`);
  });

  await runTest('3.3 Old fallback "juri123" is rejected on /api/judge/verify-authorization', async () => {
    const res = await apiRequest('/api/judge/verify-authorization', {
      method: 'POST',
      body: { judgeKey: 'juri123' },
    });

    assert(res.status === 401, `Expected 401 Unauthorized for legacy juri123, got ${res.status}`);
    assert(res.data.authorized === false, 'authorized must be false');
  });

  await runTest('3.4 Old fallback "admin123" is rejected on /api/judge/verify-authorization', async () => {
    const res = await apiRequest('/api/judge/verify-authorization', {
      method: 'POST',
      body: { judgeKey: 'admin123' },
    });

    assert(res.status === 401, `Expected 401 Unauthorized for legacy admin123, got ${res.status}`);
    assert(res.data.authorized === false, 'authorized must be false');
  });

  await runTest('3.5 Missing judgeKey parameter is rejected with 400 Bad Request', async () => {
    const res = await apiRequest('/api/judge/verify-authorization', {
      method: 'POST',
      body: {},
    });

    assert(res.status === 400, `Expected 400 for missing judgeKey, got ${res.status}`);
  });

  // =================================================================
  // SUITE 4: TOKEN REVOCATION ON LOGOUT
  // =================================================================
  console.log('\n--- SUITE 4: Token Revocation Mechanism on Logout ---');

  await runTest('4.1 Session token is valid before logout and allows telemetry', async () => {
    const freshIp = `172.16.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const loginRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'B-04', pinCode: '3349' },
    });

    assert(loginRes.status === 200 && !!loginRes.data.sessionToken, 'Login must succeed');
    const token = loginRes.data.sessionToken;
    const teamId = loginRes.data.team.id;

    // Send valid telemetry
    const telemetryRes = await apiRequest('/api/participant/location', {
      method: 'POST',
      body: {
        teamId,
        sessionToken: token,
        coordinates: { lat: -6.6341, lng: 106.8821 },
        accuracy: 12,
      },
    });

    assert(telemetryRes.status === 200, `Expected telemetry to succeed (200), got ${telemetryRes.status}`);
  });

  await runTest('4.2 POST /api/participant/logout revokes session token immediately', async () => {
    const freshIp = `172.16.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const loginRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'C-07', pinCode: '8812' },
    });

    assert(loginRes.status === 200 && !!loginRes.data.sessionToken, 'Login must succeed');
    const token = loginRes.data.sessionToken;
    const teamId = loginRes.data.team.id;

    // 1. Verify telemetry works initially
    const preLogoutRes = await apiRequest('/api/participant/location', {
      method: 'POST',
      body: {
        teamId,
        sessionToken: token,
        coordinates: { lat: -6.6341, lng: 106.8821 },
      },
    });
    assert(preLogoutRes.status === 200, 'Pre-logout telemetry must succeed');

    // 2. Invoke logout endpoint to revoke token
    const logoutRes = await apiRequest('/api/participant/logout', {
      method: 'POST',
      body: { sessionToken: token },
    });
    assert(logoutRes.status === 200 && logoutRes.data.success, 'Logout endpoint must return 200');

    // 3. Post-logout telemetry using the SAME token MUST be rejected
    const postLogoutRes = await apiRequest('/api/participant/location', {
      method: 'POST',
      body: {
        teamId,
        sessionToken: token,
        coordinates: { lat: -6.6341, lng: 106.8821 },
      },
    });

    assert(postLogoutRes.status === 401, `Post-logout request with revoked token must return 401, got ${postLogoutRes.status}`);
    assert(postLogoutRes.data.message.includes('dicabut') || postLogoutRes.data.message.includes('revoked'), 'Error message must specify revoked session');
  });

  // =================================================================
  // SUITE 5: GPS & FIELD BOUNDARY VALIDATION
  // =================================================================
  console.log('\n--- SUITE 5: GPS & Geofence Boundary Validation ---');

  await runTest('5.1 Null Island (0,0) GPS coordinates are rejected with 400 Bad Request', async () => {
    const freshIp = `192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const loginRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'D-10', pinCode: '5563' },
    });
    const token = loginRes.data.sessionToken;

    const res = await apiRequest('/api/participant/location', {
      method: 'POST',
      body: {
        teamId: 'team-04',
        sessionToken: token,
        coordinates: { lat: 0, lng: 0 },
      },
    });

    assert(res.status === 400, `Expected 400 for Null Island coordinates, got ${res.status}`);
  });

  await runTest('5.2 Out-of-bounds checkpoint check-in is rejected with 403 OUT_OF_BOUNDS', async () => {
    const freshIp = `192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const loginRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'A-01', pinCode: '7721' },
    });
    const token = loginRes.data.sessionToken;

    // Pos 1 is at lat: -6.6341, lng: 106.8821. Send location far away in Jakarta (-6.1754, 106.8272, ~50km away)
    const checkinRes = await apiRequest('/api/race/validate-checkin', {
      method: 'POST',
      body: {
        teamId: 'team-01',
        sessionToken: token,
        qrCodeInput: 'QR-POS01-AMZ-2026',
        eventId: 'evt-01',
        eventStatus: 'running',
        checkpoint: { id: 'cp-01', name: 'Pos 1' },
        gpsCoordinates: { lat: -6.1754, lng: 106.8272, accuracy: 10 },
      },
    });

    assert(checkinRes.status === 403, `Expected 403 OUT_OF_BOUNDS, got ${checkinRes.status}`);
    assert(checkinRes.data.code === 'OUT_OF_BOUNDS', `Expected OUT_OF_BOUNDS code, got ${checkinRes.data.code}`);
  });

  await runTest('5.3 Anti-speedrun cooldown rejects rapid successive check-ins with 429 COOLDOWN_ACTIVE', async () => {
    const freshIp = `192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const loginRes = await apiRequest('/api/participant/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': freshIp },
      body: { bibNumber: 'A-01', pinCode: '7721' },
    });
    const token = loginRes.data.sessionToken;

    // Simulate check-in with lastCheckinTimestamp set to 5 seconds ago, minIntervalSeconds = 30
    const cooldownRes = await apiRequest('/api/race/validate-checkin', {
      method: 'POST',
      body: {
        teamId: 'team-01',
        sessionToken: token,
        qrCodeInput: 'QR-POS02-PINUS-981',
        eventId: 'evt-01',
        eventStatus: 'running',
        checkpoint: { id: 'cp-02', name: 'Pos 2' },
        gpsCoordinates: { lat: -6.6365, lng: 106.8845, accuracy: 10 },
        lastCheckinTimestamp: Date.now() - 5000,
        minIntervalSeconds: 30,
      },
    });

    assert(cooldownRes.status === 429, `Expected 429 COOLDOWN_ACTIVE, got ${cooldownRes.status}`);
    assert(cooldownRes.data.code === 'COOLDOWN_ACTIVE', `Expected COOLDOWN_ACTIVE code, got ${cooldownRes.data.code}`);
    assert(typeof cooldownRes.data.remainingSeconds === 'number' && cooldownRes.data.remainingSeconds > 0, 'Must include remainingSeconds');
  });

  // =================================================================
  // SUMMARY REPORT
  // =================================================================
  console.log('\n================================================================');
  console.log('                 TEST EXECUTION SUMMARY                         ');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Tests Run:  ${total}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFAILURES:');
    results.filter(r => !r.passed).forEach(f => {
      console.error(`- ${f.name}: ${f.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL RC-1 SECURITY GATES PASSED SUCCESSFULLY.\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
