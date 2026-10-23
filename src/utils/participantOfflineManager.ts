/**
 * Participant Offline Manager (IndexedDB & Offline Queue Storage)
 * Enables QR code scanning, offline checkpoint verification, and queue synchronization
 * when participants are in areas with poor or absent cellular internet connection.
 */

import { OfflineScanStatus } from '../types';

export interface OfflineScanQueueItem {
  id: string;
  teamId: string;
  eventId?: string;
  checkpointId?: string;
  checkpointNumber?: number;
  qrCodeInput: string;
  timestamp: number;
  timeFormatted: string;
  checkpointName: string;
  pointsAwarded: number;
  status: OfflineScanStatus;
  synced: boolean;
  serverSyncTimestamp?: number;
  serverMessage?: string;
  serverCode?: string;
  rejectionReason?: string;
  gpsCoordinates?: { lat: number; lng: number; accuracy?: number; timestamp?: number };
  bypassCooldown?: boolean;
  retryCount?: number;
}

export interface CachedRaceInfo {
  checkpoints: any[];
  teams: any[];
  lastUpdated: number;
}

const DB_NAME = 'RacePointParticipantOfflineDB';
const DB_VERSION = 1;
const STORE_SCANS = 'offline_scans';
const STORE_CACHE = 'cached_race_data';

// Fallback localStorage key
const LOCAL_QUEUE_KEY = 'racepoint_offline_scans_queue_v1';
const LOCAL_DATA_CACHE_KEY = 'racepoint_offline_data_cache_v1';

/**
 * Initialize IndexedDB Database
 */
export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('[OfflineDB] IndexedDB not supported, falling back to LocalStorage.');
      reject('IndexedDB not supported');
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('[OfflineDB] Error opening IndexedDB:', event);
      reject(event);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const scanStore = db.createObjectStore(STORE_SCANS, { keyPath: 'id' });
        scanStore.createIndex('teamId', 'teamId', { unique: false });
        scanStore.createIndex('synced', 'synced', { unique: false });
        scanStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Cache current checkpoints and teams data into IndexedDB & LocalStorage for offline lookups
 */
export async function saveParticipantRaceCache(checkpoints: any[], teams: any[]): Promise<void> {
  const cacheData = {
    checkpoints,
    teams,
    lastUpdated: Date.now()
  };

  // Safe fallback to LocalStorage
  try {
    localStorage.setItem(LOCAL_DATA_CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('[OfflineDB] LocalStorage cache save failed:', e);
  }

  // Save to IndexedDB
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    store.put({ key: 'participant_race_info', value: cacheData });
  } catch (err) {
    console.warn('[OfflineDB] IndexedDB save cache failed:', err);
  }
}

/**
 * Get cached participant race data for offline mode
 */
export async function getParticipantRaceCache(): Promise<CachedRaceInfo | null> {
  // Try IndexedDB first
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_CACHE, 'readonly');
    const store = tx.objectStore(STORE_CACHE);
    const req = store.get('participant_race_info');

    const result = await new Promise<any>((resolve) => {
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });

    if (result) return result;
  } catch (e) {
    // Fall back to localStorage
  }

  try {
    const raw = localStorage.getItem(LOCAL_DATA_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return null;
}

/**
 * Add a new QR scan / check-in entry to the offline queue
 */
export async function queueOfflineScan(
  scanItem: Omit<OfflineScanQueueItem, 'id' | 'timestamp' | 'timeFormatted' | 'synced' | 'status'> & {
    status?: OfflineScanStatus;
  }
): Promise<OfflineScanQueueItem> {
  const now = Date.now();
  const timeFormatted = new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

  const fullItem: OfflineScanQueueItem = {
    ...scanItem,
    id: `offline-scan-${scanItem.teamId}-${scanItem.checkpointId || 'code'}-${now}`,
    timestamp: now,
    timeFormatted,
    status: scanItem.status || 'LOCAL_SAVED',
    synced: false,
    retryCount: 0
  };

  // 1. Save to LocalStorage queue backup
  try {
    const currentQueueRaw = localStorage.getItem(LOCAL_QUEUE_KEY);
    const currentQueue: OfflineScanQueueItem[] = currentQueueRaw ? JSON.parse(currentQueueRaw) : [];
    currentQueue.push(fullItem);
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(currentQueue));
  } catch (e) {
    console.warn('[OfflineDB] LocalStorage queue backup failed:', e);
  }

  // 2. Save to IndexedDB
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_SCANS);
    store.put(fullItem);
  } catch (e) {
    console.warn('[OfflineDB] IndexedDB scan queue failed:', e);
  }

  return fullItem;
}

