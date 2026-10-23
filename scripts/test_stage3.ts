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

async function runStage3Tests() {
  console.log('====================================================');
  console.log('  STAGE 3 - MANUAL SUBSCRIPTION & EXPIRATION TEST SUITE');
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
    // 1. Provision Super Admin
    const saBootstrap = await request('/api/admin/bootstrap-super-admin', {
      method: 'POST',
      body: {
        email: 'superadmin_stage3@platform.com',
        password: 'SuperPasswordStage3!',
        displayName: 'Super Admin Stage 3',
        bootstrapKey: 'bootstrap-secret-2026',
      },
    });
    assert(saBootstrap.status === 200 && !!saBootstrap.json.token, '1. Provision Super Admin');
    const saToken = saBootstrap.json.token;

    // 2. Test Active Client (now < expiresAt) -> Access Granted
    const activeClientRes = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        name: 'Active Client Corp',
        email: 'active@corp.com',
        durationDays: 10,
      },
    });
    const activeClientId = activeClientRes.json.client?.id;
    assert(activeClientRes.status === 200 && !!activeClientId, '2. Super Admin creates Active Client (10 days duration)');

    // Create Admin Client User for Active Client
    await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        email: 'admin@activecorp.com',
        password: 'Password123!',
        role: 'ADMIN_CLIENT',
        clientId: activeClientId,
      },
    });

    const activeLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@activecorp.com', password: 'Password123!' },
    });
    assert(activeLogin.status === 200 && !!activeLogin.json.token, '3. Active Client Admin Login Successful (Access Granted)');

    // 3. Test Already Expired Client (now > expiresAt) -> Access Locked
    const expiredClientRes = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        name: 'Expired Client Corp',
        email: 'expired@corp.com',
        durationDays: -5, // Expired 5 days ago
      },
    });
    const expiredClientId = expiredClientRes.json.client?.id;

    await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        email: 'admin@expiredcorp.com',
        password: 'Password123!',
        role: 'ADMIN_CLIENT',
        clientId: expiredClientId,
      },
    });

    const expiredLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@expiredcorp.com', password: 'Password123!' },
    });
    assert(
      expiredLogin.status === 403 && expiredLogin.json.code === 'CLIENT_EXPIRED',
      '4. Test Already Expired Client (now > expiresAt) -> Access Locked (403 CLIENT_EXPIRED)'
    );

    // 4. Test Exact Expiry Boundary (now === expiresAt) -> Access Locked
    const exactBoundaryTime = new Date(Date.now() - 1000).toISOString(); // 1 second ago or exact boundary
    const exactBoundaryClientRes = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        name: 'Exact Boundary Corp',
        email: 'boundary@corp.com',
        durationDays: 1,
      },
    });
    const boundaryClientId = exactBoundaryClientRes.json.client?.id;

    // Force date to exact boundary or past
    await request(`/api/admin/clients/${boundaryClientId}/dates`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${saToken}` },
      body: { expiresAt: exactBoundaryTime },
    });

    await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        email: 'admin@boundarycorp.com',
        password: 'Password123!',
        role: 'ADMIN_CLIENT',
        clientId: boundaryClientId,
      },
    });

    const boundaryLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@boundarycorp.com', password: 'Password123!' },
    });
    assert(
      boundaryLogin.status === 403 && boundaryLogin.json.code === 'CLIENT_EXPIRED',
      '5. Test Exact Expiry Boundary (now >= expiresAt) -> Access Locked (403 CLIENT_EXPIRED)'
    );

    // 5. Test Suspended Account (status === 'suspended') -> Access Locked
    await request(`/api/admin/clients/${activeClientId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${saToken}` },
      body: { status: 'suspended', notes: 'Ditangguhkan karena verifikasi pembayaran pending' },
    });

    const suspendedLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@activecorp.com', password: 'Password123!' },
    });
    assert(
      suspendedLogin.status === 403 && suspendedLogin.json.code === 'CLIENT_SUSPENDED',
      '6. Test Suspended Account -> Access Locked (403 CLIENT_SUSPENDED)'
    );

    // Unsuspend Active Client
    await request(`/api/admin/clients/${activeClientId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${saToken}` },
      body: { status: 'active', notes: 'Diaktifkan kembali oleh Super Admin' },
    });

    // 6. Test Extension Policy for Unexpired Client (Remaining days preserved!)
    const clientAOriginalExpiresAt = activeClientRes.json.client?.expiresAt;
    const renewUnexpired = await request(`/api/admin/clients/${activeClientId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        durationDays: 30,
        paymentAmount: 1500000,
        paymentRef: 'TRX-MANUAL-88219',
        notes: 'Pembayaran manual transfer BCA 30 hari tambahan',
      },
    });

    const newExpiresUnexpired = renewUnexpired.json.client?.expiresAt;
    const expectedExpiresMs = new Date(clientAOriginalExpiresAt).getTime() + 30 * 24 * 60 * 60 * 1000;

    assert(
      renewUnexpired.status === 200 &&
        renewUnexpired.json.calculatedFrom === 'previous_expiration' &&
        Math.abs(new Date(newExpiresUnexpired).getTime() - expectedExpiresMs) < 5000,
      '7. Extension Policy for Unexpired Client: Remaining active time preserved (+30 days appended to previous expiresAt)'
    );

    // 7. Test Extension Policy for Expired Client (Calculated starting from now)
    const renewExpired = await request(`/api/admin/clients/${expiredClientId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        durationDays: 30,
        paymentAmount: 1500000,
        paymentRef: 'TRX-MANUAL-99201',
        notes: 'Perpanjangan akun kedaluwarsa via Kasir',
      },
    });

    const newExpiresExpired = renewExpired.json.client?.expiresAt;
    const expectedExpiredCalcMs = Date.now() + 30 * 24 * 60 * 60 * 1000;

    assert(
      renewExpired.status === 200 &&
        renewExpired.json.calculatedFrom === 'current_time' &&
        Math.abs(new Date(newExpiresExpired).getTime() - expectedExpiredCalcMs) < 10000,
      '8. Extension Policy for Expired Client: Renewal calculated starting from current server time (now + 30 days)'
    );

    // Verify Expired Client is now reactive and can login
    const reenabledLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@expiredcorp.com', password: 'Password123!' },
    });
    assert(reenabledLogin.status === 200, '9. Expired Client successfully reactivated after manual renewal');

    // 8. Test Missing / Incomplete Subscription Data (expiresAt missing) -> Access Locked
    const brokenClientRes = await request('/api/admin/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        name: 'Broken Data Corp',
        email: 'broken@corp.com',
        durationDays: 1,
      },
    });
    const brokenClientId = brokenClientRes.json.client?.id;

    // Erase expiresAt date on server
    await request(`/api/admin/clients/${brokenClientId}/dates`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${saToken}` },
      body: { expiresAt: 'NONE' },
    });

    await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: {
        email: 'admin@brokencorp.com',
        password: 'Password123!',
        role: 'ADMIN_CLIENT',
        clientId: brokenClientId,
      },
    });

    const brokenLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@brokencorp.com', password: 'Password123!' },
    });
    assert(
      brokenLogin.status === 403 && brokenLogin.json.code === 'CLIENT_EXPIRED',
      '10. Missing / Incomplete Subscription Data -> Access Locked (Requirement #9: No infinite access allowed)'
    );

    // 9. Test Subscription History & Manual Billing Audit Trail Retrieval
    const historyRes = await request(`/api/admin/clients/${activeClientId}/history`, {
      headers: { Authorization: `Bearer ${saToken}` },
    });
    assert(
      historyRes.status === 200 &&
        Array.isArray(historyRes.json.history) &&
        historyRes.json.history.length >= 2 &&
        historyRes.json.history.some((h: any) => h.paymentRef === 'TRX-MANUAL-88219'),
      '11. Subscription Payment & Audit History stored and retrieved correctly with transaction reference & amounts'
    );

    // 10. Test Non-Super Admin Attempting Renewal / Extension -> Rejected (403)
    const clientAdminToken = activeLogin.json.token;
    const unauthorizedRenewal = await request(`/api/admin/clients/${activeClientId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientAdminToken}` },
      body: { durationDays: 30 },
    });
    assert(
      unauthorizedRenewal.status === 403 && unauthorizedRenewal.json.code === 'FORBIDDEN',
      '12. Non-Super Admin prevented from extending subscription (403 FORBIDDEN)'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`STAGE 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runStage3Tests();
