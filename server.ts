import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any = null;
try {
  const lib = (admin as any).default || admin;
  const appModule = lib.default || lib;
  if (!appModule.apps || appModule.apps.length === 0) {
    appModule.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'coral-league-3n2tx',
    });
  }
  db = typeof appModule.firestore === 'function' ? appModule.firestore() : appModule.default?.firestore();
} catch (err) {
  console.warn('[Firebase Admin SDK] Initialization notice:', err);
}

export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
export const SUPER_ADMIN_BOOTSTRAP_KEY = process.env.SUPER_ADMIN_BOOTSTRAP_KEY || crypto.randomBytes(16).toString('hex');
export const JUDGE_SECRET_KEY = process.env.JUDGE_SECRET_KEY || crypto.randomBytes(16).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.warn('[SECURITY NOTICE] SESSION_SECRET not provided. Generated cryptographically random runtime key.');
}
if (!process.env.SUPER_ADMIN_BOOTSTRAP_KEY) {
  console.warn('[SECURITY NOTICE] SUPER_ADMIN_BOOTSTRAP_KEY not provided. Generated cryptographically random runtime key.');
}
if (!process.env.JUDGE_SECRET_KEY) {
  console.warn('[SECURITY NOTICE] JUDGE_SECRET_KEY not provided. Generated cryptographically random runtime key.');
}

// In-Memory Token Revocation Store
export const REVOKED_TOKENS = new Set<string>();

// --- PBKDF2 PARTICIPANT PIN HASHING (10,000 iterations, 32 bytes, SHA-256) ---
export const PIN_HASH_ITERATIONS = 10000;
export const PIN_KEY_LENGTH = 32;
export const PIN_DIGEST = 'sha256';

export function generatePinSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashParticipantPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, PIN_HASH_ITERATIONS, PIN_KEY_LENGTH, PIN_DIGEST).toString('hex');
}

export function verifyParticipantPin(inputPin: string, expectedHash: string, salt: string): boolean {
  try {
    const computed = hashParticipantPin(inputPin, salt);
    const computedBuf = Buffer.from(computed, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (computedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// --- RATE LIMITING ARCHITECTURE (RC-1 SECURITY GATE) ---
// Per-BIB + IP: Max 5 attempts per 60 seconds
// Per-IP throttle: Max 20 attempts per 60 seconds (across all BIBs to prevent credential stuffing)
// Note for multi-instance deployment: Replace in-memory Maps with Redis (e.g. ioredis sliding window or rate-limit-redis)
export const loginAttemptsByBibAndIp = new Map<string, number[]>();
export const loginAttemptsByIp = new Map<string, number[]>();

export function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function checkAndRecordLoginAttempt(ip: string, bib: string): { allowed: boolean; retryAfterSeconds: number; reason?: string } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  // Clean old attempts for IP
  const ipAttempts = (loginAttemptsByIp.get(ip) || []).filter(ts => now - ts < windowMs);
  if (ipAttempts.length >= 20) {
    const oldest = ipAttempts[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    loginAttemptsByIp.set(ip, ipAttempts);
    return { allowed: false, retryAfterSeconds: retryAfter, reason: 'Batas frekuensi permintaan login per IP terlampaui.' };
  }

  // Clean old attempts for BIB + IP composite key
  const compositeKey = `${ip}:${bib.toUpperCase()}`;
  const bibIpAttempts = (loginAttemptsByBibAndIp.get(compositeKey) || []).filter(ts => now - ts < windowMs);
  if (bibIpAttempts.length >= 5) {
    const oldest = bibIpAttempts[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    loginAttemptsByBibAndIp.set(compositeKey, bibIpAttempts);
    return { allowed: false, retryAfterSeconds: retryAfter, reason: 'Terlalu banyak percobaan login untuk nomor BIB ini.' };
  }

  // Record attempt
  ipAttempts.push(now);
  bibIpAttempts.push(now);
  loginAttemptsByIp.set(ip, ipAttempts);
  loginAttemptsByBibAndIp.set(compositeKey, bibIpAttempts);

  return { allowed: true, retryAfterSeconds: 0 };
}

// Clean up expired rate limiting memory buckets periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [key, timestamps] of loginAttemptsByBibAndIp.entries()) {
    const valid = timestamps.filter(ts => now - ts < windowMs);
    if (valid.length === 0) loginAttemptsByBibAndIp.delete(key);
    else loginAttemptsByBibAndIp.set(key, valid);
  }
  for (const [key, timestamps] of loginAttemptsByIp.entries()) {
    const valid = timestamps.filter(ts => now - ts < windowMs);
    if (valid.length === 0) loginAttemptsByIp.delete(key);
    else loginAttemptsByIp.set(key, valid);
  }
}, 5 * 60 * 1000);

// Authoritative Server-Side Team Credentials Registry (Hashed with individual salts - Zero plaintext PINs)
const AUTHORITATIVE_TEAMS: Record<string, { id: string; eventId: string; name: string; bibNumber: string; salt: string; hashedPin: string; category: string; color: string; status: string; clientId?: string }> = {
  'A-01': { id: 'team-01', eventId: 'evt-01', clientId: 'client-default', name: 'Garuda Merah', bibNumber: 'A-01', salt: 'cd65ebbf12507ac6dc3204739bf09ad7', hashedPin: '69a4df2b8c4af4f7202f1da4d9aa9a50ac41409d575feec0abc692293a7ca4f7', category: 'Divisi Komersial', color: 'bg-red-600', status: 'racing' },
  'B-04': { id: 'team-02', eventId: 'evt-01', clientId: 'client-default', name: 'Elang Perkasa', bibNumber: 'B-04', salt: 'd7a81ced414ee71fd7af1b2e1a37a474', hashedPin: '1770d3605d356648db186dad2dd3c4e98b8acb1efbe5fe093cce27e089f162cd', category: 'Divisi Operasional & IT', color: 'bg-blue-600', status: 'racing' },
  'C-07': { id: 'team-03', eventId: 'evt-01', clientId: 'client-default', name: 'Badak Tangguh', bibNumber: 'C-07', salt: '4fc0539fd908d86195de0ca244f210c9', hashedPin: 'ad54b10ae6043e4718f9af42f6beed2266f19e3021c54a4a4eef45245b39a214', category: 'Divisi Keuangan & Risiko', color: 'bg-amber-600', status: 'racing' },
  'D-10': { id: 'team-04', eventId: 'evt-01', clientId: 'client-default', name: 'Rajawali Rimba', bibNumber: 'D-10', salt: '934e219cd00ea411f2c34acb5223fa67', hashedPin: '58c93175a30eff5f62bf328d3c34c2e509257c2b0224f594a3587b0aed668c62', category: 'Divisi Logistik & Umum', color: 'bg-emerald-600', status: 'ready' },
  'E-02': { id: 'team-05', eventId: 'evt-02', clientId: 'client-default', name: 'Kujang Siliwangi', bibNumber: 'E-02', salt: '419ccc8a0e87bf7d33981f09b50eba27', hashedPin: '716d41b7a85aa2440d503e77db77d121145d1d78bb7ebda931e269a58d3958be', category: 'Kategori Umum', color: 'bg-teal-600', status: 'racing' },
  'F-09': { id: 'team-06', eventId: 'evt-02', clientId: 'client-default', name: 'Rimbu Explorer', bibNumber: 'F-09', salt: '2cd13fdb519fce52ce8ef34f9f1ba175', hashedPin: '3661b4c637f504db0c1ddb5d587a7667b72486a9db18a1f08d3c273a0dc5169b', category: 'Kategori Mahasiswa', color: 'bg-indigo-600', status: 'racing' },
};

// --- STAGE 2 MULTI-TENANT SAAS TYPES & IN-MEMORY DEV REGISTRIES ---

export type CanonicalUserRole = 'SUPER_ADMIN' | 'EVENT_ADMIN' | 'PARTICIPANT' | 'JUDGE';
export type UserRole = CanonicalUserRole | 'ADMIN_CLIENT' | 'JUDGE_FACILITATOR';

export function normalizeUserRole(role?: string | null): CanonicalUserRole {
  if (!role) return 'PARTICIPANT';
  const upper = role.toUpperCase();
  if (upper === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (upper === 'EVENT_ADMIN' || upper === 'ADMIN_CLIENT') return 'EVENT_ADMIN';
  if (upper === 'JUDGE' || upper === 'JUDGE_FACILITATOR') return 'JUDGE';
  return 'PARTICIPANT';
}

export interface AdminSessionPayload {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  clientId?: string;
  timestamp: number;
}

export interface ClientAccountData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'expired';
  startDate: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface AdminUserData {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  clientId?: string;
  assignedEventIds?: string[];
  status: 'active' | 'inactive';
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

// Persistent file-backed SaaS store so clients and admin accounts never disappear on server restart / relogin
const STORE_FILE = path.join(__dirname, '.saas_store.json');
let saasStore: {
  clients: Record<string, ClientAccountData>;
  adminUsers: Record<string, AdminUserData>;
  events: Record<string, any>;
  subscriptionHistory: Record<string, any[]>;
} = {
  clients: {
    'client-default': {
      id: 'client-default',
      name: 'Default Client Organization',
      email: 'client@default.com',
      status: 'active',
      startDate: new Date('2026-01-01').toISOString(),
      expiresAt: new Date('2027-12-31').toISOString(),
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-01-01').toISOString(),
    },
  },
  adminUsers: {},
  events: {},
  subscriptionHistory: {},
};

try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.clients) saasStore.clients = { ...saasStore.clients, ...parsed.clients };
    if (parsed.adminUsers) saasStore.adminUsers = { ...saasStore.adminUsers, ...parsed.adminUsers };
    if (parsed.events) saasStore.events = { ...saasStore.events, ...parsed.events };
    if (parsed.subscriptionHistory) saasStore.subscriptionHistory = { ...saasStore.subscriptionHistory, ...parsed.subscriptionHistory };
  }
} catch (e) {
  console.warn('[SaasStore] Error loading store file:', e);
}

function saveSaasStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(saasStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SaasStore] Error saving store file:', e);
  }
}

