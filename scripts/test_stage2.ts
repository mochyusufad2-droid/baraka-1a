import http from 'http';
import process from 'process';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = resp.status;
  const rawText = await resp.text();
  let json: any = {};
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    json = { rawText };
  }
  return { status, json };
}

async function runStage2Tests() {
  console.log('====================================================');
  console.log('  STAGE 2 - MULTI-TENANT SAAS INTEGRATION & NEGATIVE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.json.status === 'healthy', '1. Server Health Check Endpoint');

    // 2. Negative Test: Bootstrap Super Admin with invalid key
    const badBootstrap = await request('/api/admin/bootstrap-super-admin', {
      method: 'POST',
      body: {
        email: 'superadmin@platform.com',
        password: 'SuperPassword2026!',
        bootstrapKey: 'wrong-secret-key',
      },
    });
    assert(
      badBootstrap.status === 403 && badBootstrap.json.code === 'INVALID_BOOTSTRAP_KEY',
      '2. Negative Test: Bootstrap Super Admin with invalid secret key rejected (403)'
    );

    // 3. Positive Test: Bootstrap Super Admin with valid key
    const goodBootstrap = await request('/api/admin/bootstrap-super-admin', {
      method: 'POST',
      body: {
        email: 'superadmin@platform.com',
        password: 'SuperPassword2026!',
        displayName: 'Platform Owner',
        bootstrapKey: 'bootstrap-secret-2026',
      },
    });
    assert(
      goodBootstrap.status === 200 && !!goodBootstrap.json.token,
      '3. Positive Test: Super Admin Provisioned via trusted secret key'
    );
    const superAdminToken = goodBootstrap.json.token;

    // 4. Positive Test: Super Admin creates active Client A account
    const createClientA = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        name: 'Client A - Eka Event Ltd',
        email: 'admin@clienta.com',
        durationDays: 30,
      },
    });
    assert(
      createClientA.status === 200 && !!createClientA.json.client?.id,
      '4. Super Admin creates Client A Account (Active 30 days)'
    );
    const clientAId = createClientA.json.client?.id;

    // 5. Super Admin creates expired Client Expired account
    const createClientExpired = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        name: 'Client Expired Ltd',
        email: 'admin@expired.com',
        durationDays: -1, // Expired yesterday
      },
    });
    assert(
      createClientExpired.status === 200 && !!createClientExpired.json.client?.id,
      '5. Super Admin creates Expired Client Account (-1 day duration)'
    );
    const clientExpiredId = createClientExpired.json.client?.id;

    // 6. Super Admin creates Admin Client User for Client A
    const createAdminAUser = await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        email: 'admin@clienta.com',
        password: 'ClientAPassword2026!',
        displayName: 'Admin Client A',
        role: 'ADMIN_CLIENT',
        clientId: clientAId,
      },
    });
    assert(
      createAdminAUser.status === 200 && createAdminAUser.json.user?.role === 'ADMIN_CLIENT',
      '6. Super Admin creates Admin Client User for Client A'
    );

    // 7. Login as Admin Client A
    const loginAdminA = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@clienta.com',
        password: 'ClientAPassword2026!',
      },
    });
    assert(
      loginAdminA.status === 200 && !!loginAdminA.json.token,
      '7. Admin Client A successfully logs in and gets session token'
    );
    const adminAToken = loginAdminA.json.token;

    // 8. Negative Security Test: Admin Client tries to access Super Admin endpoint (/api/admin/clients)
    const clientAAccessClients = await request('/api/admin/clients', {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert(
      clientAAccessClients.status === 403 && clientAAccessClients.json.code === 'FORBIDDEN',
      '8. Negative Security Test: Admin Client blocked from Super Admin endpoints (403 FORBIDDEN)'
    );

    // 9. Negative Security Test: Role Escalation Prevention
    const roleEscalationAttempt = await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
      body: {
        email: 'hacker@clienta.com',
        password: 'HackerPassword123!',
        role: 'SUPER_ADMIN', // Attempting to create Super Admin!
      },
    });
    assert(
      roleEscalationAttempt.status === 403 && roleEscalationAttempt.json.code === 'ROLE_ESCALATION_DENIED',
      '9. Negative Security Test: Admin Client prevented from creating SUPER_ADMIN (403 ROLE_ESCALATION_DENIED)'
    );

    // 10. Negative Security Test: Client ID Manipulation Prevention
    const clientIdTamperAttempt = await request('/api/admin/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
      body: {
        title: 'Tampered Event',
        subtitle: 'Should belong to Client A regardless of body',
        eventType: 'orienteering',
        clientId: 'fake-other-client-id', // Trying to claim another client!
      },
    });
    assert(
      clientIdTamperAttempt.status === 200 && clientIdTamperAttempt.json.event?.clientId === clientAId,
      `10. Negative Security Test: Client ID manipulation overridden to caller's verified clientId (${clientAId})`
    );

    // 11. Super Admin creates Admin User for Expired Client
    await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        email: 'admin@expired.com',
        password: 'ExpiredPassword2026!',
        role: 'ADMIN_CLIENT',
        clientId: clientExpiredId,
      },
    });

    // 12. Negative Security Test: Expired Client Account Login & Access Denial
    const expiredLogin = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@expired.com',
        password: 'ExpiredPassword2026!',
      },
    });
    assert(
      expiredLogin.status === 403 && expiredLogin.json.code === 'CLIENT_EXPIRED',
      '12. Negative Security Test: Expired Client Account locked out during login (403 CLIENT_EXPIRED)'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runStage2Tests();
