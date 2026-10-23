import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './config';
import { 
  EventItem, 
  Checkpoint, 
  Team, 
  ChallengeSubmission, 
  RaceLog, 
  RaceBroadcast, 
  SosAlert,
  CheckpointVisit 
} from '../types';
import { 
  DEMO_EVENTS, 
  DEMO_CHECKPOINTS, 
  DEMO_TEAMS, 
  DEMO_SUBMISSIONS 
} from '../data/demoData';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'error';

export interface ScanResult {
  success: boolean;
  pointsAwarded: number;
  checkpointName: string;
  message: string;
  code?: string;
  isDuplicate?: boolean;
  isCooldown?: boolean;
  remainingSeconds?: number;
}

/**
 * Strips all `undefined` fields recursively so Firestore never throws
 * "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof input === 'object' && input !== null) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return input;
}

class FirestoreService {
  private syncStatus: SyncStatus = 'online';
  private syncListeners: Set<(status: SyncStatus, error?: string) => void> = new Set();
  private unsubs: Unsubscribe[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.updateSyncStatus('online'));
      window.addEventListener('offline', () => this.updateSyncStatus('offline'));
    }
  }

  public onSyncStatusChange(cb: (status: SyncStatus, error?: string) => void): () => void {
    this.syncListeners.add(cb);
    cb(this.syncStatus);
    return () => this.syncListeners.delete(cb);
  }

  private updateSyncStatus(status: SyncStatus, error?: string) {
    this.syncStatus = status;
    this.syncListeners.forEach(listener => listener(status, error));
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // Auto-seed Firestore from demoData if database is brand new, preserving user experience
  public async seedInitialDataIfEmpty(): Promise<void> {
    const eventsPath = 'events';
    try {
      this.updateSyncStatus('syncing');
      const eventsSnap = await getDocs(collection(db, eventsPath));
      if (eventsSnap.empty) {
        console.log('Seeding initial RacePoint data to Firestore...');
        
        // Seed events
        for (const evt of DEMO_EVENTS) {
          await setDoc(
            doc(db, 'events', evt.id),
            sanitizeForFirestore({
              ...evt,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          );
        }

        // Seed checkpoints
        for (const cp of DEMO_CHECKPOINTS) {
          await setDoc(
            doc(db, 'checkpoints', cp.id),
            sanitizeForFirestore({
              ...cp,
              eventId: 'evt-01',
            })
          );
        }

        // Seed teams (Save public team info in 'teams' and private credentials in 'teamCredentials')
        for (const t of DEMO_TEAMS) {
          const publicTeam: Record<string, any> = { ...t, eventId: 'evt-01' };
          const pinCode = publicTeam.pinCode;
          delete publicTeam.pinCode;

          await setDoc(
            doc(db, 'teams', t.id),
            sanitizeForFirestore(publicTeam)
          );

          if (pinCode) {
            await setDoc(
              doc(db, 'teamCredentials', t.id),
              sanitizeForFirestore({
                id: t.id,
                eventId: 'evt-01',
                bibNumber: t.bibNumber,
                pinCode: pinCode,
                createdAt: new Date().toISOString()
              })
            );
          }
        }

        // Seed challenge submissions
        for (const sub of DEMO_SUBMISSIONS) {
          await setDoc(
            doc(db, 'challengeSubmissions', sub.id),
            sanitizeForFirestore({
              ...sub,
              eventId: 'evt-01',
            })
          );
        }

        // Seed initial activity logs
        const initialLogs = [
          { id: 'log-1', eventId: 'evt-01', time: '08:00 WIB', message: 'Sistem siap: Seluruh stiker QR pos kontrol telah diverifikasi panitia.', type: 'system' },
          { id: 'log-2', eventId: 'evt-01', time: '08:15 WIB', message: 'Perlombaan dimulai! 16 tim serentak bergerak mencari Pos 1.', type: 'system' },
          { id: 'log-3', eventId: 'evt-01', time: '08:45 WIB', message: 'Tim Garuda Merah berhasil melakukan scan barcode di Pos 1.', type: 'checkin' },
          { id: 'log-4', eventId: 'evt-01', time: '09:12 WIB', message: 'Juri Pos 2 menyetujui foto formasi tim Garuda Merah (+150 Poin).', type: 'judge' },
        ];
        for (const logItem of initialLogs) {
          await setDoc(doc(db, 'activityLogs', logItem.id), sanitizeForFirestore(logItem));
        }

        // Seed initial broadcasts
        const initialBroadcasts = [
          {
            id: 'bc-1',
            eventId: 'evt-01',
            time: '09:00 WIB',
            title: 'Waspada Jalur Licin di Sektor Hutan',
            message: 'Jalur antara Pos 2 dan Pos 3 sedikit licin karena embun pagi. Seluruh regu diimbau berhati-hati saat berlari.',
            type: 'weather',
            author: 'Direktur Perlombaan'
          },
          {
            id: 'bc-2',
            eventId: 'evt-01',
            time: '09:35 WIB',
            title: 'Pengingat Waktu Lomba & Pos Wajib',
            message: 'Batas akhir lomba pukul 11:30 WIB. Pastikan seluruh tim menyelesaikan Pos Wajib sebelum menuju garis finis!',
            type: 'info',
            author: 'Panitia Waktu'
          }
        ];
        for (const bc of initialBroadcasts) {
          await setDoc(doc(db, 'broadcasts', bc.id), sanitizeForFirestore(bc));
        }

        // Register default admin document for the designated email
        const adminUid = auth.currentUser?.uid || 'admin-seed';
        await setDoc(doc(db, 'admins', adminUid), sanitizeForFirestore({
          uid: adminUid,
          email: 'mochyusuf.ad2@gmail.com',
          role: 'admin',
        }), { merge: true });

        console.log('Firestore initial seeding completed successfully.');
      }
      this.updateSyncStatus('synced');
    } catch (err) {
      console.warn('Notice during initial seed check:', err);
      this.updateSyncStatus('online');
    }
  }

  // Real-time Subscriptions
  public subscribeEvents(onUpdate: (events: EventItem[]) => void): Unsubscribe {
    const path = 'events';
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: EventItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as EventItem);
      });
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeCheckpoints(onUpdate: (checkpoints: Checkpoint[]) => void, eventId?: string): Unsubscribe {
    const path = 'checkpoints';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: Checkpoint[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Checkpoint);
      });
      items.sort((a, b) => a.number - b.number);
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeTeams(onUpdate: (teams: Team[]) => void, eventId?: string): Unsubscribe {
    const path = 'teams';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: Team[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Team);
      });
      // Leaderboard sorting: highest totalScore first, then lowest durationMinutes
      items.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeSubmissions(onUpdate: (subs: ChallengeSubmission[]) => void, eventId?: string): Unsubscribe {
    const path = 'challengeSubmissions';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: ChallengeSubmission[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ChallengeSubmission);
      });
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeLogs(onUpdate: (logs: RaceLog[]) => void, eventId?: string): Unsubscribe {
    const path = 'activityLogs';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: RaceLog[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as RaceLog);
      });
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeBroadcasts(onUpdate: (broadcasts: RaceBroadcast[]) => void, eventId?: string): Unsubscribe {
    const path = 'broadcasts';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: RaceBroadcast[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as RaceBroadcast);
      });
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  public subscribeSosAlerts(onUpdate: (alerts: SosAlert[]) => void, eventId?: string): Unsubscribe {
    const path = 'sosAlerts';
    const targetRef = eventId ? query(collection(db, path), where('eventId', '==', eventId)) : collection(db, path);
    const unsub = onSnapshot(targetRef, (snapshot) => {
      this.updateSyncStatus('syncing');
      const items: SosAlert[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as SosAlert);
      });
      onUpdate(items);
      this.updateSyncStatus('synced');
    }, (error) => {
      this.updateSyncStatus('error', error.message);
      console.warn(`Firestore onSnapshot notice for [${path}]:`, error.message);
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  // Mutation Methods with Error Wrapping & Idempotency
  public async saveEvent(event: EventItem): Promise<void> {
    const path = `events/${event.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'events', event.id), sanitizeForFirestore({
        ...event,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async deleteEvent(eventId: string): Promise<void> {
    const path = `events/${eventId}`;
    try {
      this.updateSyncStatus('syncing');
      await deleteDoc(doc(db, 'events', eventId));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public async saveCheckpoint(checkpoint: Checkpoint, eventId: string = 'evt-01'): Promise<void> {
    const path = `checkpoints/${checkpoint.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'checkpoints', checkpoint.id), sanitizeForFirestore({
        ...checkpoint,
        eventId,
      }), { merge: true });
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async deleteCheckpoint(checkpointId: string): Promise<void> {
    const path = `checkpoints/${checkpointId}`;
    try {
      this.updateSyncStatus('syncing');
      await deleteDoc(doc(db, 'checkpoints', checkpointId));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public async saveTeam(team: Team, eventId: string = 'evt-01'): Promise<void> {
    const path = `teams/${team.id}`;
    try {
      this.updateSyncStatus('syncing');
      const publicTeamData: Record<string, any> = { ...team, eventId };
      const privatePinCode = publicTeamData.pinCode;
      delete publicTeamData.pinCode;

      await setDoc(doc(db, 'teams', team.id), sanitizeForFirestore(publicTeamData), { merge: true });

      if (privatePinCode) {
        await setDoc(doc(db, 'teamCredentials', team.id), sanitizeForFirestore({
          id: team.id,
          eventId,
          bibNumber: team.bibNumber,
          pinCode: privatePinCode,
          updatedAt: new Date().toISOString()
        }), { merge: true });
      }

      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async updateTeamLocation(
    teamId: string,
    coords: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number },
    eventId: string = 'evt-01'
  ): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      const now = Date.now();
      const locationUpdate = {
        currentCoordinates: { lat: coords.lat, lng: coords.lng },
        lastLocationTimestamp: now,
        lastLocationAccuracy: coords.accuracy || null,
        lastLocationSpeed: coords.speed || null,
        lastLocationHeading: coords.heading || null,
        lastUpdated: new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
      };
      await updateDoc(doc(db, 'teams', teamId), sanitizeForFirestore(locationUpdate));
    } catch (err) {
      // Non-fatal telemetry error handling (suppress popup toast on background telemetry failure)
      console.warn(`[GPS telemetry error for team ${teamId}]:`, err);
    }
  }

  public async deleteTeam(teamId: string): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      this.updateSyncStatus('syncing');
      await deleteDoc(doc(db, 'teams', teamId));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  // Idempotent and Atomic Scan Check-in
  public async processCheckInScan(params: {
    teamId: string;
    qrCodeInput: string;
    checkpoints: Checkpoint[];
    event: EventItem;
    gpsCoordinates?: { lat: number; lng: number; accuracy?: number };
    bypassCooldown?: boolean;
    sessionToken?: string;
  }): Promise<ScanResult> {
    const { teamId, qrCodeInput, checkpoints, event, gpsCoordinates, bypassCooldown, sessionToken } = params;
    const cleanCode = qrCodeInput.trim().toUpperCase();

    // 0. Event Status Enforcement
    if (event.status && event.status !== 'active') {
      return {
        success: false,
        pointsAwarded: 0,
        checkpointName: '',
        message: `⚠️ Perlombaan saat ini berstatus "${event.status === 'completed' ? 'Selesai' : 'Draft/Belum Dibuka'}". Check-in pos dinonaktifkan.`
      };
    }

    // 1. Match Checkpoint
    const cp = checkpoints.find(
      c => c.qrCodeValue.toUpperCase() === cleanCode || 
           c.id.toLowerCase() === cleanCode.toLowerCase() ||
           `POS-${c.number}`.toUpperCase() === cleanCode
    );

    if (!cp) {
      return {
        success: false,
        pointsAwarded: 0,
        checkpointName: '',
        message: `❌ Kode QR "${cleanCode}" tidak terdaftar di sistem perlombaan!`
      };
    }

    if (cp.status === 'locked') {
      return {
        success: false,
        pointsAwarded: 0,
        checkpointName: cp.name,
        message: `🔒 Pos ${cp.number} (${cp.name}) terkunci atau belum dibuka oleh panitia!`
      };
    }

    // 1b. Server-Side Pre-validation (calls trusted backend API)
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const valRes = await fetch('/api/race/validate-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            sessionToken,
            qrCodeInput: cleanCode,
            eventId: event.id,
            eventStatus: event.status,
            checkpoint: cp,
            gpsCoordinates,
            gpsPolicy: event.gpsPolicy || {
              required: event.eventType === 'orienteering' || event.eventType === 'amazing_race',
              validationRadiusMeters: cp.radiusMeters || 80,
              maxAccuracyMeters: 80,
              allowRecreationalBypass: event.eventType === 'school' || event.eventType === 'indoor_qr',
            },
            bypassCooldown,
            minIntervalSeconds: event.scoringRules?.minIntervalSeconds || event.minIntervalBetweenCheckpointsSeconds || 30,
          }),
        });

        if (!valRes.ok) {
          const errData = await valRes.json();
          if (errData.code === 'COOLDOWN_ACTIVE') {
            return {
              success: false,
              pointsAwarded: 0,
              checkpointName: cp.name,
              isCooldown: true,
              remainingSeconds: errData.remainingSeconds,
              message: errData.message,
            };
          }
          return {
            success: false,
            pointsAwarded: 0,
            checkpointName: cp.name,
            message: errData.message || 'Verifikasi server gagal.',
            code: errData.code,
          };
        }
      } catch (e) {
        console.warn('[Server check notice]: offline or local network, proceeding with atomic transaction', e);
      }
    }

    // 2. GPS Radius Validation (if coordinates available)
    if (gpsCoordinates && cp.coordinates && cp.coordinates.lat && cp.coordinates.lng) {
      const distanceMeters = this.calculateHaversineDistance(
        gpsCoordinates.lat,
        gpsCoordinates.lng,
        cp.coordinates.lat,
        cp.coordinates.lng
      );
      // 100m baseline + buffer for forest canopy / device GPS accuracy
      const maxAllowed = Math.max(100, (gpsCoordinates.accuracy || 25) + 60);

      if (distanceMeters > maxAllowed && !bypassCooldown) {
        return {
          success: false,
          pointsAwarded: 0,
          checkpointName: cp.name,
          message: `📍 Verifikasi GPS: Jarak Anda (${Math.round(distanceMeters)}m) berada di luar radius pos ${cp.name} (toleransi: ${maxAllowed}m). Harap mendekat ke pos fisik atau hubungi juri.`
        };
      }
    }

    // 3. Perform Atomic Transaction to prevent Race Conditions & Duplicate Points
    const scanDocId = `scan_${teamId}_${cp.id}`;
    const scanRef = doc(db, 'scanEvents', scanDocId);
    const teamRef = doc(db, 'teams', teamId);

    try {
      this.updateSyncStatus('syncing');
      const result = await runTransaction(db, async (tx) => {
        const [scanDocSnap, teamDocSnap] = await Promise.all([
          tx.get(scanRef),
          tx.get(teamRef)
        ]);

        if (scanDocSnap.exists()) {
          return {
            success: false,
            pointsAwarded: 0,
            checkpointName: cp.name,
            isDuplicate: true,
            message: `⚠️ Tim Anda sudah pernah check-in di ${cp.name}. Scan berulang tidak menghasilkan poin ganda.`
          };
        }

        const teamData = teamDocSnap.exists() ? (teamDocSnap.data() as Team) : null;
        if (!teamData) {
          throw new Error(`Data tim ${teamId} tidak ditemukan.`);
        }

        // Multi-Event Isolation Check: Reject cross-event check-ins
        if ((teamData as any).eventId && (teamData as any).eventId !== event.id) {
          throw new Error(`Isolasi Event: Tim "${teamData.name}" terdaftar pada event ${(teamData as any).eventId}, tidak diizinkan check-in pada event "${event.title}" (${event.id}).`);
        }

        // Check Cooldown / Minimum Interval
        const now = Date.now();
        const minIntervalSec = event.scoringRules?.minIntervalSeconds || 30;
        if (teamData.lastCheckinTimestamp && !bypassCooldown && event.enforceMinInterval) {
          const elapsedSec = Math.floor((now - teamData.lastCheckinTimestamp) / 1000);
          if (elapsedSec < minIntervalSec) {
            const waitTime = minIntervalSec - elapsedSec;
            return {
              success: false,
              pointsAwarded: 0,
              checkpointName: cp.name,
              isCooldown: true,
              remainingSeconds: waitTime,
              message: `⏳ Jeda waktu antar-pos aktif! Harap tunggu ${waitTime} detik sebelum check-in berikutnya.`
            };
          }
        }

        // Construct New Visit Record
        const newVisit: CheckpointVisit = {
          checkpointId: cp.id,
          checkpointName: cp.name,
          timestamp: now,
          timeString: new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
          points: cp.points,
          status: 'verified',
          method: 'QR Scan'
        };

        const existingVisits = teamData.visitHistory || [];
        const updatedVisits = [newVisit, ...existingVisits];
        const newPoints = (teamData.points || 0) + cp.points;
        const newTotalScore = newPoints + (teamData.bonusPoints || 0) - (teamData.penaltyPoints || 0);
        const newCheckpointsCompleted = (teamData.checkpointsCompleted || 0) + 1;

        // Write Scan Event
        const scanPayload = {
          id: scanDocId,
          eventId: event.id,
          teamId,
          checkpointId: cp.id,
          checkpointName: cp.name,
          qrCodeValue: cp.qrCodeValue,
          pointsAwarded: cp.points,
          scannedByUid: auth.currentUser?.uid || 'anonymous-participant',
          status: 'verified',
          method: 'QR Scan',
          timestamp: now,
          gpsCoordinates: gpsCoordinates || null,
        };
        tx.set(scanRef, sanitizeForFirestore(scanPayload));

        // Update Team Record
        tx.update(teamRef, sanitizeForFirestore({
          points: newPoints,
          totalScore: newTotalScore,
          checkpointsCompleted: newCheckpointsCompleted,
          currentCheckpointId: cp.id,
          lastPosName: cp.name,
          lastUpdated: new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          lastCheckinTimestamp: now,
          visitHistory: updatedVisits,
          status: newCheckpointsCompleted >= checkpoints.length ? 'finished' : 'racing',
          currentCoordinates: gpsCoordinates ? { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng } : (teamData.currentCoordinates || undefined),
        }));

        // Write Activity Log
        const logId = `log-${now}-${Math.floor(Math.random() * 1000)}`;
        const logRef = doc(db, 'activityLogs', logId);
        tx.set(logRef, sanitizeForFirestore({
          id: logId,
          eventId: event.id,
          time: new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          message: `Tim ${teamData.name} berhasil check-in di ${cp.name} (+${cp.points} Poin).`,
          type: 'checkin'
        }));

        return {
          success: true,
          pointsAwarded: cp.points,
          checkpointName: cp.name,
          message: `🎉 Berhasil! Check-in di ${cp.name} diterima. Nilai: +${cp.points} Poin!`
        };
      });

      this.updateSyncStatus('synced');
      return result;
    } catch (err) {
      this.updateSyncStatus('error');
      console.error('Error during checkin transaction:', err);
      return {
        success: false,
        pointsAwarded: 0,
        checkpointName: cp.name,
        message: `Terjadi kendala sinkronisasi: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  // Challenge Submissions
  public async submitChallenge(submission: ChallengeSubmission, eventId: string = 'evt-01'): Promise<void> {
    const path = `challengeSubmissions/${submission.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'challengeSubmissions', submission.id), sanitizeForFirestore({
        ...submission,
        eventId,
      }));

      // Add log
      const logId = `log-${Date.now()}`;
      await setDoc(doc(db, 'activityLogs', logId), sanitizeForFirestore({
        id: logId,
        eventId,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        message: `Tim ${submission.teamName} mengirimkan bukti misi di ${submission.checkpointName} (${submission.type}).`,
        type: 'checkin'
      }));

      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async reviewChallengeSubmission(
    submissionId: string, 
    status: 'approved' | 'rejected', 
    score: number, 
    note: string
  ): Promise<void> {
    const path = `challengeSubmissions/${submissionId}`;
    try {
      this.updateSyncStatus('syncing');
      const subRef = doc(db, 'challengeSubmissions', submissionId);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) {
        throw new Error('Submission tidak ditemukan.');
      }
      const subData = subSnap.data() as ChallengeSubmission;

      await updateDoc(subRef, sanitizeForFirestore({
        status,
        scoreGiven: score,
        judgeNote: note
      }));

      // If approved, update team bonusPoints & totalScore
      if (status === 'approved' && score > 0 && subData.teamId) {
        const teamRef = doc(db, 'teams', subData.teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const team = teamSnap.data() as Team;
          const newBonus = (team.bonusPoints || 0) + score;
          const newTotal = (team.points || 0) + newBonus - (team.penaltyPoints || 0);
          await updateDoc(teamRef, sanitizeForFirestore({
            bonusPoints: newBonus,
            totalScore: newTotal,
            lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
          }));
        }
      }

      // Log review
      const logId = `log-${Date.now()}`;
      await setDoc(doc(db, 'activityLogs', logId), sanitizeForFirestore({
        id: logId,
        eventId: subData.eventId || 'evt-01',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        message: `Juri ${status === 'approved' ? 'menyetujui' : 'menolak'} tugas tim ${subData.teamName} (${status === 'approved' ? `+${score} Poin` : '0 Poin'}).`,
        type: 'judge'
      }));

      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  // Judge Manual Score / Penalty Award
  public async submitJudgeManualScore(params: {
    teamId: string;
    checkpointId: string;
    score: number;
    note: string;
    markCheckpointCompleted?: boolean;
    photoUrl?: string;
    isPenalty?: boolean;
    penaltyMinutesToAdd?: number;
    eventId?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { teamId, checkpointId, score, note, markCheckpointCompleted, isPenalty, penaltyMinutesToAdd, eventId = 'evt-01' } = params;
    try {
      this.updateSyncStatus('syncing');
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        return { success: false, message: 'Tim tidak ditemukan.' };
      }
      const team = teamSnap.data() as Team;

      let newPoints = team.points || 0;
      let newBonus = team.bonusPoints || 0;
      let newPenalty = team.penaltyPoints || 0;
      let newPenaltyMinutes = (team.penaltyMinutes || 0) + (penaltyMinutesToAdd || 0);

      if (isPenalty) {
        newPenalty += score;
      } else {
        newBonus += score;
      }
      const newTotal = newPoints + newBonus - newPenalty;

      const updates: Partial<Team> = {
        bonusPoints: newBonus,
        penaltyPoints: newPenalty,
        penaltyMinutes: newPenaltyMinutes,
        totalScore: newTotal,
        lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      };

      if (markCheckpointCompleted) {
        updates.checkpointsCompleted = (team.checkpointsCompleted || 0) + 1;
      }

      await updateDoc(teamRef, sanitizeForFirestore(updates));

      // Record in score entries
      const scoreId = `score-${Date.now()}`;
      await setDoc(doc(db, 'scoreEntries', scoreId), sanitizeForFirestore({
        id: scoreId,
        eventId,
        teamId,
        checkpointId,
        score: isPenalty ? -score : score,
        type: isPenalty ? 'penalty' : 'manual_judge',
        awardedBy: auth.currentUser?.email || 'Juri Pos',
        reason: note,
      }));

      // Log activity
      const logId = `log-${Date.now()}`;
      await setDoc(doc(db, 'activityLogs', logId), sanitizeForFirestore({
        id: logId,
        eventId,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        message: `Juri mencatat ${isPenalty ? `penalti (-${score} Poin)` : `skor manual (+${score} Poin)`} untuk tim ${team.name}. Catatan: ${note}`,
        type: 'judge'
      }));

      this.updateSyncStatus('synced');
      return {
        success: true,
        message: `Berhasil mencatat nilai untuk ${team.name}. Total skor diperbarui.`
      };
    } catch (err) {
      this.updateSyncStatus('error');
      return {
        success: false,
        message: `Gagal memperbarui nilai juri: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  // Activity Logs
  public async addActivityLog(log: RaceLog, eventId: string = 'evt-01'): Promise<void> {
    const path = `activityLogs/${log.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'activityLogs', log.id), sanitizeForFirestore({
        ...log,
        eventId,
      }));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Broadcasts
  public async addBroadcast(broadcast: RaceBroadcast, eventId: string = 'evt-01'): Promise<void> {
    const path = `broadcasts/${broadcast.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'broadcasts', broadcast.id), sanitizeForFirestore({
        ...broadcast,
        eventId,
      }));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async deleteBroadcast(broadcastId: string): Promise<void> {
    const path = `broadcasts/${broadcastId}`;
    try {
      this.updateSyncStatus('syncing');
      await deleteDoc(doc(db, 'broadcasts', broadcastId));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // SOS Alerts
  public async sendSosAlert(alert: SosAlert, eventId: string = 'evt-01'): Promise<void> {
    const path = `sosAlerts/${alert.id}`;
    try {
      this.updateSyncStatus('syncing');
      await setDoc(doc(db, 'sosAlerts', alert.id), sanitizeForFirestore({
        ...alert,
        eventId,
      }));

      // Write emergency log
      const logId = `log-sos-${Date.now()}`;
      await setDoc(doc(db, 'activityLogs', logId), sanitizeForFirestore({
        id: logId,
        eventId,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        message: `🚨 DARURAT (SOS): Tim ${alert.teamName} (BIB ${alert.bibNumber}) mengirimkan sinyal bantuan darurat!`,
        type: 'system'
      }));

      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async resolveSosAlert(alertId: string): Promise<void> {
    const path = `sosAlerts/${alertId}`;
    try {
      this.updateSyncStatus('syncing');
      await updateDoc(doc(db, 'sosAlerts', alertId), sanitizeForFirestore({
        status: 'resolved'
      }));
      this.updateSyncStatus('synced');
    } catch (err) {
      this.updateSyncStatus('error');
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  public cleanupListeners(): void {
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
  }
}

export const firestoreService = new FirestoreService();
