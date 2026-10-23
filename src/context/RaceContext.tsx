import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  EventItem, 
  Checkpoint, 
  Team, 
  TeamMember,
  ChallengeSubmission, 
  RaceControlStatus, 
  RaceLog, 
  RaceBroadcast, 
  SosAlert,
  CheckpointVisit 
} from '../types';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storage';
import { compressImageDataUrl } from '../utils/imageCompressor';
import { saveParticipantRaceCache } from '../utils/participantOfflineManager';
import { 
  DEMO_EVENTS, 
  DEMO_CHECKPOINTS, 
  DEMO_TEAMS, 
  DEMO_SUBMISSIONS 
} from '../data/demoData';
import { auth, googleProvider, testFirestoreConnection } from '../firebase/config';
import { firestoreService, SyncStatus } from '../firebase/firestoreService';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'organizer' | 'judge' | 'participant' | 'guest';

interface RaceContextType {
  events: EventItem[];
  checkpoints: Checkpoint[];
  teams: Team[];
  submissions: ChallengeSubmission[];
  activeTeamId: string | null;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;

  // Firebase Realtime & Sync State
  syncStatus: SyncStatus;
  firebaseUser: FirebaseUser | null;
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  signOutFirebase: () => Promise<void>;

  // RBAC & Role Auth
  currentUserRole: UserRole;
  adminPassword: string;
  judgePassword: string;
  loginAsRole: (role: 'organizer' | 'judge', passwordInput: string) => { success: boolean; message: string };
  logoutRole: () => void;
  updateRolePasswords: (newAdminPass?: string, newJudgePass?: string) => void;
  hasAccess: (requiredRole: 'organizer' | 'judge') => boolean;
  
  // Race Control & Timer
  raceStatus: RaceControlStatus;
  raceElapsedSeconds: number;
  raceLogs: RaceLog[];
  broadcasts: RaceBroadcast[];
  sosAlerts: SosAlert[];
  startRace: () => void;
  pauseRace: () => void;
  endRace: () => void;
  resetRaceTimer: () => void;
  sendBroadcast: (title: string, message: string, type: 'urgent' | 'info' | 'weather' | 'clue') => void;
  deleteBroadcast: (id: string) => void;
  triggerSos: (teamId: string, coordinates: { lat: number; lng: number }) => void;
  resolveSos: (alertId: string) => void;

  // Registration & Teams
  registerTeam: (teamData: {
    eventId: string;
    name: string;
    category: string;
    leaderName: string;
    leaderPhone?: string;
    leaderEmail?: string;
    organization?: string;
    members?: (string | TeamMember)[];
    customBibNumber?: string;
    customPinCode?: string;
    color?: string;
  }) => { team: Team; pinCode: string; bibNumber: string };
  updateTeam: (teamId: string, updatedData: Partial<Team>) => Team | undefined;
  updateTeamCoordinates: (
    teamId: string,
    coords: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }
  ) => void;
  deleteTeam: (teamId: string) => void;
  
  // Participant Session
  loginParticipant: (bibNumber: string, pinCode: string) => Promise<{ success: boolean; team?: Team; message?: string; sessionToken?: string }>;
  logoutParticipant: () => void;
  setActiveTeamId: (teamId: string | null) => void;
  
  // Checkpoint & Race Actions
  checkInCheckpoint: (teamId: string, checkpointId: string, bypassCooldown?: boolean, gpsCoords?: { lat: number; lng: number; accuracy?: number }) => Promise<{ 
    success: boolean; 
    pointsAwarded: number; 
    checkpointName: string;
    isCooldown?: boolean;
    isLocked?: boolean;
    isDuplicate?: boolean;
    code?: string;
    remainingSeconds?: number;
    message?: string;
  }>;
  checkInByQrCode: (teamId: string, qrCodeInput: string, bypassCooldown?: boolean, gpsCoords?: { lat: number; lng: number; accuracy?: number }) => Promise<{ 
    success: boolean; 
    pointsAwarded: number; 
    checkpointName: string; 
    message: string;
    isCooldown?: boolean;
    isLocked?: boolean;
    isDuplicate?: boolean;
    code?: string;
    remainingSeconds?: number;
  }>;
  getTeamRemainingCooldown: (teamId: string) => {
    inCooldown: boolean;
    remainingSeconds: number;
    minIntervalSeconds: number;
  };
  clearTeamCooldown: (teamId: string) => void;
  submitChallengeProof: (teamId: string, checkpointId: string, type: 'photo' | 'quiz_answer', content: string, contentUrl?: string) => void;
  
  // Judge Actions
  reviewSubmission: (submissionId: string, status: 'approved' | 'rejected', score: number, note: string) => void;
  submitJudgeManualScore: (
    teamIdOrBib: string,
    checkpointIdOrCode: string,
    score: number,
    note: string,
    markCheckpointCompleted?: boolean,
    photoUrl?: string,
    isPenalty?: boolean,
    penaltyMinutesToAdd?: number
  ) => {
    success: boolean;
    message: string;
    teamName?: string;
    checkpointName?: string;
    scoreAwarded?: number;
    penaltyDeducted?: number;
    penaltyMinutesAdded?: number;
  };
  
  // Organizer Actions
  createEvent: (eventData: Partial<EventItem>) => EventItem;
  updateEvent: (eventId: string, updatedData: Partial<EventItem>) => EventItem | undefined;
  deleteEvent: (eventId: string) => void;
  createCheckpoint: (checkpointData: Partial<Checkpoint>) => Checkpoint;
  updateCheckpoint: (checkpointId: string, updatedData: Partial<Checkpoint>) => Checkpoint | undefined;
  deleteCheckpoint: (checkpointId: string) => void;
  batchUpdateCheckpointPoints: (points: number) => void;
  resetToDemoData: () => void;
  refreshDataFromStorage: () => void;
  
  // Official Production Mode Actions
  isOfficialMode: boolean;
  activateOfficialMode: (options: {
    title: string;
    location: string;
    date?: string;
    timeRange?: string;
    description?: string;
    preserveCheckpoints?: boolean;
  }) => void;
  switchToDemoMode: () => void;

  // Participant Simulation & Stress-Test Actions
  batchGenerateTeams: (
    count: number,
    options?: {
      category?: string;
      withProgression?: boolean;
      eventId?: string;
    }
  ) => { generatedCount: number; executionTimeMs: number; totalTeams: number };
  clearSimulatedTeams: () => { removedCount: number; remainingTeams: number };
  simulateBulkRaceActivity: (batchSize?: number) => Promise<{ processedCount: number; executionTimeMs: number }>;
}

const RaceContext = createContext<RaceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EVENTS: 'racepoint_events_v2',
  CHECKPOINTS: 'racepoint_checkpoints_v2',
  TEAMS: 'racepoint_teams_v2',
  SUBMISSIONS: 'racepoint_submissions_v2',
  ACTIVE_TEAM: 'racepoint_active_team_v2',
  RACE_STATUS: 'racepoint_race_status_v3',
  RACE_SECONDS: 'racepoint_race_seconds_v3',
  RACE_LOGS: 'racepoint_race_logs_v3',
  BROADCASTS: 'racepoint_broadcasts_v4',
};