const MOCK_CLIENTS = saasStore.clients;
const MOCK_ADMIN_USERS = saasStore.adminUsers;
const MOCK_EVENTS = saasStore.events;
const MOCK_SUBSCRIPTION_HISTORY = saasStore.subscriptionHistory;

function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SESSION_SECRET, 1000, 32, 'sha256').toString('hex');
}

function generateAdminSessionToken(user: { uid: string; email: string; displayName?: string; role: UserRole; clientId?: string }): string {
  const timestamp = Date.now();
  const payloadStr = JSON.stringify({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
    role: user.role,
    clientId: user.clientId || '',
    timestamp,
  });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  return Buffer.from(`${payloadStr}::${hmac}`).toString('base64');
}

function verifyAdminSessionToken(token: string): { valid: boolean; payload?: AdminSessionPayload; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split('::');
    if (parts.length < 2) return { valid: false, reason: 'Format token admin tidak sah.' };
    const [payloadStr, hmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
    if (hmac !== expectedHmac) {
      return { valid: false, reason: 'Tanda tangan token admin tidak sah.' };
    }
    const payload: AdminSessionPayload = JSON.parse(payloadStr);
    // 24 hour expiry
    if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false, reason: 'Sesi admin telah kedaluwarsa. Harap login kembali.' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Gagal memverifikasi token sesi admin.' };
  }
}

async function checkClientActiveStatus(clientId?: string, referenceTime: Date = new Date()): Promise<{ active: boolean; reason?: string; code?: string; client?: any }> {
  if (!clientId || clientId === 'client-default') return { active: true };

  let clientData: any = null;

  if (db) {
    try {
      const clientDoc = await db.collection('clientAccounts').doc(clientId).get();
      if (clientDoc.exists) {
        clientData = clientDoc.data();
      }
    } catch (err) {
      console.warn('[checkClientActiveStatus Firestore notice]:', err);
    }
  }

  if (!clientData) {
    clientData = MOCK_CLIENTS[clientId] || null;
  }

  if (!clientData) {
    return { active: false, code: 'CLIENT_NOT_FOUND', reason: 'Data akun client tidak ditemukan.' };
  }

  // 1. Check suspended status
  if (clientData.status === 'suspended') {
    return { active: false, code: 'CLIENT_SUSPENDED', reason: 'Akun client ini sedang ditangguhkan oleh Super Admin.', client: clientData };
  }

  // 2. Requirement #9: Missing or invalid expiresAt date -> Access Locked
  if (!clientData.expiresAt || typeof clientData.expiresAt !== 'string') {
    return { active: false, code: 'CLIENT_EXPIRED', reason: 'Data tanggal kedaluwarsa client tidak lengkap atau hilang. Akses terkunci.', client: clientData };
  }

  const expiresTime = new Date(clientData.expiresAt).getTime();
  if (isNaN(expiresTime)) {
    return { active: false, code: 'CLIENT_EXPIRED', reason: 'Format tanggal kedaluwarsa client tidak valid. Akses terkunci.', client: clientData };
  }

  // 3. Requirement #4 & #5: Exact match check: referenceTime >= expiresAt -> Access Locked
  const nowMs = referenceTime.getTime();
  if (nowMs >= expiresTime) {
    return { active: false, code: 'CLIENT_EXPIRED', reason: 'Masa aktif langganan client telah berakhir. Akses terkunci.', client: clientData };
  }

  return { active: true, client: clientData };
}

function calculateSubscriptionExtension(currentExpiresAt: string | null | undefined, extensionDays: number, referenceDate: Date = new Date()): { previousExpiresAt: string | null; newExpiresAt: string; calculatedFrom: 'previous_expiration' | 'current_time' } {
  const nowMs = referenceDate.getTime();
  let existingExpiresMs = 0;

  if (currentExpiresAt) {
    const parsed = new Date(currentExpiresAt).getTime();
    if (!isNaN(parsed)) {
      existingExpiresMs = parsed;
    }
  }

  // Requirement #8:
  // If NOT expired yet (now < existingExpiresMs), extend from existingExpiresMs (preserve remaining active time).
  // If ALREADY expired (now >= existingExpiresMs), extend from referenceDate (now).
  const isNotExpiredYet = existingExpiresMs > nowMs;
  const baseMs = isNotExpiredYet ? existingExpiresMs : nowMs;
  const extensionMs = Number(extensionDays) * 24 * 60 * 60 * 1000;
  const newExpiresMs = baseMs + extensionMs;

  return {
    previousExpiresAt: currentExpiresAt || null,
    newExpiresAt: new Date(newExpiresMs).toISOString(),
    calculatedFrom: isNotExpiredYet ? 'previous_expiration' : 'current_time',
  };
}

async function requireAdminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token otorisasi admin tidak ditemukan. Silakan login terlebih dahulu.',
    });
  }

  const verified = verifyAdminSessionToken(token);
  if (!verified.valid || !verified.payload) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: verified.reason || 'Token otorisasi admin tidak sah.',
    });
  }

  const payload = verified.payload;

  // Enforce client account active check for ADMIN_CLIENT / EVENT_ADMIN role
  if ((payload.role === 'ADMIN_CLIENT' || payload.role === 'EVENT_ADMIN') && payload.clientId) {
    const clientCheck = await checkClientActiveStatus(payload.clientId);
    if (!clientCheck.active) {
      return res.status(403).json({
        success: false,
        code: clientCheck.code || 'CLIENT_LOCKED',
        message: clientCheck.reason || 'Akses akun client terkunci.',
      });
    }
  }

  req.adminUser = payload;
  next();
}

