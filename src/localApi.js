/* eslint-disable no-undef */
// LocalApi: axios-compatible interface that persists everything in AsyncStorage.
// Replaces the network backend so the app works fully offline.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { db as firestoreDb, auth } from '../firebaseConfig.js';


const STORAGE_KEY = 'dt_local_db_v1';
const FIRESTORE_COLLECTION = 'dancetrackData';
const getFirestoreDocId = () => auth.currentUser?.uid || 'guest';
const USER_ID = 'local-user';

const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const nowIso = () => new Date().toISOString();

const DEFAULT_REWARD_LEVELS = [
  { name: 'Samen', emoji: '🌱', threshold: 0, phase: 'Knospenphase' },
  { name: 'Spross', emoji: '🌿', threshold: 5, phase: 'Knospenphase' },
  { name: 'Mini Blatt', emoji: '🍃', threshold: 10, phase: 'Knospenphase' },
  { name: 'Kleeblatt', emoji: '🍀', threshold: 15, phase: 'Blütenphase' },
  { name: 'Knospe', emoji: '🌱', threshold: 20, phase: 'Blütenphase' },
  { name: 'Blüte', emoji: '🌼', threshold: 25, phase: 'Blütenphase' },
  { name: 'Blume', emoji: '🌻', threshold: 30, phase: 'Blütenphase' },
  { name: 'Biene', emoji: '🐝', threshold: 35, phase: 'Glückstierchenphase' },
  { name: 'Marienkäfer', emoji: '🐞', threshold: 40, phase: 'Glückstierchenphase' },
  { name: 'Raupe', emoji: '🐛', threshold: 45, phase: 'Glückstierchenphase' },
  { name: 'Schmetterling', emoji: '🦋', threshold: 50, phase: 'Glückstierchenphase' },
];

let cache = null;
let loadPromise = null;

const emptyDb = () => ({
  user: {
    id: auth.currentUser?.uid || USER_ID,
    email: auth.currentUser?.email || '',
    name: auth.currentUser?.displayName || 'Trainer',
  },
  workspaces: [],
  groups: [],
  students: [],
  events: [],
  attendance: [],
  lessons: [],
  trainerSessions: [],
  rewardLevels: [],
});

const loadDb = async () => {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const ref = doc(firestoreDb, FIRESTORE_COLLECTION, getFirestoreDocId());
      const snap = await getDoc(ref);

      if (snap.exists()) {
        cache = { ...emptyDb(), ...snap.data() };
      } else {
        cache = emptyDb();
        await setDoc(ref, cache);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Firestore load error", e?.message);

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        cache = raw ? JSON.parse(raw) : emptyDb();
      } catch {
        cache = emptyDb();
      }
    }

    loadPromise = null;
    return cache;
  })();

  return loadPromise;
};
const saveDb = async () => {
  if (!cache) return;

  try {
    const ref = doc(firestoreDb, FIRESTORE_COLLECTION, getFirestoreDocId());
    await setDoc(ref, cache);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Firestore save error", e?.message);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {}
  }
};

export const resetDb = async () => {
  cache = emptyDb();
  await saveDb();
};

export const exportDb = async () => {
  const db = await loadDb();
  return JSON.stringify(db, null, 2);
};

export const importDb = async (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') throw new Error('Ungültiges Format');
    cache = { ...emptyDb(), ...parsed };
    await saveDb();
    return true;
  } catch (e) {
    throw new Error('Backup-Datei nicht lesbar');
  }
};

const seedRewardLevels = (db, wsId) => {
  DEFAULT_REWARD_LEVELS.forEach((lvl) => {
    db.rewardLevels.push({
      id: uuid(),
      workspaceId: wsId,
      isDefault: true,
      ...lvl,
    });
  });
};

// ===== Route Handlers =====