const DEFAULT_LOGS: RaceLog[] = [
  { id: 'log-1', time: '08:00 WIB', message: 'Sistem siap: Seluruh stiker QR pos kontrol telah diverifikasi panitia.', type: 'system' },
  { id: 'log-2', time: '08:15 WIB', message: 'Perlombaan dimulai! 16 tim serentak bergerak mencari Pos 1.', type: 'system' },
  { id: 'log-3', time: '08:45 WIB', message: 'Tim Garuda Merah berhasil melakukan scan barcode di Pos 1.', type: 'checkin' },
  { id: 'log-4', time: '09:12 WIB', message: 'Juri Pos 2 menyetujui foto formasi tim Garuda Merah (+150 Poin).', type: 'judge' },
];

const DEFAULT_BROADCASTS: RaceBroadcast[] = [
  {
    id: 'bc-1',
    time: '09:00 WIB',
    title: 'Waspada Jalur Licin di Sektor Hutan',
    message: 'Jalur antara Pos 2 dan Pos 3 sedikit licin karena embun pagi. Seluruh regu diimbau berhati-hati saat berlari.',
    type: 'weather',
    author: 'Direktur Perlombaan'
  },
  {
    id: 'bc-2',
    time: '09:35 WIB',
    title: 'Pengingat Waktu Lomba & Pos Wajib',
    message: 'Batas akhir lomba pukul 11:30 WIB. Pastikan seluruh tim menyelesaikan Pos Wajib sebelum menuju garis finis!',
    type: 'info',
    author: 'Panitia Waktu'
  }
];