/**
 * Update the status of an offline scan item (LOCAL_SAVED, SYNC_PENDING, SERVER_CONFIRMED, REJECTED, GPS_REVIEW_REQUIRED)
 */
export async function updateOfflineScanStatus(
  scanId: string,
  status: OfflineScanStatus,
  details?: {
    serverMessage?: string;
    serverCode?: string;
    pointsAwarded?: number;
    rejectionReason?: string;
  }
): Promise<void> {
  const now = Date.now();
  const isConfirmed = status === 'SERVER_CONFIRMED';

  // 1. Update in LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
    if (raw) {
      const items: OfflineScanQueueItem[] = JSON.parse(raw);
      const updated = items.map(item => {
        if (item.id === scanId) {
          return {
            ...item,
            status,
            synced: isConfirmed,
            serverSyncTimestamp: isConfirmed ? now : item.serverSyncTimestamp,
            serverMessage: details?.serverMessage || item.serverMessage,
            serverCode: details?.serverCode || item.serverCode,
            pointsAwarded: details?.pointsAwarded !== undefined ? details.pointsAwarded : item.pointsAwarded,
            rejectionReason: details?.rejectionReason || item.rejectionReason,
            retryCount: (item.retryCount || 0) + 1,
          };
        }
        return item;
      });
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // 2. Update in IndexedDB
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_SCANS);
    const req = store.get(scanId);
    req.onsuccess = () => {
      const item = req.result as OfflineScanQueueItem;
      if (item) {
        item.status = status;
        item.synced = isConfirmed;
        if (isConfirmed) item.serverSyncTimestamp = now;
        if (details?.serverMessage) item.serverMessage = details.serverMessage;
        if (details?.serverCode) item.serverCode = details.serverCode;
        if (details?.pointsAwarded !== undefined) item.pointsAwarded = details.pointsAwarded;
        if (details?.rejectionReason) item.rejectionReason = details.rejectionReason;
        item.retryCount = (item.retryCount || 0) + 1;
        store.put(item);
      }
    };
  } catch (e) {}
}

/**
 * Retrieve all offline scans (including confirmed history receipts)
 */
export async function getAllOfflineScans(teamId?: string): Promise<OfflineScanQueueItem[]> {
  let items: OfflineScanQueueItem[] = [];

  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_SCANS, 'readonly');
    const store = tx.objectStore(STORE_SCANS);

    items = await new Promise<OfflineScanQueueItem[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineScanQueueItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {}

  if (items.length === 0) {
    try {
      const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
      if (raw) items = JSON.parse(raw);
    } catch (e) {}
  }

  if (teamId) {
    return items.filter(i => i.teamId === teamId);
  }
  return items;
}

/**
 * Retrieve all pending (unsynced or review-required) offline scans
 */
export async function getPendingOfflineScans(teamId?: string): Promise<OfflineScanQueueItem[]> {
  const all = await getAllOfflineScans(teamId);
  return all.filter(i => i.status === 'LOCAL_SAVED' || i.status === 'SYNC_PENDING' || i.status === 'GPS_REVIEW_REQUIRED' || !i.synced);
}

/**
 * Mark scan as synced (backwards compatibility wrapper)
 */
export async function markScanAsSynced(scanId: string, serverMsg?: string, pts?: number): Promise<void> {
  await updateOfflineScanStatus(scanId, 'SERVER_CONFIRMED', {
    serverMessage: serverMsg || 'Terkonfirmasi server',
    pointsAwarded: pts
  });
}

/**
 * Clear all offline queue items
 */
export async function clearOfflineScanQueue(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_QUEUE_KEY);
  } catch (e) {}

  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_SCANS);
    store.clear();
  } catch (e) {}
}
