/**
 * Safe wrapper for localStorage operations to gracefully handle QuotaExceededError
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Failed to setItem for key "${key}":`, err);
    
    // Check if QuotaExceededError
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.code === 1014) {
      try {
        // Attempt to clean up old logs or broadcasts in localStorage if quota exceeded
        const logs = localStorage.getItem('racepoint_race_logs_v3');
        if (logs) {
          const parsedLogs = JSON.parse(logs);
          if (Array.isArray(parsedLogs) && parsedLogs.length > 15) {
            localStorage.setItem('racepoint_race_logs_v3', JSON.stringify(parsedLogs.slice(0, 15)));
          }
        }

        // Try setting again after pruning
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.warn(`[Storage] QuotaExceededError persisted on key "${key}". Content will remain in memory.`, retryErr);
        return false;
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to getItem for key "${key}":`, err);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to removeItem for key "${key}":`, err);
  }
}