export const RaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Sync & Auth States
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // 2. Data States with Local Cache fallback
  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.EVENTS);
    return saved ? JSON.parse(saved) : DEMO_EVENTS;
  });

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.CHECKPOINTS);
    return saved ? JSON.parse(saved) : DEMO_CHECKPOINTS;
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.TEAMS);
    return saved ? JSON.parse(saved) : DEMO_TEAMS;
  });

  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.SUBMISSIONS);
    return saved ? JSON.parse(saved) : DEMO_SUBMISSIONS;
  });

  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => {
    return safeGetItem(STORAGE_KEYS.ACTIVE_TEAM) || 'team-01';
  });

  const [selectedEventId, setSelectedEventIdState] = useState<string>(() => {
    return safeGetItem('racepoint_selected_event_id_v1') || 'evt-01';
  });

  // Official Production Mode State (false = Demo Mode with simulated presets, true = Official Live Mode)
  const [isOfficialMode, setIsOfficialMode] = useState<boolean>(() => {
    return safeGetItem('racepoint_official_mode') === 'true';
  });

  const setSelectedEventId = (id: string) => {
    setSelectedEventIdState(id);
    safeSetItem('racepoint_selected_event_id_v1', id);
  };

  // RBAC & Role Auth State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = safeGetItem('racepoint_user_role_v1');
    return (saved as UserRole) || 'organizer';
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return safeGetItem('racepoint_admin_pass_v1') || '';
  });

  const [judgePassword, setJudgePassword] = useState<string>(() => {
    return safeGetItem('racepoint_judge_pass_v1') || '';
  });

  // Race Control & Timer State
  const [raceStatus, setRaceStatus] = useState<RaceControlStatus>(() => {
    const saved = safeGetItem(STORAGE_KEYS.RACE_STATUS);
    return (saved as RaceControlStatus) || 'running';
  });

  const [raceElapsedSeconds, setRaceElapsedSeconds] = useState<number>(() => {
    const saved = safeGetItem(STORAGE_KEYS.RACE_SECONDS);
    return saved ? Number(saved) : 6120;
  });

  const [raceLogs, setRaceLogs] = useState<RaceLog[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.RACE_LOGS);
    return saved ? JSON.parse(saved) : DEFAULT_LOGS;
  });

  const [broadcasts, setBroadcasts] = useState<RaceBroadcast[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.BROADCASTS);
    return saved ? JSON.parse(saved) : DEFAULT_BROADCASTS;
  });

  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>(() => {
    const saved = safeGetItem('racepoint_sos_alerts_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Track Firebase Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        if (user.email === 'mochyusuf.ad2@gmail.com') {
          setCurrentUserRole('organizer');
          safeSetItem('racepoint_user_role_v1', 'organizer');
        }
      }
    });

    const unsubStatus = firestoreService.onSyncStatusChange((st) => {
      setSyncStatus(st);
    });

    return () => {
      unsubAuth();
      unsubStatus();
    };
  }, []);

  // 1. Initial Firestore Setup & Global Events Listener (Runs once on mount)
  useEffect(() => {
    let isMounted = true;
    let unsubEvents: (() => void) | null = null;

    async function initFirestore() {
      try {
        await testFirestoreConnection();
        await firestoreService.seedInitialDataIfEmpty();
      } catch (err) {
        console.warn('Initial Firestore seeding check encountered a minor warning:', err);
      }

      if (isMounted) {
        unsubEvents = firestoreService.subscribeEvents((newEvents) => {
          if (isMounted && newEvents.length > 0) setEvents(newEvents);
        });
      }
    }

    initFirestore();

    return () => {
      isMounted = false;
      if (unsubEvents) unsubEvents();
    };
  }, []);

  // 2. Multi-Event Isolated Listeners (Re-subscribes cleanly whenever selectedEventId changes)
  useEffect(() => {
    let isMounted = true;
    if (!selectedEventId) return;

    // Filter all realtime listeners strictly by selectedEventId
    const unsubCps = firestoreService.subscribeCheckpoints((newCps) => {
      if (isMounted) {
        if (newCps.length > 0) {
          setCheckpoints(newCps);
        } else {
          const fallback = DEMO_CHECKPOINTS.filter(c => (c as any).eventId === selectedEventId || selectedEventId === 'evt-01');
          setCheckpoints(fallback);
        }
      }
    }, selectedEventId);

    const unsubTeams = firestoreService.subscribeTeams((newTeams) => {
      if (isMounted) {
        if (newTeams.length > 0) {
          setTeams(newTeams);
        } else {
          const fallback = DEMO_TEAMS.filter(t => (t as any).eventId === selectedEventId || selectedEventId === 'evt-01');
          setTeams(fallback);
        }
      }
    }, selectedEventId);

    const unsubSubs = firestoreService.subscribeSubmissions((newSubs) => {
      if (isMounted) setSubmissions(newSubs);
    }, selectedEventId);

    const unsubLogs = firestoreService.subscribeLogs((newLogs) => {
      if (isMounted) setRaceLogs(newLogs);
    }, selectedEventId);

    const unsubBc = firestoreService.subscribeBroadcasts((newBc) => {
      if (isMounted) setBroadcasts(newBc);
    }, selectedEventId);

    const unsubSos = firestoreService.subscribeSosAlerts((newSos) => {
      if (isMounted) setSosAlerts(newSos);
    }, selectedEventId);

    return () => {
      isMounted = false;
      unsubCps();
      unsubTeams();
      unsubSubs();
      unsubLogs();
      unsubBc();
      unsubSos();
    };
  }, [selectedEventId]);

  // Google Login / Signout helpers
  const signInWithGoogle = async () => {
    try {
      setSyncStatus('syncing');
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user.email === 'mochyusuf.ad2@gmail.com') {
        setCurrentUserRole('organizer');
        safeSetItem('racepoint_user_role_v1', 'organizer');
      }
      setSyncStatus('synced');
      return { success: true, message: `Berhasil login dengan akun Google: ${cred.user.displayName || cred.user.email}` };
    } catch (err) {
      setSyncStatus('error');
      return { success: false, message: `Gagal login Google: ${err instanceof Error ? err.message : String(err)}` };
    }
  };

  const signOutFirebase = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setCurrentUserRole('guest');
    safeSetItem('racepoint_user_role_v1', 'guest');
  };

  // RBAC Actions
  const loginAsRole = (role: 'organizer' | 'judge', passwordInput: string) => {
    const cleanPass = passwordInput.trim();
    if (role === 'organizer') {
      if (cleanPass === adminPassword) {
        setCurrentUserRole('organizer');
        safeSetItem('racepoint_user_role_v1', 'organizer');
        return { success: true, message: 'Berhasil login sebagai Panitia (Organizer Admin)!' };
      }
      return { success: false, message: 'Password Panitia / Admin salah! Silakan coba lagi.' };
    } else if (role === 'judge') {
      if (cleanPass === judgePassword || cleanPass === adminPassword) {
        setCurrentUserRole('judge');
        safeSetItem('racepoint_user_role_v1', 'judge');
        return { success: true, message: 'Berhasil login sebagai Juri Pos / Fasilitator!' };
      }
      return { success: false, message: 'Password Juri Pos salah! Silakan coba lagi.' };
    }
    return { success: false, message: 'Peran tidak dikenali.' };
  };

  const logoutRole = () => {
    setCurrentUserRole('guest');
    safeSetItem('racepoint_user_role_v1', 'guest');
  };

  const updateRolePasswords = (newAdminPass?: string, newJudgePass?: string) => {
    if (newAdminPass && newAdminPass.trim().length > 0) {
      setAdminPassword(newAdminPass.trim());
      safeSetItem('racepoint_admin_pass_v1', newAdminPass.trim());
    }
    if (newJudgePass && newJudgePass.trim().length > 0) {
      setJudgePassword(newJudgePass.trim());
      safeSetItem('racepoint_judge_pass_v1', newJudgePass.trim());
    }
  };

  const hasAccess = (requiredRole: 'organizer' | 'judge') => {
    if (firebaseUser?.email === 'mochyusuf.ad2@gmail.com') return true;
    if (requiredRole === 'organizer') {
      return currentUserRole === 'organizer';
    }
    if (requiredRole === 'judge') {
      return currentUserRole === 'judge' || currentUserRole === 'organizer';
    }
    return true;
  };

  // Global Timer Ticker when status is running
  useEffect(() => {
    if (raceStatus !== 'running') return;
    const interval = setInterval(() => {
      setRaceElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [raceStatus]);

  // Sync to LocalStorage for offline resilience
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(checkpoints));
    saveParticipantRaceCache(checkpoints, teams);
  }, [checkpoints, teams]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.RACE_STATUS, raceStatus);
  }, [raceStatus]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.RACE_SECONDS, String(raceElapsedSeconds));
  }, [raceElapsedSeconds]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.RACE_LOGS, JSON.stringify(raceLogs));
  }, [raceLogs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.BROADCASTS, JSON.stringify(broadcasts));
  }, [broadcasts]);

  useEffect(() => {
    safeSetItem('racepoint_sos_alerts_v1', JSON.stringify(sosAlerts));
  }, [sosAlerts]);

  useEffect(() => {
    if (activeTeamId) {
      safeSetItem(STORAGE_KEYS.ACTIVE_TEAM, activeTeamId);
    } else {
      safeRemoveItem(STORAGE_KEYS.ACTIVE_TEAM);
    }
  }, [activeTeamId]);

  // Helper to add log and persist to Firestore
  const addLog = (message: string, type: 'checkin' | 'judge' | 'system' | 'registration') => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newLog: RaceLog = {
      id: `log-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
      time: nowTime,
      message,
      type,
    };
    setRaceLogs((prev) => [newLog, ...prev.slice(0, 29)]);
    firestoreService.addActivityLog(newLog, selectedEventId);
  };

  const startRace = () => {
    setRaceStatus('running');
    addLog('Race Director: Balapan resmi DIMULAI!', 'system');
  };

  const pauseRace = () => {
    setRaceStatus('paused');
    addLog('Race Director: Balapan DIHENTIKAN SEMENTARA (PAUSED).', 'system');
  };

  const endRace = () => {
    setRaceStatus('ended');
    addLog('Race Director: Garis Finish DITUTUP. Perlombaan Selesai.', 'system');
  };

  const resetRaceTimer = () => {
    setRaceElapsedSeconds(0);
    setRaceStatus('not_started');
    addLog('Race Director: Timer balapan di-reset ke 00:00:00.', 'system');
  };

  const sendBroadcast = (title: string, message: string, type: 'urgent' | 'info' | 'weather' | 'clue') => {
    const newBc: RaceBroadcast = {
      id: `bc-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      title,
      message,
      type,
      author: 'Direktur Perlombaan'
    };
    setBroadcasts((prev) => [newBc, ...prev]);
    firestoreService.addBroadcast(newBc, selectedEventId);
    addLog(`Pengumuman Siaran: "${title}" (${type.toUpperCase()})`, 'system');
  };

  const deleteBroadcast = (id: string) => {
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    firestoreService.deleteBroadcast(id);
  };

  const triggerSos = (teamId: string, coordinates: { lat: number; lng: number }) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const now = Date.now();
    const timeString = new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    
    const newAlert: SosAlert = {
      id: `sos-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      bibNumber: team.bibNumber,
      timestamp: now,
      timeString,
      coordinates,
      status: 'active'
    };

    setSosAlerts(prev => [newAlert, ...prev]);
    firestoreService.sendSosAlert(newAlert, selectedEventId);
  };

  const resolveSos = (alertId: string) => {
    setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
    firestoreService.resolveSosAlert(alertId);
  };

  // Register Team
  const registerTeam = (teamData: {
    eventId: string;
    name: string;
    category: string;
    leaderName: string;
    leaderPhone?: string;
    leaderEmail?: string;
    organization?: string;
    members?: (string | TeamMember)[];
    customBibNumber?: string;
    customPinCode?: string;
    color?: string;
  }) => {
    const teamNum = teams.length + 1;
    const bibLetter = String.fromCharCode(65 + (teamNum % 26));
    const autoBibNumber = `${bibLetter}-${String(teamNum).padStart(2, '0')}`;
    const bibNumber = teamData.customBibNumber?.trim().toUpperCase() || autoBibNumber;
    const pinCode = teamData.customPinCode?.trim() || String(1000 + Math.floor(Math.random() * 9000));
    const newId = `team-${Date.now()}`;

    // Process structured member roster
    const rawMembers = teamData.members || [];
    const formattedAdditionalMembers: TeamMember[] = rawMembers.map((m, idx) => {
      if (typeof m === 'string') {
        return { name: m.trim(), role: 'Anggota' };
      }
      return {
        name: m.name.trim() || `Anggota ${idx + 1}`,
        role: m.role || 'Anggota',
        phone: m.phone?.trim(),
        notes: m.notes?.trim()
      };
    }).filter(m => m.name.length > 0);

    const leaderMember: TeamMember = {
      name: teamData.leaderName.trim(),
      role: 'Ketua Tim',
      phone: teamData.leaderPhone?.trim()
    };

    // Ensure leader is first, followed by other members (avoiding duplicate leader)
    const memberList: TeamMember[] = [
      leaderMember,
      ...formattedAdditionalMembers.filter(m => m.name.toLowerCase() !== leaderMember.name.toLowerCase())
    ];

    const colors = ['bg-orange-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-cyan-600'];
    const assignedColor = teamData.color || colors[teamNum % colors.length];

    const newTeam: Team = {
      id: newId,
      eventId: teamData.eventId || selectedEventId,
      name: teamData.name.trim(),
      category: teamData.category.trim() || 'Umum & Komunitas',
      color: assignedColor,
      bibNumber,
      members: memberList,
      checkpointsCompleted: 0,
      totalCheckpoints: checkpoints.length,
      currentCheckpointId: checkpoints[0]?.id || 'cp-01',
      points: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      startTime: '08:30 WIB',
      durationMinutes: 0,
      status: 'racing',
      lastPosName: 'Garis Start',
      lastUpdated: 'Baru saja terdaftar',
      pinCode,
      organization: teamData.organization,
      leaderPhone: teamData.leaderPhone,
      leaderEmail: teamData.leaderEmail,
    };

    setTeams((prev) => [newTeam, ...prev]);
    setActiveTeamId(newId);
    firestoreService.saveTeam(newTeam, teamData.eventId || selectedEventId);
    addLog(`Tim Baru Terdaftar: "${teamData.name}" (BIB ${bibNumber}) oleh ${teamData.leaderName}.`, 'registration');

    return { team: newTeam, bibNumber, pinCode };
  };

  const updateTeam = (teamId: string, updatedData: Partial<Team>) => {
    let updated: Team | undefined;
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          const nextBonus = updatedData.bonusPoints !== undefined ? updatedData.bonusPoints : t.bonusPoints;
          const nextPenalty = updatedData.penaltyPoints !== undefined ? updatedData.penaltyPoints : t.penaltyPoints;
          const nextPoints = updatedData.points !== undefined ? updatedData.points : t.points;
          const nextTotal = nextPoints + nextBonus - nextPenalty;
          updated = {
            ...t,
            ...updatedData,
            totalScore: updatedData.totalScore !== undefined ? updatedData.totalScore : nextTotal,
          };
          return updated;
        }
        return t;
      })
    );
    if (updated) {
      firestoreService.saveTeam(updated, selectedEventId);
      addLog(`Tim Diperbarui: "${updated.name}" (BIB ${updated.bibNumber}).`, 'system');
    }
    return updated;
  };

  const updateTeamCoordinates = (
    teamId: string,
    coords: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }
  ) => {
    const now = Date.now();
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            currentCoordinates: { lat: coords.lat, lng: coords.lng },
            lastLocationTimestamp: now,
            lastLocationAccuracy: coords.accuracy,
            lastLocationSpeed: coords.speed,
            lastLocationHeading: coords.heading,
          };
        }
        return t;
      })
    );
    // Send background telemetry to Firestore
    firestoreService.updateTeamLocation(teamId, coords, selectedEventId);
    
    // Also post to REST endpoint if online
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch('/api/participant/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          coordinates: { lat: coords.lat, lng: coords.lng },
          accuracy: coords.accuracy,
          speed: coords.speed,
          heading: coords.heading,
          eventId: selectedEventId,
        }),
      }).catch(() => {
        // Telemetry endpoint non-blocking fallback
      });
    }
  };

  const deleteTeam = (teamId: string) => {
    const target = teams.find((t) => t.id === teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    if (activeTeamId === teamId) {
      setActiveTeamId(null);
    }
    firestoreService.deleteTeam(teamId);
    addLog(`Tim Dihapus: "${target?.name || teamId}".`, 'system');
  };

  // Participant Login via BIB & PIN (Server verified with cryptographic session token)
  const loginParticipant = async (bibNumber: string, pinCode: string) => {
    const cleanBib = bibNumber.trim().toUpperCase();
    const cleanPin = pinCode.trim();

    try {
      const res = await fetch('/api/participant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibNumber: cleanBib, pinCode: cleanPin }),
      });
      const data = await res.json();
      if (data.success && data.team) {
        setActiveTeamId(data.team.id);
        safeSetItem(STORAGE_KEYS.ACTIVE_TEAM, data.team.id);
        if (data.team.eventId && data.team.eventId !== selectedEventId) {
          setSelectedEventId(data.team.eventId);
        }
        if (data.sessionToken) {
          safeSetItem('racepoint_session_token_v1', data.sessionToken);
        }
        addLog(`Peserta Login: Tim "${data.team.name}" (BIB ${data.team.bibNumber}) berhasil terverifikasi masuk server.`, 'system');
        const matched = teams.find((t) => t.id === data.team.id) || data.team;
        return { success: true, team: matched, sessionToken: data.sessionToken };
      }
      return { success: false, message: data.message || 'Nomor BIB atau PIN tidak cocok.' };
    } catch {
      // Offline fallback: verify against cached teams if network is down
      const matched = teams.find(
        (t) => t.bibNumber.toUpperCase() === cleanBib && (t as any).pinCode === cleanPin
      );

      if (matched) {
        setActiveTeamId(matched.id);
        safeSetItem(STORAGE_KEYS.ACTIVE_TEAM, matched.id);
        if ((matched as any).eventId && (matched as any).eventId !== selectedEventId) {
          setSelectedEventId((matched as any).eventId);
        }
        addLog(`Peserta Login (Offline): Tim "${matched.name}" masuk ke sistem HP di lintasan.`, 'system');
        return { success: true, team: matched };
      }

      return { 
        success: false, 
        message: 'Nomor BIB atau PIN tidak cocok. Silakan periksa kembali atau hubungi panitia.' 
      };
    }
  };

  const logoutParticipant = () => {
    const sessionToken = safeGetItem('racepoint_session_token_v1');
    if (sessionToken) {
      fetch('/api/participant/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      }).catch((err) => console.warn('[Logout Revocation Notice]:', err));
    }
    setActiveTeamId(null);
    safeRemoveItem(STORAGE_KEYS.ACTIVE_TEAM);
    safeRemoveItem('racepoint_session_token_v1');
  };

  // Anti-speedrun cooldown helper
  const getTeamRemainingCooldown = (teamId: string) => {
    const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
    const isEnforced = currentEvent?.enforceMinInterval !== false;
    const minInterval = currentEvent?.minIntervalBetweenCheckpointsSeconds ?? currentEvent?.scoringRules?.minIntervalSeconds ?? 30;

    if (!isEnforced || minInterval <= 0) {
      return { inCooldown: false, remainingSeconds: 0, minIntervalSeconds: 0 };
    }

    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam || !targetTeam.lastCheckinTimestamp) {
      return { inCooldown: false, remainingSeconds: 0, minIntervalSeconds: minInterval };
    }

    const elapsedSeconds = Math.floor((Date.now() - targetTeam.lastCheckinTimestamp) / 1000);
    const remainingSeconds = minInterval - elapsedSeconds;

    if (remainingSeconds > 0) {
      return { inCooldown: true, remainingSeconds, minIntervalSeconds: minInterval };
    }

    return { inCooldown: false, remainingSeconds: 0, minIntervalSeconds: minInterval };
  };

  const clearTeamCooldown = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      updateTeam(teamId, { lastCheckinTimestamp: undefined });
      addLog(`Bypass Anti-Cheat: Panitia me-reset waktu jeda pos untuk Tim "${team.name}".`, 'system');
    }
  };

  // Check-in by Checkpoint ID (delegates to atomic Firestore transaction with GPS & anti-duplicate protection)
  const checkInCheckpoint = async (
    teamId: string, 
    checkpointId: string, 
    bypassCooldown = false,
    gpsCoords?: { lat: number; lng: number; accuracy?: number }
  ) => {
    const cp = checkpoints.find((c) => c.id === checkpointId);
    if (!cp) {
      return { 
        success: false, 
        pointsAwarded: 0, 
        checkpointName: '', 
        message: 'Pos checkpoint tidak ditemukan.' 
      };
    }
    return await checkInByQrCode(teamId, cp.qrCodeValue, bypassCooldown, gpsCoords);
  };

  // Check-in by typed / scanned barcode text with Realtime Firestore Atomic Transaction
  const checkInByQrCode = async (
    teamId: string, 
    qrCodeInput: string, 
    bypassCooldown = false,
    gpsCoords?: { lat: number; lng: number; accuracy?: number }
  ) => {
    const cleanInput = qrCodeInput.trim().toUpperCase();
    if (!cleanInput) {
      return { 
        success: false, 
        pointsAwarded: 0, 
        checkpointName: '', 
        message: 'Harap masukkan atau pindai kode QR pos.' 
      };
    }

    const currentEvt = events.find((e) => e.id === selectedEventId) || events[0];
    const sessionToken = safeGetItem('racepoint_session_token_v1') || undefined;

    // Process through Firestore Service with transaction and duplicate check
    const scanRes = await firestoreService.processCheckInScan({
      teamId,
      qrCodeInput: cleanInput,
      checkpoints,
      event: currentEvt,
      gpsCoordinates: gpsCoords,
      bypassCooldown,
      sessionToken,
    });

    return {
      success: scanRes.success,
      pointsAwarded: scanRes.pointsAwarded,
      checkpointName: scanRes.checkpointName,
      message: scanRes.message,
      code: scanRes.code,
      isDuplicate: scanRes.isDuplicate,
      isCooldown: scanRes.isCooldown,
      remainingSeconds: scanRes.remainingSeconds,
    };
  };

  // Submit proof from Participant
  const submitChallengeProof = async (
    teamId: string,
    checkpointId: string,
    type: 'photo' | 'quiz_answer',
    content: string,
    contentUrl?: string
  ) => {
    const team = teams.find((t) => t.id === teamId);
    const cp = checkpoints.find((c) => c.id === checkpointId);

    let finalUrl = contentUrl;
    if (finalUrl && finalUrl.startsWith('data:image/')) {
      finalUrl = await compressImageDataUrl(finalUrl, 800, 800, 0.7);
    }

    const newSub: ChallengeSubmission = {
      id: `sub-${Date.now()}`,
      teamId,
      teamName: team?.name || 'Tim Peserta',
      checkpointId,
      checkpointName: cp?.name || 'Pos Checkpoint',
      submittedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      type,
      contentText: content,
      contentUrl: finalUrl || undefined,
      status: 'pending',
      scoreGiven: 0,
      judgeNote: 'Menunggu pemeriksaan fasilitator pos.',
    };

    setSubmissions((prev) => [newSub, ...prev]);
    firestoreService.submitChallenge(newSub, selectedEventId);
  };

  // Judge review submission
  const reviewSubmission = (
    submissionId: string,
    status: 'approved' | 'rejected',
    score: number,
    note: string
  ) => {
    firestoreService.reviewChallengeSubmission(submissionId, status, score, note);
  };

  // Manual score input & penalty submission by judge
  const submitJudgeManualScore = (
    teamIdOrBib: string,
    checkpointIdOrCode: string,
    score: number,
    note: string,
    markCheckpointCompleted?: boolean,
    photoUrl?: string,
    isPenalty = false,
    penaltyMinutesToAdd = 0
  ) => {
    const cleanTeamInput = (teamIdOrBib || '').trim().toLowerCase();
    const cleanCodeInput = (checkpointIdOrCode || '').trim().toUpperCase();

    if (!cleanTeamInput) {
      return { success: false, message: 'Harap masukkan ID Tim atau nomor BIB terlebih dahulu!' };
    }

    if (!cleanCodeInput) {
      return { success: false, message: 'Harap masukkan Kode Pos atau ID Checkpoint terlebih dahulu!' };
    }

    const targetTeam = teams.find((t) => 
      t.id.toLowerCase() === cleanTeamInput ||
      t.bibNumber.toLowerCase() === cleanTeamInput ||
      t.name.toLowerCase() === cleanTeamInput
    );

    if (!targetTeam) {
      return {
        success: false,
        message: `ID Tim atau nomor BIB "${teamIdOrBib}" tidak ditemukan dalam daftar tim peserta!`,
      };
    }

    const targetCp = checkpoints.find((c) => {
      const cpId = c.id.toUpperCase();
      const qrVal = c.qrCodeValue.toUpperCase();
      const cpName = c.name.toUpperCase();
      return (
        cpId === cleanCodeInput ||
        qrVal === cleanCodeInput ||
        qrVal.replace(/-/g, '') === cleanCodeInput.replace(/-/g, '') ||
        cpName === cleanCodeInput
      );
    });

    if (!targetCp) {
      return {
        success: false,
        message: `Kode Pos atau ID Checkpoint "${checkpointIdOrCode}" tidak valid!`,
      };
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      return { success: false, message: 'Nilai skor juri harus berupa angka valid!' };
    }

    const isPenaltyAction = isPenalty || numericScore < 0 || penaltyMinutesToAdd > 0;
    const penaltyPointsDeducted = isPenaltyAction ? Math.abs(numericScore) : 0;
    const bonusPointsEarned = !isPenaltyAction ? Math.max(0, numericScore) : 0;
    const addedTime = Math.max(0, Number(penaltyMinutesToAdd) || 0);

    // Call Firestore service
    firestoreService.submitJudgeManualScore({
      teamId: targetTeam.id,
      checkpointId: targetCp.id,
      score: isPenaltyAction ? penaltyPointsDeducted : bonusPointsEarned,
      note,
      markCheckpointCompleted,
      photoUrl,
      isPenalty: isPenaltyAction,
      penaltyMinutesToAdd: addedTime,
      eventId: selectedEventId,
    });

    return {
      success: true,
      message: isPenaltyAction 
        ? `Penalti tersimpan! Tim ${targetTeam.name} dikenakan -${penaltyPointsDeducted} Poin di ${targetCp.name}.`
        : `Skor manual tersimpan! +${bonusPointsEarned} poin untuk ${targetTeam.name} di ${targetCp.name}.`,
      teamName: targetTeam.name,
      checkpointName: targetCp.name,
      scoreAwarded: bonusPointsEarned,
      penaltyDeducted: penaltyPointsDeducted,
      penaltyMinutesAdded: addedTime,
    };
  };

  // Create Event
  const createEvent = (eventData: Partial<EventItem>) => {
    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: eventData.title || 'Event Baru Tanpa Judul',
      subtitle: eventData.subtitle || 'Kategori Petualangan',
      eventType: eventData.eventType || 'amazing_race',
      status: 'active',
      date: eventData.date || 'Hari Ini',
      timeRange: eventData.timeRange || '08:00 - 12:00 WIB',
      location: eventData.location || 'Lokasi Terbuka',
      totalTeams: 0,
      totalCheckpoints: checkpoints.length,
      timeLimitMinutes: eventData.timeLimitMinutes || 180,
      organizerName: eventData.organizerName || 'Panitia Pelaksana',
      description: eventData.description || 'Deskripsi rute event.',
      bannerGradient: 'from-blue-900 via-slate-900 to-orange-950',
      rules: eventData.rules || [
        'Setiap tim wajib beranggotakan lengkap saat tiba dan memindai barcode di pos.',
        'Dilarang menggunakan kendaraan bermotor selama rute balapan.',
        'Pos bertanda "Wajib" harus diselesaikan sebelum tim menuju garis finish.',
        'Foto tantangan tim harus memuat wajah seluruh anggota dan petunjuk pos.',
        'Penalti 10 poin per menit jika melebihi batas waktu tempuh.'
      ],
      scoringRules: eventData.scoringRules || {
        penaltyPerLateMin: 10,
        maxLateMinutes: 30,
        mandatoryBonus: 100,
        judgeMaxScore: 150
      }
    };

    setEvents((prev) => [newEvent, ...prev]);
    firestoreService.saveEvent(newEvent);
    addLog(`Event Baru Dibuat: "${newEvent.title}" di ${newEvent.location}.`, 'system');
    return newEvent;
  };

  // Update Event
  const updateEvent = (eventId: string, updatedData: Partial<EventItem>) => {
    let updated: EventItem | undefined;
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id === eventId) {
          updated = { ...evt, ...updatedData };
          return updated;
        }
        return evt;
      })
    );
    if (updated) {
      firestoreService.saveEvent(updated);
      addLog(`Event Diperbarui: "${updated.title}".`, 'system');
    }
    return updated;
  };

  // Delete Event
  const deleteEvent = (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEventId === eventId) {
      const remaining = events.filter((e) => e.id !== eventId);
      if (remaining.length > 0) {
        setSelectedEventId(remaining[0].id);
      }
    }
    firestoreService.deleteEvent(eventId);
    addLog(`Event Dihapus: "${target?.title || eventId}".`, 'system');
  };

  // Create Checkpoint
  const createCheckpoint = (checkpointData: Partial<Checkpoint>) => {
    const nextNumber = checkpoints.length + 1;
    const randomHash = Math.random().toString(36).substring(2, 8);
    const uniqueId = checkpointData.id || `cp-${Date.now()}-${randomHash}`;
    
    const newCp: Checkpoint = {
      id: uniqueId,
      number: nextNumber,
      name: checkpointData.name || `Pos ${nextNumber}: Checkpoint Baru`,
      locationName: checkpointData.locationName !== undefined ? checkpointData.locationName : '',
      coordinates: checkpointData.coordinates || { lat: -6.6350, lng: 106.8850 },
      qrCodeValue: checkpointData.qrCodeValue || `QR-POS0${nextNumber}-${Math.floor(100 + Math.random() * 900)}`,
      points: checkpointData.points !== undefined ? Number(checkpointData.points) : 150,
      clue: checkpointData.clue !== undefined ? checkpointData.clue : '',
      challengeType: checkpointData.challengeType || 'qr_only',
      challengeDescription: checkpointData.challengeDescription || 'Scan kode QR pos untuk konfirmasi kedatangan.',
      isMandatory: checkpointData.isMandatory ?? true,
      status: 'locked',
    };

    setCheckpoints((prev) => [...prev, newCp]);
    firestoreService.saveCheckpoint(newCp, selectedEventId);
    addLog(`Pos Ditambahkan: "${newCp.name}" dengan nilai ${newCp.points} Poin.`, 'system');
    return newCp;
  };

  // Update Checkpoint
  const updateCheckpoint = (checkpointId: string, updatedData: Partial<Checkpoint>) => {
    let updated: Checkpoint | undefined;
    setCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id === checkpointId) {
          updated = { 
            ...cp, 
            ...updatedData,
            points: updatedData.points !== undefined ? Number(updatedData.points) : cp.points 
          };
          return updated;
        }
        return cp;
      })
    );
    if (updated) {
      firestoreService.saveCheckpoint(updated, selectedEventId);
      addLog(`Pos Diperbarui: "${updated.name}" (${updated.points} Poin).`, 'system');
    }
    return updated;
  };

  // Delete Checkpoint
  const deleteCheckpoint = (checkpointId: string) => {
    const target = checkpoints.find((c) => c.id === checkpointId);
    setCheckpoints((prev) => {
      const filtered = prev.filter((c) => c.id !== checkpointId);
      return filtered.map((cp, idx) => ({
        ...cp,
        number: idx + 1,
      }));
    });
    firestoreService.deleteCheckpoint(checkpointId);
    addLog(`Pos Dihapus: "${target?.name || checkpointId}".`, 'system');
  };

  // Batch update all checkpoint points
  const batchUpdateCheckpointPoints = (points: number) => {
    const numericPoints = Number(points);
    setCheckpoints((prev) => prev.map((cp) => {
      const updated = { ...cp, points: numericPoints };
      firestoreService.saveCheckpoint(updated, selectedEventId);
      return updated;
    }));
    addLog(`Nilai Seluruh Pos Diperbarui: Menjadi ${numericPoints} Poin per pos.`, 'system');
  };

  // Refresh state directly from LocalStorage
  const refreshDataFromStorage = () => {
    try {
      const savedEvents = safeGetItem(STORAGE_KEYS.EVENTS);
      if (savedEvents) setEvents(JSON.parse(savedEvents));

      const savedCheckpoints = safeGetItem(STORAGE_KEYS.CHECKPOINTS);
      if (savedCheckpoints) setCheckpoints(JSON.parse(savedCheckpoints));

      const savedTeams = safeGetItem(STORAGE_KEYS.TEAMS);
      if (savedTeams) setTeams(JSON.parse(savedTeams));

      const savedSubmissions = safeGetItem(STORAGE_KEYS.SUBMISSIONS);
      if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
    } catch (e) {
      console.warn('Failed to refresh race data from storage:', e);
    }
  };

  // Cross-tab fallback
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.TEAMS ||
        e.key === STORAGE_KEYS.CHECKPOINTS ||
        e.key === STORAGE_KEYS.SUBMISSIONS ||
        e.key === STORAGE_KEYS.EVENTS
      ) {
        refreshDataFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reset to initial demo data
  const resetToDemoData = () => {
    setIsOfficialMode(false);
    safeSetItem('racepoint_official_mode', 'false');
    setEvents(DEMO_EVENTS);
    setCheckpoints(DEMO_CHECKPOINTS);
    setTeams(DEMO_TEAMS);
    setSubmissions(DEMO_SUBMISSIONS);
    setActiveTeamId('team-01');
    setRaceStatus('running');
    setRaceElapsedSeconds(6120);
    setRaceLogs(DEFAULT_LOGS);
    setBroadcasts(DEFAULT_BROADCASTS);
    setSosAlerts([]);
    firestoreService.seedInitialDataIfEmpty();
  };

  // Switch back to demo mode with preset data
  const switchToDemoMode = () => {
    resetToDemoData();
    addLog('[MODE DEMO DIAKTIFKAN] Sistem dikembalikan ke mode simulasi & pengujian dengan preset data contoh.', 'system');
  };

  // Activate Official Production Mode: clean slate, no dummy teams, real official event ready
  const activateOfficialMode = (options: {
    title: string;
    location: string;
    date?: string;
    timeRange?: string;
    description?: string;
    preserveCheckpoints?: boolean;
  }) => {
    setIsOfficialMode(true);
    safeSetItem('racepoint_official_mode', 'true');

    // 1. Purge all dummy & simulated teams completely
    setTeams([]);
    safeSetItem(STORAGE_KEYS.TEAMS, JSON.stringify([]));

    // 2. Clear submissions
    setSubmissions([]);
    safeSetItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));

    // 3. Clear active participant session
    setActiveTeamId(null);
    safeRemoveItem(STORAGE_KEYS.ACTIVE_TEAM);

    // 4. Create official real event
    const officialEventId = 'evt-official-' + Date.now();
    const newOfficialEvent: EventItem = {
      id: officialEventId,
      title: options.title.trim() || 'Official Orienteering Championship 2026',
      subtitle: 'Official Championship & Outdoor Challenge',
      eventType: 'orienteering',
      status: 'active',
      date: options.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      timeRange: options.timeRange || '08:00 - 12:00 WIB',
      location: options.location.trim() || 'Lokasi Lapangan Resmi',
      totalTeams: 0,
      totalCheckpoints: options.preserveCheckpoints ? checkpoints.length : 0,
      timeLimitMinutes: 180,
      organizerName: 'Panitia Pelaksana',
      description: options.description || 'Event resmi yang siap untuk pendaftaran tim peserta dan pelaksanaan perlombaan di lapangan.',
      bannerGradient: 'from-emerald-900 via-slate-900 to-teal-950',
      visibility: 'public',
      eventCode: 'RACE-' + Math.floor(1000 + Math.random() * 9000),
      rules: [
        'Setiap tim wajib menjaga sportivitas dan keselamatan di jalur perlombaan.',
        'Scan QR code pos kontrol hanya sah jika dilakukan di lokasi pos.',
        'Dilarang merusak tanda dan stiker barcode pos kontrol di lapangan.'
      ],
      showScoreToParticipants: true,
      showParticipantMap: true,
    };

    // Replace events with this official event as primary
    setEvents([newOfficialEvent]);
    setSelectedEventId(officialEventId);
    safeSetItem(STORAGE_KEYS.EVENTS, JSON.stringify([newOfficialEvent]));

    // Handle checkpoints
    if (!options.preserveCheckpoints) {
      setCheckpoints([]);
      safeSetItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify([]));
    } else {
      // Re-link existing checkpoints to the new event ID
      const updatedCps = checkpoints.map(cp => ({ ...cp, eventId: officialEventId }));
      setCheckpoints(updatedCps);
      safeSetItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(updatedCps));
    }

    // 5. Reset timer & race status to not_started (ready for race start)
    setRaceStatus('not_started');
    safeSetItem(STORAGE_KEYS.RACE_STATUS, 'not_started');
    setRaceElapsedSeconds(0);
    safeSetItem(STORAGE_KEYS.RACE_SECONDS, '0');

    // 6. Reset broadcasts and sos
    setBroadcasts([]);
    safeSetItem(STORAGE_KEYS.BROADCASTS, JSON.stringify([]));
    setSosAlerts([]);

    // 7. Official system log
    const initialLog: RaceLog = {
      id: 'log-official-' + Date.now(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      message: `[MODE RESMI DIAKTIFKAN] Event "${newOfficialEvent.title}" diinisialisasi. Seluruh data simulasi & tim dummy telah dibersihkan. Sistem siap untuk pendaftaran tim resmi dan pelaksanaan lomba di lapangan.`,
      type: 'system'
    };
    setRaceLogs([initialLog]);
    safeSetItem(STORAGE_KEYS.RACE_LOGS, JSON.stringify([initialLog]));

    // Save to Firestore
    try {
      firestoreService.saveEvent(newOfficialEvent);
    } catch (e) {
      console.warn('Firestore sync note:', e);
    }
  };

  const SIM_TEAM_PREFIXES = [
    'Garuda', 'Elang', 'Badak', 'Merbabu', 'Komodo', 'Petir', 'Singa', 'Rajawali',
    'Kancil', 'Srikandi', 'Harimau', 'Bromo', 'Rinjani', 'Semeru', 'Cenderawasih',
    'Anoa', 'Banteng', 'Macan', 'Pendaki', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega',
    'Bhayangkara', 'Panca Dharma', 'Khatulistiwa', 'Wira Bhuana', 'Tirta Mandiri', 'Cakra Buana',
    'Arjuna', 'Bima', 'Gatotkaca', 'Antareja', 'Nakula', 'Kresna', 'Pandawa', 'Laskar',
    'Samudera', 'Majapahit', 'Sriwijaya', 'Mataram', 'Padjadjaran', 'Singasari', 'Kutai'
  ];

  const SIM_TEAM_SUFFIXES = [
    'Nusantara', 'Rimba', 'Perkasa', 'Runners', 'Trackers', 'Speed', 'Samudra', 'Emas',
    'Lincah', 'Adventure', 'Sumatera', 'Rangers', 'Hikers', 'Expedition', 'Flying',
    'Sulawesi', 'Merdeka', 'Kumbang', 'Sejati', 'Orienteers', 'Navigators', 'Explorers',
    'Strikers', 'Vanguard', 'Trail', 'Khatulistiwa', 'Sprint', 'Juara', 'Bhayangkara', 'Sakti'
  ];

  const SIM_CATEGORIES = [
    'Korporat / Perusahaan',
    'Mahasiswa / Pelajar',
    'Komunitas / Umum',
    'Master / Veteran'
  ];

  const SIM_LEADERS = [
    'Budi Santoso', 'Siti Rahmawati', 'Agus Setiawan', 'Dewi Lestari', 'Rian Hidayat',
    'Eka Putri', 'Bayu Pratama', 'Nadia Safitri', 'Dimas Nugroho', 'Indah Permata',
    'Fajar Ramadhan', 'Mega Utami', 'Reza Firmansyah', 'Anisa Maharani', 'Yusuf Aditya',
    'Maya Anggraini', 'Hendra Wijaya', 'Rina Marlina', 'Aris Munandar', 'Wulan Sari'
  ];

  const SIM_MEMBERS_POOL = [
    'Aditya', 'Bambang', 'Chandra', 'Danang', 'Erwin', 'Farhan', 'Gilang', 'Hadi',
    'Ilham', 'Joko', 'Kurniawan', 'Lukman', 'Mahendra', 'Novian', 'Oki', 'Pandu',
    'Rizky', 'Surya', 'Taufik', 'Wahyu', 'Yoga', 'Zainal', 'Putri', 'Sari', 'Dian'
  ];

  const SIM_COLORS = [
    'bg-orange-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600',
    'bg-cyan-600', 'bg-amber-600', 'bg-indigo-600', 'bg-teal-600', 'bg-red-600'
  ];

  const batchGenerateTeams = (
    count: number,
    options?: {
      category?: string;
      withProgression?: boolean;
      eventId?: string;
    }
  ) => {
    const startTime = performance.now();
    const effectiveCount = Math.min(Math.max(1, count), 500);
    const targetEventId = options?.eventId || selectedEventId || 'evt-01';
    const withProgression = options?.withProgression ?? true;
    const specifiedCategory = options?.category && options.category !== 'all' ? options.category : null;

    const currentMaxBibNum = teams.reduce((max, t) => {
      const match = t.bibNumber.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 0);

    const newGeneratedTeams: Team[] = [];

    for (let i = 0; i < effectiveCount; i++) {
      const indexNum = currentMaxBibNum + i + 1;
      const prefix = SIM_TEAM_PREFIXES[(indexNum + i) % SIM_TEAM_PREFIXES.length];
      const suffix = SIM_TEAM_SUFFIXES[(indexNum * 3 + i) % SIM_TEAM_SUFFIXES.length];
      const teamName = `${prefix} ${suffix} ${indexNum > 50 ? `#${indexNum}` : ''}`.trim();
      const bibLetter = String.fromCharCode(65 + ((indexNum - 1) % 26));
      const bibNumber = `${bibLetter}-${String(indexNum).padStart(2, '0')}`;
      const pinCode = String(1000 + Math.floor(Math.random() * 9000));
      const category = specifiedCategory || SIM_CATEGORIES[i % SIM_CATEGORIES.length];
      const leaderName = SIM_LEADERS[i % SIM_LEADERS.length];
      const color = SIM_COLORS[i % SIM_COLORS.length];

      const membersCount = 3 + (i % 2);
      const members: { name: string; role: 'Ketua Tim' | 'Anggota'; phone?: string }[] = [
        { name: leaderName, role: 'Ketua Tim', phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}` },
      ];
      for (let m = 0; m < membersCount - 1; m++) {
        const memName = SIM_MEMBERS_POOL[(i * 4 + m) % SIM_MEMBERS_POOL.length];
        members.push({ name: `${memName} ${String.fromCharCode(65 + m)}`, role: 'Anggota' });
      }

      // Checkpoints progression simulation
      const totalCpCount = checkpoints.length > 0 ? checkpoints.length : 6;
      let completedCount = 0;
      let points = 0;
      let bonusPoints = 0;
      let penaltyPoints = 0;
      let status: 'racing' | 'finished' | 'dnf' | 'ready' = 'ready';
      let lastPosName = 'Garis Start';
      let durationMinutes = 0;
      const visitHistory: CheckpointVisit[] = [];

      if (withProgression) {
        const distRatio = Math.random();
        if (distRatio < 0.20) {
          completedCount = totalCpCount;
          status = 'finished';
          durationMinutes = Math.floor(55 + Math.random() * 45);
        } else if (distRatio < 0.85) {
          completedCount = Math.floor(1 + Math.random() * (totalCpCount - 1));
          status = 'racing';
          durationMinutes = Math.floor(15 + completedCount * 12 + Math.random() * 10);
        } else {
          completedCount = 0;
          status = 'ready';
          durationMinutes = 0;
        }

        for (let c = 0; c < completedCount; c++) {
          const cp = checkpoints[c % (checkpoints.length || 1)];
          const cpPoints = cp?.points || 100;
          points += cpPoints;
          lastPosName = cp?.name || `Pos ${c + 1}`;

          visitHistory.push({
            checkpointId: cp?.id || `cp-${c + 1}`,
            checkpointName: cp?.name || `Pos ${c + 1}`,
            timestamp: Date.now() - (completedCount - c) * 600000,
            timeString: `${String(8 + Math.floor(c / 2)).padStart(2, '0')}:${String((c * 23) % 60).padStart(2, '0')} WIB`,
            points: cpPoints,
            status: 'completed',
            method: 'QR Scan'
          });
        }

        if (completedCount > 0) {
          if (Math.random() > 0.4) {
            bonusPoints = [50, 100, 150][Math.floor(Math.random() * 3)];
          }
          if (Math.random() > 0.85) {
            penaltyPoints = [20, 50][Math.floor(Math.random() * 2)];
          }
        }
      }

      const totalScore = Math.max(0, points + bonusPoints - penaltyPoints);
      const teamId = `sim-team-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

      const newSimTeam: Team = {
        id: teamId,
        eventId: targetEventId,
        name: teamName,
        category,
        color,
        bibNumber,
        members,
        checkpointsCompleted: completedCount,
        totalCheckpoints: totalCpCount,
        currentCheckpointId: checkpoints[completedCount % (checkpoints.length || 1)]?.id || 'cp-01',
        points,
        bonusPoints,
        penaltyPoints,
        totalScore,
        startTime: '08:30 WIB',
        durationMinutes,
        status,
        lastPosName,
        lastUpdated: withProgression && completedCount > 0 ? `${durationMinutes} mnt lalu` : 'Baru saja dibuat (Simulasi)',
        visitHistory,
        ...({ pinCode, isSimulated: true } as any)
      };

      newGeneratedTeams.push(newSimTeam);
    }

    setTeams((prev) => [...newGeneratedTeams, ...prev]);

    const endTime = performance.now();
    const executionTimeMs = Math.round((endTime - startTime) * 10) / 10;

    addLog(`Simulasi Peserta: Berhasil men-generate ${effectiveCount} tim dummy dalam ${executionTimeMs} ms.`, 'registration');

    return {
      generatedCount: effectiveCount,
      executionTimeMs,
      totalTeams: teams.length + effectiveCount
    };
  };

  const clearSimulatedTeams = () => {
    let removedCount = 0;
    setTeams((prev) => {
      const filtered = prev.filter((t) => {
        const isSim = t.id.startsWith('sim-team-') || (t as any).isSimulated === true;
        if (isSim) removedCount++;
        return !isSim;
      });
      return filtered;
    });

    addLog(`Simulasi Peserta: ${removedCount} tim dummy simulasi berhasil dibersihkan.`, 'system');

    return {
      removedCount,
      remainingTeams: teams.length - removedCount
    };
  };

  const simulateBulkRaceActivity = async (batchSize: number = 8) => {
    const startTime = performance.now();
    if (teams.length === 0 || checkpoints.length === 0) {
      return { processedCount: 0, executionTimeMs: 0 };
    }

    const eligibleTeams = [...teams].sort(() => 0.5 - Math.random()).slice(0, batchSize);
    let processed = 0;

    for (const team of eligibleTeams) {
      const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)];
      await checkInCheckpoint(team.id, randomCp.id, true);
      processed++;
    }

    const endTime = performance.now();
    const executionTimeMs = Math.round((endTime - startTime) * 10) / 10;

    addLog(`Stress Test: Simulasi aktivitas serentak ${processed} tim selesai dalam ${executionTimeMs} ms.`, 'system');

    return {
      processedCount: processed,
      executionTimeMs
    };
  };

  return (
    <RaceContext.Provider
      value={{
        syncStatus,
        firebaseUser,
        signInWithGoogle,
        signOutFirebase,
        currentUserRole,
        adminPassword,
        judgePassword,
        loginAsRole,
        logoutRole,
        updateRolePasswords,
        hasAccess,
        events,
        checkpoints,
        teams,
        submissions,
        activeTeamId,
        selectedEventId,
        setSelectedEventId,
        raceStatus,
        raceElapsedSeconds,
        raceLogs,
        broadcasts,
        sosAlerts,
        startRace,
        pauseRace,
        endRace,
        resetRaceTimer,
        sendBroadcast,
        deleteBroadcast,
        triggerSos,
        resolveSos,
        registerTeam,
        updateTeam,
        updateTeamCoordinates,
        deleteTeam,
        loginParticipant,
        logoutParticipant,
        setActiveTeamId,
        checkInCheckpoint,
        checkInByQrCode,
        getTeamRemainingCooldown,
        clearTeamCooldown,
        submitChallengeProof,
        reviewSubmission,
        submitJudgeManualScore,
        createEvent,
        updateEvent,
        deleteEvent,
        createCheckpoint,
        updateCheckpoint,
        deleteCheckpoint,
        batchUpdateCheckpointPoints,
        resetToDemoData,
        refreshDataFromStorage,
        isOfficialMode,
        activateOfficialMode,
        switchToDemoMode,
        batchGenerateTeams,
        clearSimulatedTeams,
        simulateBulkRaceActivity,
      }}
    >
      {children}
    </RaceContext.Provider>
  );
};

export const useRace = () => {
  const context = useContext(RaceContext);
  if (!context) {
    throw new Error('useRace must be used within a RaceProvider');
  }
  return context;
};