function generateSessionToken(teamId: string, bibNumber: string): string {
  const timestamp = Date.now();
  const payload = `${teamId}:${bibNumber}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

function verifySessionToken(token: string, expectedTeamId: string): { valid: boolean; reason?: string } {
  try {
    if (REVOKED_TOKENS.has(token)) {
      return { valid: false, reason: 'Sesi tim telah dicabut / logout (revoked). Harap login ulang.' };
    }
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 4) return { valid: false, reason: 'Format token sesi rusak.' };
    const [teamId, bibNumber, timestampStr, hmac] = parts;

    if (teamId !== expectedTeamId) {
      return { valid: false, reason: `Token sesi milik tim ${bibNumber}, tidak sah untuk tim ${expectedTeamId}.` };
    }

    const timestamp = Number(timestampStr);
    // 24 hours expiry
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false, reason: 'Sesi login telah kedaluwarsa (lebih dari 24 jam). Harap login ulang.' };
    }

    const payload = `${teamId}:${bibNumber}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
      return { valid: false, reason: 'Tanda tangan token sesi tidak sah.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Gagal memverifikasi token sesi.' };
  }
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isValidCoordinate(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Reject Null Island (0,0) - typical uninitialized GPS default
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

// Authoritative Checkpoint Registry on Server (Never trust client-tampered coordinates!)
interface AuthoritativeCheckpoint {
  id: string;
  eventId: string;
  number: number;
  name: string;
  coordinates: { lat: number; lng: number };
  radiusMeters: number;
  qrCodeValue: string;
  points: number;
  status: 'active' | 'locked' | 'completed';
}

const AUTHORITATIVE_CHECKPOINTS: Record<string, AuthoritativeCheckpoint> = {
  'cp-01': {
    id: 'cp-01',
    eventId: 'evt-01',
    number: 1,
    name: 'Pos 1: Gerbang Keberangkatan',
    coordinates: { lat: -6.6341, lng: 106.8821 },
    radiusMeters: 80,
    qrCodeValue: 'QR-POS01-AMZ-2026',
    points: 100,
    status: 'active',
  },
  'cp-02': {
    id: 'cp-02',
    eventId: 'evt-01',
    number: 2,
    name: 'Pos 2: Lembah Pinus & Yel-Yel',
    coordinates: { lat: -6.6365, lng: 106.8845 },
    radiusMeters: 80,
    qrCodeValue: 'QR-POS02-PINUS-981',
    points: 150,
    status: 'active',
  },
  'cp-03': {
    id: 'cp-03',
    eventId: 'evt-01',
    number: 3,
    name: 'Pos 3: Azimuth Kompas Batu Hitam',
    coordinates: { lat: -6.6398, lng: 106.8869 },
    radiusMeters: 90,
    qrCodeValue: 'QR-POS03-AZIMUTH-452',
    points: 200,
    status: 'active',
  },
  'cp-04': {
    id: 'cp-04',
    eventId: 'evt-01',
    number: 4,
    name: 'Pos 4: Jembatan Tali Spider Web',
    coordinates: { lat: -6.6421, lng: 106.8893 },
    radiusMeters: 80,
    qrCodeValue: 'QR-POS04-SPIDER-771',
    points: 250,
    status: 'locked',
  },
  'cp-05': {
    id: 'cp-05',
    eventId: 'evt-01',
    number: 5,
    name: 'Pos 5: Danau Cermin & Teka-Teki Logika',
    coordinates: { lat: -6.6455, lng: 106.8920 },
    radiusMeters: 100,
    qrCodeValue: 'QR-POS05-LAKE-318',
    points: 200,
    status: 'locked',
  },
  'cp-06': {
    id: 'cp-06',
    eventId: 'evt-01',
    number: 6,
    name: 'Pos 6: Garis Finish & Verifikasi Akhir',
    coordinates: { lat: -6.6335, lng: 106.8810 },
    radiusMeters: 80,
    qrCodeValue: 'QR-POS06-FINISH-GOLD',
    points: 300,
    status: 'locked',
  },
};

// In-memory processed scan keys for server-level idempotency
const PROCESSED_SCAN_RECEIPTS = new Map<string, { timestamp: number; points: number; checkpointName: string }>();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'Orienteering Amazing Race Authority Server',
      serverTime: new Date().toISOString(),
    });
  });

  // --- STAGE 2 MULTI-TENANT SAAS ADMINISTRATIVE ENDPOINTS ---

  // 1. Provision / Bootstrap Super Admin (Protected by trusted server key)
  app.post('/api/admin/bootstrap-super-admin', async (req, res) => {
    try {
      const { email, password, displayName, bootstrapKey } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !password || !bootstrapKey) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_FIELDS',
          message: 'Email, password, dan kunci otorisasi bootstrap (bootstrapKey) wajib diisi.',
        });
      }

      // Timing-safe comparison against configured SUPER_ADMIN_BOOTSTRAP_KEY
      const inputKeyBuf = Buffer.from(String(bootstrapKey).trim());
      const expectedKeyBuf = Buffer.from(SUPER_ADMIN_BOOTSTRAP_KEY);
      const isKeyValid = inputKeyBuf.length === expectedKeyBuf.length && crypto.timingSafeEqual(inputKeyBuf, expectedKeyBuf);

      if (!isKeyValid) {
        return res.status(403).json({
          success: false,
          code: 'INVALID_BOOTSTRAP_KEY',
          message: 'Kunci otorisasi bootstrap Super Admin tidak sah.',
        });
      }

      const uid = 'sa-' + crypto.randomBytes(6).toString('hex');
      const pwdHash = hashPassword(password);
      const now = new Date().toISOString();

      const userData: AdminUserData = {
        uid,
        email: cleanEmail,
        displayName: displayName || 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'active',
        passwordHash: pwdHash,
        createdAt: now,
        updatedAt: now,
      };

      if (db) {
        try {
          await db.collection('adminUsers').doc(uid).set(userData);
        } catch (e) {
          console.warn('[DB write notice]:', e);
        }
      }
      MOCK_ADMIN_USERS[cleanEmail] = userData;
      saveSaasStore();

      const token = generateAdminSessionToken(userData);

      return res.json({
        success: true,
        message: 'Super Admin berhasil diprovosi.',
        token,
        user: {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          status: userData.status,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Gagal bootstrap Super Admin.' });
    }
  });

  // 2. Admin Login Endpoint (Verifies role & checks active client subscription)
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
      }

      let user: AdminUserData | null = null;

      if (db) {
        try {
          const snap = await db.collection('adminUsers').where('email', '==', cleanEmail).limit(1).get();
          if (!snap.empty) {
            user = snap.docs[0].data() as AdminUserData;
          }
        } catch (dbErr) {
          console.warn('[Admin Login DB Error]:', dbErr);
        }
      }

      if (!user) {
        user = MOCK_ADMIN_USERS[cleanEmail] || null;
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Akun admin tidak ditemukan.' });
      }

      const inputHash = hashPassword(password);
      if (user.passwordHash !== inputHash) {
        return res.status(401).json({ success: false, message: 'Password tidak valid.' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Akun admin Anda sedang tidak aktif.' });
      }

      // Enforce client account subscription status for ADMIN_CLIENT
      if (user.role === 'ADMIN_CLIENT' && user.clientId) {
        const clientCheck = await checkClientActiveStatus(user.clientId);
        if (!clientCheck.active) {
          return res.status(403).json({
            success: false,
            code: clientCheck.code || 'CLIENT_LOCKED',
            message: clientCheck.reason || 'Akun client terkunci.',
          });
        }
      }

      const token = generateAdminSessionToken(user);

      return res.json({
        success: true,
        token,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          clientId: user.clientId,
          status: user.status,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Terjadi kesalahan sistem saat login.' });
    }
  });

  // 3. Current Authenticated Admin Identity
  app.get('/api/admin/me', requireAdminAuth, async (req: any, res) => {
    const user = req.adminUser;
    let clientInfo = null;
    if (user.clientId) {
      if (db) {
        try {
          const snap = await db.collection('clientAccounts').doc(user.clientId).get();
          if (snap.exists) clientInfo = snap.data();
        } catch (e) {}
      }
      if (!clientInfo) clientInfo = MOCK_CLIENTS[user.clientId] || null;
    }
    return res.json({
      success: true,
      user,
      clientInfo,
    });
  });

  // 4. Create Client Account (SUPER_ADMIN ONLY)
  app.post('/api/admin/clients', requireAdminAuth, async (req: any, res) => {
    try {
      if (req.adminUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Hanya Super Admin yang berhak membuat atau mengelola akun client.',
        });
      }

      const { name, email, phone, durationDays = 30, notes } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Nama client dan email wajib diisi.' });
      }

      const clientId = 'client-' + crypto.randomBytes(4).toString('hex');
      const now = new Date();
      const startDate = now.toISOString();
      const expiresAt = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000).toISOString();

      const newClient: ClientAccountData = {
        id: clientId,
        name,
        email: email.trim().toLowerCase(),
        phone,
        status: 'active',
        startDate,
        expiresAt,
        createdAt: startDate,
        updatedAt: startDate,
        notes,
      };

      if (db) {
        try {
          await db.collection('clientAccounts').doc(clientId).set(newClient);
        } catch (e) {
          console.warn('[DB write notice]:', e);
        }
      }
      MOCK_CLIENTS[clientId] = newClient;

      const cleanEmail = email.trim().toLowerCase();
      const initialPassword = 'staff' + Math.floor(1000 + Math.random() * 9000);
      const adminUserId = 'usr-' + crypto.randomBytes(6).toString('hex');
      const adminUserData: AdminUserData = {
        uid: adminUserId,
        email: cleanEmail,
        displayName: name + ' Staff Admin',
        role: 'ADMIN_CLIENT',
        clientId: clientId,
        status: 'active',
        passwordHash: hashPassword(initialPassword),
        createdAt: startDate,
        updatedAt: startDate,
      };

      if (db) {
        try {
          await db.collection('adminUsers').doc(adminUserId).set(adminUserData);
        } catch (e) {
          console.warn('[DB write notice]:', e);
        }
      }
      MOCK_ADMIN_USERS[cleanEmail] = adminUserData;
      saveSaasStore();

      return res.json({
        success: true,
        message: `Akun client "${name}" dan kredensial login staf berhasil dibuat.`,
        client: newClient,
        staffCredentials: {
          email: cleanEmail,
          initialPassword,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Gagal membuat akun client.' });
    }
  });

  // 5. List Client Accounts (SUPER_ADMIN ONLY) - Enriched with computed active status & remaining days
  app.get('/api/admin/clients', requireAdminAuth, async (req: any, res) => {
    if (req.adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akses ditolak.' });
    }

    let clientsRaw: ClientAccountData[] = [];
    if (db) {
      try {
        const snap = await db.collection('clientAccounts').get();
        snap.forEach((doc: any) => clientsRaw.push(doc.data() as ClientAccountData));
      } catch (e) {}
    }
    if (clientsRaw.length === 0) {
      clientsRaw = Object.values(MOCK_CLIENTS);
    }

    const nowMs = Date.now();
    const clients = clientsRaw.map((client) => {
      const activeCheck = client.status === 'suspended'
        ? { active: false, reason: 'Ditangguhkan Super Admin' }
        : (!client.expiresAt || isNaN(new Date(client.expiresAt).getTime()) || nowMs >= new Date(client.expiresAt).getTime())
        ? { active: false, reason: 'Masa aktif berakhir / tidak lengkap' }
        : { active: true, reason: 'Aktif' };

      const expiresMs = client.expiresAt ? new Date(client.expiresAt).getTime() : 0;
      const daysRemaining = activeCheck.active ? Math.max(0, Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24))) : 0;

      return {
        ...client,
        computedActive: activeCheck.active,
        computedReason: activeCheck.reason,
        daysRemaining,
      };
    });

    return res.json({ success: true, clients });
  });

  // 6. Update Client Access Status (Suspend / Reactivate) (SUPER_ADMIN ONLY)
  app.put('/api/admin/clients/:clientId/status', requireAdminAuth, async (req: any, res) => {
    if (req.adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akses ditolak.' });
    }

    const { clientId } = req.params;
    const { status, notes } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid. Gunakan "active" atau "suspended".' });
    }

    const nowStr = new Date().toISOString();
    if (db) {
      await db.collection('clientAccounts').doc(clientId).update({
        status,
        updatedAt: nowStr,
        ...(notes ? { notes } : {}),
      });
    }
    if (MOCK_CLIENTS[clientId]) {
      MOCK_CLIENTS[clientId].status = status;
      MOCK_CLIENTS[clientId].updatedAt = nowStr;
      if (notes) MOCK_CLIENTS[clientId].notes = notes;
    }

    const historyItem = {
      id: 'sub-' + crypto.randomBytes(6).toString('hex'),
      clientId,
      extendedByUid: req.adminUser.uid,
      extendedByEmail: req.adminUser.email,
      previousExpiresAt: MOCK_CLIENTS[clientId]?.expiresAt || null,
      newExpiresAt: MOCK_CLIENTS[clientId]?.expiresAt || nowStr,
      extensionDays: 0,
      notes: notes || `Perubahan status akun client menjadi ${status.toUpperCase()}`,
      timestamp: nowStr,
    };

    if (db) {
      await db.collection('subscriptionHistory').doc(historyItem.id).set(historyItem);
    }
    if (!MOCK_SUBSCRIPTION_HISTORY[clientId]) MOCK_SUBSCRIPTION_HISTORY[clientId] = [];
    MOCK_SUBSCRIPTION_HISTORY[clientId].push(historyItem);
    saveSaasStore();

    return res.json({
      success: true,
      message: `Status client ${clientId} berhasil diperbarui menjadi "${status}".`,
      status,
      historyItem,
    });
  });

  // 7. Record Manual Payment & Extend Subscription (SUPER_ADMIN ONLY)
  app.post('/api/admin/clients/:clientId/renew', requireAdminAuth, async (req: any, res) => {
    try {
      if (req.adminUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Hanya Super Admin yang berhak memperpanjang masa aktif langganan.',
        });
      }

      const { clientId } = req.params;
      const { durationDays, paymentAmount, paymentRef, paymentDate, notes } = req.body;

      if (!durationDays || isNaN(Number(durationDays)) || Number(durationDays) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Durasi perpanjangan (durationDays) wajib diisi angka positif (> 0).',
        });
      }

      let client: ClientAccountData | null = null;
      if (db) {
        try {
          const snap = await db.collection('clientAccounts').doc(clientId).get();
          if (snap.exists) client = snap.data() as ClientAccountData;
        } catch (e) {}
      }
      if (!client) {
        client = MOCK_CLIENTS[clientId] || null;
      }

      if (!client) {
        return res.status(404).json({ success: false, message: 'Akun client tidak ditemukan.' });
      }

      const now = new Date();
      // Requirement #8: Calculate extension consistently using UTC server time
      const extensionCalc = calculateSubscriptionExtension(client.expiresAt, Number(durationDays), now);

      const nowStr = now.toISOString();
      const historyItem = {
        id: 'sub-' + crypto.randomBytes(6).toString('hex'),
        clientId,
        extendedByUid: req.adminUser.uid,
        extendedByEmail: req.adminUser.email,
        previousExpiresAt: extensionCalc.previousExpiresAt,
        newExpiresAt: extensionCalc.newExpiresAt,
        extensionDays: Number(durationDays),
        paymentAmount: paymentAmount != null ? Number(paymentAmount) : null,
        paymentRef: paymentRef || null,
        paymentDate: paymentDate || nowStr,
        notes: notes || `Perpanjangan manual +${durationDays} hari`,
        timestamp: nowStr,
      };

      if (db) {
        await db.collection('clientAccounts').doc(clientId).update({
          expiresAt: extensionCalc.newExpiresAt,
          status: 'active',
          updatedAt: nowStr,
        });
        await db.collection('subscriptionHistory').doc(historyItem.id).set(historyItem);
      }

      if (MOCK_CLIENTS[clientId]) {
        MOCK_CLIENTS[clientId].expiresAt = extensionCalc.newExpiresAt;
        MOCK_CLIENTS[clientId].status = 'active';
        MOCK_CLIENTS[clientId].updatedAt = nowStr;
      }

      if (!MOCK_SUBSCRIPTION_HISTORY[clientId]) MOCK_SUBSCRIPTION_HISTORY[clientId] = [];
      MOCK_SUBSCRIPTION_HISTORY[clientId].push(historyItem);
      saveSaasStore();

      return res.json({
        success: true,
        message: `Masa aktif client "${client.name}" berhasil diperpanjang +${durationDays} hari hingga ${extensionCalc.newExpiresAt}.`,
        calculatedFrom: extensionCalc.calculatedFrom,
        client: {
          ...client,
          expiresAt: extensionCalc.newExpiresAt,
          status: 'active',
          updatedAt: nowStr,
        },
        historyItem,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Gagal memperpanjang masa aktif client.' });
    }
  });

  // 8. Get Subscription Payment & Extension History (SUPER_ADMIN ONLY)
  app.get('/api/admin/clients/:clientId/history', requireAdminAuth, async (req: any, res) => {
    if (req.adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akses ditolak.' });
    }

    const { clientId } = req.params;
    let history: any[] = [];

    if (db) {
      try {
        const snap = await db.collection('subscriptionHistory').where('clientId', '==', clientId).orderBy('timestamp', 'desc').get();
        snap.forEach((doc: any) => history.push(doc.data()));
      } catch (e) {}
    }

    if (history.length === 0) {
      history = MOCK_SUBSCRIPTION_HISTORY[clientId] || [];
    }

    return res.json({ success: true, history });
  });

  // 9. Manual Administrative Date Override (SUPER_ADMIN ONLY)
  app.put('/api/admin/clients/:clientId/dates', requireAdminAuth, async (req: any, res) => {
    if (req.adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akses ditolak.' });
    }

    const { clientId } = req.params;
    const { startDate, expiresAt, notes } = req.body;

    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Format startDate tidak valid (Gunakan ISO 8601 UTC).' });
    }
    if (expiresAt && expiresAt !== 'NONE' && isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({ success: false, message: 'Format expiresAt tidak valid (Gunakan ISO 8601 UTC).' });
    }

    const nowStr = new Date().toISOString();
    const updatePayload: Record<string, any> = { updatedAt: nowStr };
    if (startDate) updatePayload.startDate = new Date(startDate).toISOString();
    if (expiresAt === null || expiresAt === '' || expiresAt === 'NONE') {
      updatePayload.expiresAt = null;
    } else if (expiresAt && !isNaN(new Date(expiresAt).getTime())) {
      updatePayload.expiresAt = new Date(expiresAt).toISOString();
    }

    if (db) {
      await db.collection('clientAccounts').doc(clientId).update(updatePayload);
    }
    if (MOCK_CLIENTS[clientId]) {
      if (startDate) MOCK_CLIENTS[clientId].startDate = updatePayload.startDate;
      MOCK_CLIENTS[clientId].expiresAt = updatePayload.expiresAt !== undefined ? updatePayload.expiresAt : MOCK_CLIENTS[clientId].expiresAt;
      MOCK_CLIENTS[clientId].updatedAt = nowStr;
      saveSaasStore();
    }

    return res.json({
      success: true,
      message: `Tanggal masa aktif client ${clientId} berhasil diperbarui.`,
      client: MOCK_CLIENTS[clientId] || updatePayload,
    });
  });

  // 7. Create Admin User (With Self-Role Escalation Protection)
  app.post('/api/admin/users', requireAdminAuth, async (req: any, res) => {
    try {
      const caller = req.adminUser;
      const { email, password, displayName, role, clientId } = req.body;

      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
      }

      // Negative Security Check 1: Admin Client cannot escalate role to SUPER_ADMIN
      if (caller.role === 'ADMIN_CLIENT' && role === 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          code: 'ROLE_ESCALATION_DENIED',
          message: 'Admin Client tidak diizinkan membuat akun dengan role SUPER_ADMIN.',
        });
      }

      // Negative Security Check 2: Admin Client can only create users under their own clientId
      const targetClientId = caller.role === 'ADMIN_CLIENT' ? caller.clientId : (clientId || caller.clientId || 'client-default');

      const uid = 'usr-' + crypto.randomBytes(6).toString('hex');
      const pwdHash = hashPassword(password);
      const now = new Date().toISOString();

      const userData: AdminUserData = {
        uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail,
        role: role || (caller.role === 'ADMIN_CLIENT' ? 'JUDGE_FACILITATOR' : 'ADMIN_CLIENT'),
        clientId: targetClientId,
        status: 'active',
        passwordHash: pwdHash,
        createdAt: now,
        updatedAt: now,
      };

      if (db) {
        await db.collection('adminUsers').doc(uid).set(userData);
      }
      MOCK_ADMIN_USERS[cleanEmail] = userData;

      return res.json({
        success: true,
        message: `Pengguna ${cleanEmail} berhasil dibuat.`,
        user: {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          clientId: userData.clientId,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Gagal membuat pengguna.' });
    }
  });

  // 8. Create & Query Events with Server-Verified Client Ownership
  app.post('/api/admin/events', requireAdminAuth, async (req: any, res) => {
    try {
      const caller = req.adminUser;
      const eventData = req.body;

      // Negative Security Check 3: Force caller's verified clientId for ADMIN_CLIENT (Prevent Client ID Manipulation)
      if (caller.role === 'ADMIN_CLIENT') {
        eventData.clientId = caller.clientId;
      } else if (!eventData.clientId) {
        eventData.clientId = 'client-default';
      }

      const eventId = eventData.id || 'evt-' + crypto.randomBytes(4).toString('hex');
      eventData.id = eventId;
      eventData.createdAt = new Date().toISOString();

      if (db) {
        await db.collection('events').doc(eventId).set(eventData);
      }
      MOCK_EVENTS[eventId] = eventData;

      return res.json({
        success: true,
        message: `Event "${eventData.title}" berhasil dibuat.`,
        event: eventData,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Gagal membuat event.' });
    }
  });

  app.get('/api/admin/events', requireAdminAuth, async (req: any, res) => {
    const caller = req.adminUser;
    let events: any[] = [];

    if (db) {
      try {
        let queryRef: any = db.collection('events');
        if (caller.role === 'ADMIN_CLIENT') {
          queryRef = queryRef.where('clientId', '==', caller.clientId);
        }
        const snap = await queryRef.get();
        snap.forEach((doc: any) => events.push(doc.data()));
      } catch (e) {}
    }

    if (events.length === 0) {
      events = Object.values(MOCK_EVENTS);
      if (caller.role === 'ADMIN_CLIENT') {
        events = events.filter((e) => e.clientId === caller.clientId);
      }
    }

    return res.json({ success: true, events });
  });


  // Secure Participant Login via Server with Rate Limiting, PBKDF2 Salted Hashing & Idempotent Migration
  app.post('/api/participant/login', async (req, res) => {
    try {
      const { bibNumber, pinCode } = req.body;
      const cleanBib = (bibNumber || '').trim().toUpperCase();
      const cleanPin = (pinCode || '').trim();

      if (!cleanBib || !cleanPin) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_INPUT',
          message: 'Nomor BIB dan PIN wajib diisi.',
        });
      }

      // --- 1. RATE LIMITING DEFENSE (RC-1 SECURITY GATE) ---
      const clientIp = getClientIp(req);
      const rateLimitCheck = checkAndRecordLoginAttempt(clientIp, cleanBib);
      if (!rateLimitCheck.allowed) {
        res.setHeader('Retry-After', String(rateLimitCheck.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfterSeconds,
          message: `Terlalu banyak percobaan login. Harap tunggu ${rateLimitCheck.retryAfterSeconds} detik sebelum mencoba kembali.`,
        });
      }

      let matched: any = null;

      if (db) {
        try {
          // Query private teamCredentials collection first
          const credSnap = await db.collection('teamCredentials').where('bibNumber', '==', cleanBib).limit(1).get();
          let teamId: string | null = null;
          let shouldMigrateDoc: { ref: any; type: string } | null = null;

          if (!credSnap.empty) {
            const credDoc = credSnap.docs[0];
            const credData = credDoc.data();

            // Modern PBKDF2 Salted Hash check
            if (credData.hashedPin && credData.salt) {
              if (verifyParticipantPin(cleanPin, credData.hashedPin, credData.salt)) {
                teamId = credDoc.id || credData.id;
              }
            } 
            // Legacy Plaintext PIN with Idempotent On-The-Fly Migration
            else if (credData.pinCode) {
              const legacyPin = String(credData.pinCode).trim();
              if (legacyPin === cleanPin) {
                teamId = credDoc.id || credData.id;
                shouldMigrateDoc = { ref: credDoc.ref, type: 'teamCredentials' };
              }
            }
          } else {
            // Fallback to legacy teams collection if credentials not yet separated
            const teamSnap = await db.collection('teams').where('bibNumber', '==', cleanBib).limit(1).get();
            if (!teamSnap.empty) {
              const legacyDoc = teamSnap.docs[0];
              const legacyData = legacyDoc.data();
              if (legacyData.hashedPin && legacyData.salt) {
                if (verifyParticipantPin(cleanPin, legacyData.hashedPin, legacyData.salt)) {
                  teamId = legacyDoc.id;
                }
              } else if (legacyData.pinCode && String(legacyData.pinCode).trim() === cleanPin) {
                teamId = legacyDoc.id;
                shouldMigrateDoc = { ref: legacyDoc.ref, type: 'teams' };
              }
            }
          }

          // Execute Idempotent Security Migration to PBKDF2 Salted Hash
          if (teamId && shouldMigrateDoc) {
            try {
              const newSalt = generatePinSalt();
              const newHash = hashParticipantPin(cleanPin, newSalt);
              const now = new Date().toISOString();

              await shouldMigrateDoc.ref.update({
                hashedPin: newHash,
                salt: newSalt,
                pinMigratedAt: now,
                pinCode: (admin as any).firestore?.FieldValue?.delete ? (admin as any).firestore.FieldValue.delete() : null,
              });
              console.log(`[Security Remediation] Successfully migrated credentials for BIB ${cleanBib} to PBKDF2.`);
            } catch (migErr) {
              console.warn('[PIN Migration Notice]:', migErr);
            }
          }

          if (teamId) {
            const teamDoc = await db.collection('teams').doc(teamId).get();
            if (teamDoc.exists) {
              const data = teamDoc.data();
              matched = {
                id: teamDoc.id,
                eventId: data?.eventId || 'evt-01',
                clientId: data?.clientId || 'client-default',
                name: data?.name,
                bibNumber: data?.bibNumber,
                category: data?.category,
                color: data?.color,
                status: data?.status,
              };
            }
          }
        } catch (dbErr) {
          console.warn('[Login Firestore Query Notice]:', dbErr);
        }
      }

      // Check authoritative dev registry if not in production and not matched in DB
      if (!matched && process.env.NODE_ENV !== 'production') {
        const authMatch = AUTHORITATIVE_TEAMS[cleanBib];
        if (authMatch && authMatch.hashedPin && authMatch.salt) {
          if (verifyParticipantPin(cleanPin, authMatch.hashedPin, authMatch.salt)) {
            matched = {
              id: authMatch.id,
              eventId: authMatch.eventId,
              clientId: authMatch.clientId || 'client-default',
              name: authMatch.name,
              bibNumber: authMatch.bibNumber,
              category: authMatch.category,
              color: authMatch.color,
              status: authMatch.status,
            };
          }
        }
      }

      if (!matched) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Nomor BIB atau PIN salah. Silakan periksa kembali.',
        });
      }

      // Enforce client subscription check on participant login
      const clientCheck = await checkClientActiveStatus(matched.clientId);
      if (!clientCheck.active) {
        return res.status(403).json({
          success: false,
          code: clientCheck.code || 'CLIENT_LOCKED',
          message: `Akses event terkunci: ${clientCheck.reason}`,
        });
      }

      const sessionToken = generateSessionToken(matched.id, matched.bibNumber);

      return res.json({
        success: true,
        team: matched,
        sessionToken,
        message: `Selamat datang, Tim ${matched.name} (${matched.bibNumber})! Sesi resmi berhasil diverifikasi.`,
      });
    } catch (err: any) {
      console.error('[Login Error]:', err);
      return res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem saat proses login.',
      });
    }
  });

  // Participant Logout & Session Revocation Endpoint
  app.post('/api/participant/logout', async (req, res) => {
    try {
      const { sessionToken } = req.body;
      if (!sessionToken || typeof sessionToken !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'MISSING_TOKEN',
          message: 'Parameter sessionToken wajib disertakan.',
        });
      }

      REVOKED_TOKENS.add(sessionToken.trim());

      if (db) {
        try {
          const tokenHash = crypto.createHash('sha256').update(sessionToken.trim()).digest('hex');
          await db.collection('revokedTokens').doc(tokenHash).set({
            revokedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        } catch (dbErr) {
          console.warn('[Revoke DB notice]:', dbErr);
        }
      }

      return res.json({
        success: true,
        message: 'Sesi tim berhasil dicabut (revoked).',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Gagal memproses pencabutan sesi.',
      });
    }
  });

  // Real-Time GPS Location Tracking Telemetry Endpoint
  app.post('/api/participant/location', async (req, res) => {
    try {
      const { teamId, sessionToken, coordinates, accuracy, speed, heading, eventId = 'evt-01' } = req.body;
      if (!teamId || !coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Parameter tidak lengkap (teamId dan coordinates {lat, lng} wajib diisi).',
        });
      }

      // Verify Session Token if present
      if (sessionToken) {
        const tokenCheck = verifySessionToken(sessionToken, teamId);
        if (!tokenCheck.valid) {
          return res.status(401).json({
            success: false,
            message: tokenCheck.reason || 'Sesi tim tidak valid.',
          });
        }
      }

      if (!isValidCoordinate(coordinates.lat, coordinates.lng)) {
        return res.status(400).json({
          success: false,
          message: 'Koordinat tidak valid.',
        });
      }

      const now = Date.now();
      const locationPayload = {
        currentCoordinates: { lat: coordinates.lat, lng: coordinates.lng },
        lastLocationTimestamp: now,
        lastLocationAccuracy: accuracy || 0,
        lastLocationSpeed: speed || 0,
        lastLocationHeading: heading || 0,
        lastUpdated: new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
      };

      if (db) {
        try {
          await db.collection('teams').doc(teamId).update(locationPayload);
        } catch (dbErr) {
          console.warn('[DB location update notice]:', dbErr);
        }
      }

      return res.json({
        success: true,
        timestamp: now,
        message: 'Lokasi berhasil diperbarui.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Gagal memperbarui posisi GPS.',
      });
    }
  });

  // Server-Side Verification Endpoint for Check-in
  app.post('/api/race/validate-checkin', async (req, res) => {
    try {
      const {
        teamId,
        sessionToken,
        qrCodeInput,
        eventId,
        eventStatus,
        checkpoint,
        gpsCoordinates,
        gpsPolicy,
        lastCheckinTimestamp,
        minIntervalSeconds = 30,
        bypassCooldown = false,
      } = req.body;

      if (!teamId || !qrCodeInput || !checkpoint) {
        return res.status(400).json({
          valid: false,
          code: 'INVALID_INPUT',
          message: 'Parameter check-in tidak lengkap (teamId, qrCodeInput, checkpoint wajib).',
        });
      }

      // Resolve Authoritative Checkpoint (Strictly reject if not in official server registry)
      const authCp = AUTHORITATIVE_CHECKPOINTS[checkpoint?.id];
      if (!authCp) {
        return res.status(404).json({
          valid: false,
          code: 'CHECKPOINT_NOT_FOUND',
          message: `Pos kontrol ID "${checkpoint?.id}" tidak terdaftar dalam registry resmi server.`,
        });
      }

      const targetCoordinates = authCp.coordinates;
      const targetPoints = authCp.points;
      const targetName = authCp.name;

      // Check Multi-Event Isolation: Checkpoint must belong to the active event
      const targetEventId = authCp.eventId;
      if (eventId && targetEventId && targetEventId !== eventId) {
        return res.status(403).json({
          valid: false,
          code: 'EVENT_MISMATCH',
          message: `Pos kontrol "${targetName}" terdaftar pada event lain (${targetEventId}), bukan event aktif (${eventId}).`,
        });
      }

      // 0. Verify Session Token Integrity if provided
      if (sessionToken) {
        const tokenCheck = verifySessionToken(sessionToken, teamId);
        if (!tokenCheck.valid) {
          return res.status(401).json({
            valid: false,
            code: 'SESSION_INVALID',
            message: tokenCheck.reason || 'Sesi otorisasi tim tidak sah.',
          });
        }
      }

      // Check client active status for event
      const eventClientId = req.body.clientId || (authCp as any)?.clientId || 'client-default';
      const clientCheck = await checkClientActiveStatus(eventClientId);
      if (!clientCheck.active) {
        return res.status(403).json({
          valid: false,
          code: clientCheck.code || 'CLIENT_LOCKED',
          message: `Akses event terkunci: ${clientCheck.reason}`,
        });
      }

      // 1. Verify Event Active Status (supports both 'running' and 'active')
      if (eventStatus && eventStatus !== 'active' && eventStatus !== 'running') {
        return res.status(403).json({
          valid: false,
          code: 'EVENT_INACTIVE',
          message: `Perlombaan saat ini tidak aktif (status: ${eventStatus}). Check-in pos ditutup.`,
        });
      }

      // 2. Verify Checkpoint Lock Status
      if (authCp.status === 'locked') {
        return res.status(403).json({
          valid: false,
          code: 'CHECKPOINT_LOCKED',
          message: `Pos ${authCp.number || checkpoint.number} (${targetName}) terkunci oleh panitia.`,
        });
      }

      // 3. Verify QR Code match (qrCodeInput must match checkpoint's qrCodeValue or POS number)
      const cleanQrInput = (qrCodeInput || '').trim().toUpperCase();
      const expectedQr = (authCp.qrCodeValue || checkpoint.qrCodeValue || '').toUpperCase();
      const qrMatches = expectedQr === cleanQrInput ||
        expectedQr.replace(/-/g, '') === cleanQrInput.replace(/-/g, '') ||
        expectedQr.endsWith(cleanQrInput) ||
        `POS-${authCp.number || checkpoint.number}`.toUpperCase() === cleanQrInput ||
        `POS0${authCp.number || checkpoint.number}`.toUpperCase() === cleanQrInput;

      if (!qrMatches) {
        return res.status(404).json({
          valid: false,
          code: 'QR_NOT_FOUND',
          message: `Kode QR "${cleanQrInput}" tidak cocok dengan data pos resmi ${targetName}.`,
        });
      }

      // 4. Server-Level Idempotency & Atomic Score Update via Firestore Transaction
      const scanDocId = `scan_${targetEventId}_${teamId}_${authCp.id}`;
      const now = Date.now();

      if (db) {
        try {
          const scanRef = db.collection('scanEvents').doc(scanDocId);
          const teamRef = db.collection('teams').doc(teamId);

          const txResult = await db.runTransaction(async (transaction: any) => {
            const scanSnap = await transaction.get(scanRef);
            if (scanSnap.exists) {
              return { duplicate: true, timestamp: scanSnap.data()?.timestamp || now };
            }

            const teamSnap = await transaction.get(teamRef);
            let currentPoints = 0;
            let currentTotal = 0;
            if (teamSnap.exists) {
              const tData = teamSnap.data();
              currentPoints = tData?.points || 0;
              currentTotal = tData?.totalScore || 0;
            }

            const newPoints = currentPoints + targetPoints;
            const newTotal = currentTotal + targetPoints;

            transaction.set(scanRef, {
              id: scanDocId,
              eventId: targetEventId,
              teamId,
              checkpointId: authCp.id,
              scannedByUid: teamId,
              status: 'verified',
              pointsAwarded: targetPoints,
              timestamp: now,
            });

            if (teamSnap.exists) {
              transaction.update(teamRef, {
                points: newPoints,
                totalScore: newTotal,
                currentCheckpointId: authCp.id,
                lastUpdated: new Date().toISOString(),
              });
            }

            return { duplicate: false, timestamp: now };
          });

          if (txResult.duplicate) {
            return res.json({
              valid: true,
              code: 'ALREADY_PROCESSED',
              isDuplicate: true,
              checkpointId: authCp.id,
              checkpointName: targetName,
              pointsAwarded: 0,
              serverTimestamp: txResult.timestamp,
              message: `Pos ${targetName} sudah pernah diverifikasi sebelumnya. Tidak ada penambahan poin ganda.`,
            });
          }
        } catch (txErr: any) {
          console.error('[Firestore Transaction Error]:', txErr);
          if (PROCESSED_SCAN_RECEIPTS.has(scanDocId)) {
            const receipt = PROCESSED_SCAN_RECEIPTS.get(scanDocId)!;
            return res.json({
              valid: true,
              code: 'ALREADY_PROCESSED',
              isDuplicate: true,
              checkpointId: authCp.id,
              checkpointName: targetName,
              pointsAwarded: 0,
              serverTimestamp: receipt.timestamp,
              message: `Pos ${targetName} sudah pernah diverifikasi sebelumnya.`,
            });
          }
          PROCESSED_SCAN_RECEIPTS.set(scanDocId, { timestamp: now, points: targetPoints, checkpointName: targetName });
        }
      } else {
        if (PROCESSED_SCAN_RECEIPTS.has(scanDocId)) {
          const receipt = PROCESSED_SCAN_RECEIPTS.get(scanDocId)!;
          return res.json({
            valid: true,
            code: 'ALREADY_PROCESSED',
            isDuplicate: true,
            checkpointId: authCp.id,
            checkpointName: targetName,
            pointsAwarded: 0,
            serverTimestamp: receipt.timestamp,
            message: `Pos ${targetName} sudah pernah diverifikasi sebelumnya.`,
          });
        }
        PROCESSED_SCAN_RECEIPTS.set(scanDocId, { timestamp: now, points: targetPoints, checkpointName: targetName });
      }

      // 5. Verify Anti-Speedrun Cooldown
      const checkinTime = Date.now();
      if (!bypassCooldown && lastCheckinTimestamp && minIntervalSeconds > 0) {
        const elapsedSec = Math.floor((checkinTime - lastCheckinTimestamp) / 1000);
        if (elapsedSec < minIntervalSeconds) {
          const remaining = minIntervalSeconds - elapsedSec;
          return res.status(429).json({
            valid: false,
            code: 'COOLDOWN_ACTIVE',
            remainingSeconds: remaining,
            message: `Jeda minimum pos aktif! Harap tunggu ${remaining} detik sebelum scan berikutnya.`,
          });
        }
      }

      // 6. GPS Policy & Geographic Radius Verification
      const policy = gpsPolicy || {
        required: true,
        validationRadiusMeters: authCp.radiusMeters || 80,
        maxAccuracyMeters: 80,
        allowRecreationalBypass: false,
      };

      if (policy.required) {
        // GPS is mandatory for this event
        if (!gpsCoordinates || typeof gpsCoordinates.lat !== 'number' || typeof gpsCoordinates.lng !== 'number') {
          return res.status(400).json({
            valid: false,
            code: 'GPS_REQUIRED',
            message: 'Perlombaan ini mewajibkan verifikasi lokasi GPS. Koordinat perangkat tidak tersedia. Harap aktifkan izin lokasi/GPS pada peramban.',
          });
        }

        if (!isValidCoordinate(gpsCoordinates.lat, gpsCoordinates.lng)) {
          return res.status(400).json({
            valid: false,
            code: 'INVALID_COORDINATES',
            message: 'Koordinat GPS yang dilaporkan perangkat tidak valid atau terdeteksi di Null Island (0,0).',
          });
        }

        if (gpsCoordinates.accuracy && gpsCoordinates.accuracy > (policy.maxAccuracyMeters || 80)) {
          return res.status(422).json({
            valid: false,
            code: 'GPS_ACCURACY_TOO_LOW',
            reportedAccuracy: Math.round(gpsCoordinates.accuracy),
            maxAllowedAccuracy: policy.maxAccuracyMeters || 80,
            message: `Akurasi sinyal GPS perangkat Anda terlalu rendah (±${Math.round(gpsCoordinates.accuracy)}m, batas maksimal: ${policy.maxAccuracyMeters || 80}m). Harap cari area terbuka dan tunggu sinyal satelit terkunci.`,
          });
        }

        if (gpsCoordinates.timestamp && (now - gpsCoordinates.timestamp > 180000)) {
          return res.status(422).json({
            valid: false,
            code: 'GPS_STALE_COORDINATES',
            message: 'Sinyal koordinat GPS kedaluwarsa (> 3 menit). Harap perbarui posisi GPS Anda sebelum memindai.',
          });
        }
      }

      // Distance calculation against Authoritative Coordinates
      let gpsReviewRequired = false;
      if (gpsCoordinates && isValidCoordinate(gpsCoordinates.lat, gpsCoordinates.lng) && targetCoordinates?.lat && targetCoordinates?.lng) {
        const distanceMeters = calculateHaversineDistance(
          gpsCoordinates.lat,
          gpsCoordinates.lng,
          targetCoordinates.lat,
          targetCoordinates.lng
        );

        const baseRadius = authCp.radiusMeters || policy.validationRadiusMeters || 80;
        // Bounded accuracy buffer (never allow inflated buffer > 30m)
        const accuracyBuffer = Math.min(Math.max(0, (gpsCoordinates.accuracy || 20) - 10), 30);
        const maxThreshold = baseRadius + accuracyBuffer;

        if (distanceMeters > maxThreshold && !bypassCooldown) {
          return res.status(403).json({
            valid: false,
            code: 'OUT_OF_BOUNDS',
            distanceMeters: Math.round(distanceMeters),
            allowedRadius: baseRadius,
            maxThreshold: Math.round(maxThreshold),
            message: `📍 Jarak Anda (${Math.round(distanceMeters)}m) berada di luar radius pos ${targetName} (batas maksimal: ${Math.round(maxThreshold)}m). Dekati pos fisik atau minta verifikasi juri.`,
          });
        }

        // Check for Borderline / Uncertain Zone
        if (distanceMeters > baseRadius && distanceMeters <= maxThreshold) {
          if (!policy.allowRecreationalBypass && !bypassCooldown) {
            return res.status(422).json({
              valid: false,
              code: 'GPS_RETRY_REQUIRED',
              distanceMeters: Math.round(distanceMeters),
              baseRadius,
              message: `Posisi Anda berada di zona batas meragukan (jarak: ${Math.round(distanceMeters)}m, radius patokan: ${baseRadius}m). Akurasi satelit (±${Math.round(gpsCoordinates.accuracy || 20)}m) belum cukup stabil. Harap mendekat ke titik fisik pos dan lakukan scan ulang.`,
            });
          } else {
            gpsReviewRequired = true;
          }
        }
      }

      // Record successful scan in server idempotency map
      PROCESSED_SCAN_RECEIPTS.set(scanDocId, {
        timestamp: now,
        points: targetPoints,
        checkpointName: targetName,
      });

      return res.json({
        valid: true,
        code: 'AUTHORIZED',
        checkpointId: authCp.id || checkpoint.id,
        checkpointName: targetName,
        pointsAwarded: targetPoints,
        serverTimestamp: now,
        gpsReviewRequired,
        message: `Verifikasi server sah untuk pos ${targetName} (+${targetPoints} Poin).`,
      });
    } catch (err: any) {
      console.error('[API Checkin Error]:', err);
      return res.status(500).json({
        valid: false,
        code: 'INTERNAL_ERROR',
        message: err?.message || 'Terjadi kesalahan internal server.',
      });
    }
  });

  // Server-Side Judge Scoring Authorization (Zero Fallback Secrets, Timing-Safe)
  app.post('/api/judge/verify-authorization', (req, res) => {
    try {
      const { judgeKey } = req.body;
      if (!judgeKey || typeof judgeKey !== 'string') {
        return res.status(400).json({
          authorized: false,
          code: 'MISSING_KEY',
          message: 'Kunci otorisasi juri (judgeKey) wajib diisi.',
        });
      }

      const inputBuf = Buffer.from(judgeKey.trim());
      const expectedBuf = Buffer.from(JUDGE_SECRET_KEY);
      const isKeyValid = inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf);

      if (isKeyValid) {
        return res.json({
          authorized: true,
          role: 'judge',
          message: 'Otorisasi juri lapangan diverifikasi oleh server.',
        });
      }

      return res.status(401).json({
        authorized: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Kunci otorisasi juri tidak valid.',
      });
    } catch (err: any) {
      return res.status(500).json({ authorized: false, message: err?.message });
    }
  });

  // Mount Vite Middleware in Development, or Static files in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orienteering Amazing Race server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