const handlers = {
  // ===== Auth =====
  'POST /auth/register': async (db, body) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      body.email,
      body.password
    );

    db.user = {
      id: cred.user.uid,
      email: cred.user.email,
      name: body.name || 'Trainer',
    };

    await saveDb();

    return {
      access_token: await cred.user.getIdToken(),
      user: db.user,
    };
  },

  'POST /auth/login': async (db, body) => {
    const cred = await signInWithEmailAndPassword(
      auth,
      body.email,
      body.password
    );

    db.user = {
      id: cred.user.uid,
      email: cred.user.email,
      name: db.user?.name || 'Trainer',
    };

    await saveDb();

    return {
      access_token: await cred.user.getIdToken(),
      user: db.user,
    };
  },

  'GET /auth/me': async () => {
    if (!auth.currentUser) return null;

    return {
      id: auth.currentUser.uid,
      email: auth.currentUser.email,
      name: auth.currentUser.displayName || 'Trainer',
    };
  },

  'POST /auth/reset-password': async () => ({ ok: true }),

  // ===== Workspaces =====
  'GET /workspaces': async (db) => db.workspaces,
  'POST /workspaces': async (db, body) => {
    const id = uuid();
    const ws = {
      id,
      name: body.name,
      trainerName: body.trainerName || '',
      ownerId: auth.currentUser?.uid || USER_ID,
      members: [auth.currentUser?.uid || USER_ID],
      createdAt: nowIso(),
      phaseNames: { knospe: 'Knospenphase', bluete: 'Blütenphase', glueck: 'Glückstierchenphase' },
    };
    db.workspaces.push(ws);
    seedRewardLevels(db, id);
    await saveDb();
    return ws;
  },
  'PATCH /workspaces/:wsId': async (db, body, p) => {
    const ws = db.workspaces.find((w) => w.id === p.wsId);
    if (!ws) return { error: 404 };
    // Phase auto-rename
    if (body.phaseNames) {
      const oldPhases = ws.phaseNames || {};
      const newPhases = body.phaseNames;
      ['knospe', 'bluete', 'glueck'].forEach((k) => {
        const oldV = oldPhases[k];
        const newV = newPhases[k];
        if (oldV && newV && oldV !== newV) {
          db.rewardLevels.forEach((lvl) => {
            if (lvl.workspaceId === ws.id && lvl.phase === oldV) lvl.phase = newV;
          });
        }
      });
    }
    Object.assign(ws, body);
    await saveDb();
    return ws;
  },
  'DELETE /workspaces/:wsId': async (db, _b, p) => {
    db.workspaces = db.workspaces.filter((w) => w.id !== p.wsId);
    db.groups = db.groups.filter((g) => g.workspaceId !== p.wsId);
    db.students = db.students.filter((s) => s.workspaceId !== p.wsId);
    db.events = db.events.filter((e) => e.workspaceId !== p.wsId);
    db.attendance = db.attendance.filter((a) => a.workspaceId !== p.wsId);
    db.lessons = db.lessons.filter((l) => l.workspaceId !== p.wsId);
    db.trainerSessions = db.trainerSessions.filter((s) => s.workspaceId !== p.wsId);
    db.rewardLevels = db.rewardLevels.filter((l) => l.workspaceId !== p.wsId);
    await saveDb();
    return { ok: true };
  },

  // ===== Groups =====
  'GET /workspaces/:wsId/groups': async (db, _b, p) =>
    db.groups.filter((g) => g.workspaceId === p.wsId),
  'POST /workspaces/:wsId/groups': async (db, body, p) => {
    const doc = { id: uuid(), workspaceId: p.wsId, ...body };
    db.groups.push(doc);
    await saveDb();
    return doc;
  },
  'PATCH /workspaces/:wsId/groups/:gid': async (db, body, p) => {
    const g = db.groups.find((x) => x.id === p.gid && x.workspaceId === p.wsId);
    if (!g) return { error: 404 };
    Object.assign(g, body);
    await saveDb();
    return g;
  },
  'DELETE /workspaces/:wsId/groups/:gid': async (db, _b, p) => {
    db.groups = db.groups.filter((g) => g.id !== p.gid);
    const studentIds = db.students.filter((s) => s.groupId === p.gid).map((s) => s.id);
    db.students = db.students.filter((s) => s.groupId !== p.gid);
    const eventIds = db.events.filter((e) => e.groupId === p.gid).map((e) => e.id);
    db.events = db.events.filter((e) => e.groupId !== p.gid);
    db.attendance = db.attendance.filter((a) => !eventIds.includes(a.eventId) && !studentIds.includes(a.studentId));
    db.lessons = db.lessons.filter((l) => l.groupId !== p.gid);
    db.trainerSessions = db.trainerSessions.filter((s) => s.groupId !== p.gid);
    await saveDb();
    return { ok: true };
  },

  // ===== Students =====
  'GET /workspaces/:wsId/students': async (db, _b, p) =>
    db.students.filter((s) => s.workspaceId === p.wsId),
  'POST /workspaces/:wsId/students': async (db, body, p) => {
    const doc = { id: uuid(), workspaceId: p.wsId, level: 0, createdAt: nowIso(), ...body };
    db.students.push(doc);
    await saveDb();
    return doc;
  },
  'PATCH /workspaces/:wsId/students/:sid': async (db, body, p) => {
    const st = db.students.find((s) => s.id === p.sid && s.workspaceId === p.wsId);
    if (!st) return { error: 404 };
    Object.assign(st, body);
    await saveDb();
    return st;
  },
  'DELETE /workspaces/:wsId/students/:sid': async (db, _b, p) => {
    db.students = db.students.filter((s) => s.id !== p.sid);
    db.attendance = db.attendance.filter((a) => a.studentId !== p.sid);
    await saveDb();
    return { ok: true };
  },

  // ===== Events / Attendance =====
  'GET /workspaces/:wsId/events': async (db, _b, p) =>
    db.events.filter((e) => e.workspaceId === p.wsId),
  'GET /workspaces/:wsId/attendance': async (db, _b, p) =>
    db.attendance.filter((a) => a.workspaceId === p.wsId),
  'POST /workspaces/:wsId/attendance': async (db, body, p) => {
    const eventId = uuid();
    const sessionId = uuid();
    const eventDoc = {
      id: eventId,
      workspaceId: p.wsId,
      groupId: body.groupId,
      type: body.type,
      date: body.date,
      trainerSessionId: sessionId,
    };
    db.events.push(eventDoc);
    Object.entries(body.attendance || {}).forEach(([studentId, status]) => {
      db.attendance.push({
        id: uuid(),
        workspaceId: p.wsId,
        eventId,
        studentId,
        status,
        date: body.date,
      });
    });
    const levelUps = [];
    if (body.type === 'Training') {
      const levels = db.rewardLevels
        .filter((l) => l.workspaceId === p.wsId)
        .sort((a, b) => b.threshold - a.threshold);
      Object.entries(body.attendance || {}).forEach(([studentId, status]) => {
        if (status !== 'Present') return;
        const st = db.students.find((s) => s.id === studentId);
        if (!st) return;
        const oldCount = st.level || 0;
        const newCount = oldCount + 1;
        st.level = newCount;
        const oldLvl = levels.find((l) => l.threshold <= oldCount);
        const newLvl = levels.find((l) => l.threshold <= newCount);
        if (newLvl && (!oldLvl || newLvl.id !== oldLvl.id)) {
          levelUps.push({
            studentId,
            studentName: st.name,
            level: { name: newLvl.name, emoji: newLvl.emoji },
          });
        }
      });
    }
    db.trainerSessions.push({
      id: sessionId,
      workspaceId: p.wsId,
      groupId: body.groupId,
      date: body.date,
      duration: body.duration ?? 1.0,
      notes: '',
      isPaid: false,
      eventId,
    });
    await saveDb();
    return { event: eventDoc, levelUps };
  },
  'DELETE /workspaces/:wsId/events/:eid': async (db, _b, p) => {
    db.events = db.events.filter((e) => e.id !== p.eid);
    db.attendance = db.attendance.filter((a) => a.eventId !== p.eid);
    db.trainerSessions = db.trainerSessions.filter((s) => s.eventId !== p.eid);
    await saveDb();
    return { ok: true };
  },

  // ===== Lessons =====
  'GET /workspaces/:wsId/lessons': async (db, _b, p) =>
    db.lessons.filter((l) => l.workspaceId === p.wsId),
  'POST /workspaces/:wsId/lessons': async (db, body, p) => {
    const doc = { id: uuid(), workspaceId: p.wsId, ...body };
    db.lessons.push(doc);
    await saveDb();
    return doc;
  },
  'PATCH /workspaces/:wsId/lessons/:lid': async (db, body, p) => {
    const l = db.lessons.find((x) => x.id === p.lid && x.workspaceId === p.wsId);
    if (!l) return { error: 404 };
    Object.assign(l, body);
    await saveDb();
    return l;
  },
  'DELETE /workspaces/:wsId/lessons/:lid': async (db, _b, p) => {
    db.lessons = db.lessons.filter((l) => l.id !== p.lid);
    await saveDb();
    return { ok: true };
  },

  // ===== Trainer Sessions =====
  'GET /workspaces/:wsId/trainer-sessions': async (db, _b, p) =>
    db.trainerSessions.filter((s) => s.workspaceId === p.wsId),
  'POST /workspaces/:wsId/trainer-sessions': async (db, body, p) => {
    const doc = { id: uuid(), workspaceId: p.wsId, ...body };
    db.trainerSessions.push(doc);
    await saveDb();
    return doc;
  },
  'PATCH /workspaces/:wsId/trainer-sessions/:sid': async (db, body, p) => {
    const s = db.trainerSessions.find((x) => x.id === p.sid && x.workspaceId === p.wsId);
    if (!s) return { error: 404 };
    Object.assign(s, body);
    await saveDb();
    return s;
  },
  'DELETE /workspaces/:wsId/trainer-sessions/:sid': async (db, _b, p) => {
    db.trainerSessions = db.trainerSessions.filter((s) => s.id !== p.sid);
    await saveDb();
    return { ok: true };
  },

  // ===== Reward Levels =====
  'GET /workspaces/:wsId/reward-levels': async (db, _b, p) =>
    db.rewardLevels.filter((l) => l.workspaceId === p.wsId),
  'POST /workspaces/:wsId/reward-levels': async (db, body, p) => {
    const doc = { id: uuid(), workspaceId: p.wsId, isDefault: false, ...body };
    db.rewardLevels.push(doc);
    await saveDb();
    return doc;
  },
  'PATCH /workspaces/:wsId/reward-levels/:lid': async (db, body, p) => {
    const l = db.rewardLevels.find((x) => x.id === p.lid && x.workspaceId === p.wsId);
    if (!l) return { error: 404 };
    Object.assign(l, body);
    await saveDb();
    return l;
  },
  'DELETE /workspaces/:wsId/reward-levels/:lid': async (db, _b, p) => {
    const l = db.rewardLevels.find((x) => x.id === p.lid && x.workspaceId === p.wsId);
    if (l && l.isDefault) return { error: 400 };
    db.rewardLevels = db.rewardLevels.filter((x) => x.id !== p.lid);
    await saveDb();
    return { ok: true };
  },
};

// ===== Route Matching =====
const matchRoute = (method, url) => {
  // strip query string
  const path = url.split('?')[0];
  for (const key of Object.keys(handlers)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      const xp = pathParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = xp;
      } else if (pp !== xp) {
        match = false;
        break;
      }
    }
    if (match) return { handler: handlers[key], params };
  }
  return null;
};

const dispatch = async (method, url, body) => {
  const db = await loadDb();
  const route = matchRoute(method, url);
  if (!route) {
    const err = new Error(`No local route for ${method} ${url}`);
    err.response = { status: 404, data: { detail: 'Not found' } };
    throw err;
  }
  const result = await route.handler(db, body || {}, route.params);
  if (result && result.error) {
    const err = new Error(`Status ${result.error}`);
    err.response = { status: result.error, data: { detail: 'Error' } };
    throw err;
  }
  return { data: result };
};

// ===== Axios-compatible API =====
export const localApi = {
  get: (url) => dispatch('GET', url),
  post: (url, body) => dispatch('POST', url, body),
  patch: (url, body) => dispatch('PATCH', url, body),
  delete: (url) => dispatch('DELETE', url),
};

// init helper to ensure cache is preloaded
export const initLocalDb = async () => loadDb();
