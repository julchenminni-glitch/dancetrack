import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken, storage } from './api';

const Ctx = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceId, setWorkspaceIdState] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rewardLevels, setRewardLevels] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // On mount: check token
  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) {
          const { data } = await api.get('/auth/me');
          setUser(data);
          const saved = await storage.get('dt_workspace');
          if (saved) setWorkspaceIdState(saved);
        }
      } catch (e) {
        await setToken(null);
      }
      setAuthReady(true);
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    await setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await setToken(null);
    await storage.del('dt_workspace');
    setUser(null);
    setWorkspaceIdState(null);
    setWorkspaces([]);
    setGroups([]);
    setStudents([]);
  };

  const setWorkspaceId = async (id) => {
    if (id) await storage.set('dt_workspace', id);
    else await storage.del('dt_workspace');
    setWorkspaceIdState(id);
  };

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    const { data } = await api.get('/workspaces');
    setWorkspaces(data);
    return data;
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [g, s, e, a, l, ts, rl] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/groups`),
        api.get(`/workspaces/${workspaceId}/students`),
        api.get(`/workspaces/${workspaceId}/events`),
        api.get(`/workspaces/${workspaceId}/attendance`),
        api.get(`/workspaces/${workspaceId}/lessons`),
        api.get(`/workspaces/${workspaceId}/trainer-sessions`),
        api.get(`/workspaces/${workspaceId}/reward-levels`),
      ]);
      setGroups(g.data);
      setStudents(s.data);
      setEvents(e.data);
      setAttendance(a.data);
      setLessons(l.data);
      setSessions(ts.data);
      setRewardLevels(rl.data);
    } catch (err) {
      console.log('loadAll error', err?.message);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (user) loadWorkspaces();
  }, [user, loadWorkspaces]);

  useEffect(() => {
    if (workspaceId) loadAll();
  }, [workspaceId, loadAll]);

  // ============ Actions ============
  const createWorkspace = async (name, trainerName) => {
    const { data } = await api.post('/workspaces', { name, trainerName });
    await loadWorkspaces();
    await setWorkspaceId(data.id);
    showToast('Workspace erstellt');
    return data;
  };

  const deleteWorkspace = async (id) => {
    await api.delete(`/workspaces/${id}`);
    if (workspaceId === id) await setWorkspaceId(null);
    await loadWorkspaces();
    showToast('Workspace gelöscht');
  };

  const updateWorkspace = async (id, body) => {
    await api.patch(`/workspaces/${id}`, body);
    await loadWorkspaces();
    showToast('Aktualisiert');
  };

  const addGroup = async (body) => {
    await api.post(`/workspaces/${workspaceId}/groups`, body);
    await loadAll();
    showToast('Gruppe erstellt');
  };
  const editGroup = async (id, body) => {
    await api.patch(`/workspaces/${workspaceId}/groups/${id}`, body);
    await loadAll();
    showToast('Gruppe aktualisiert');
  };
  const deleteGroup = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/groups/${id}`);
    await loadAll();
    showToast('Gruppe gelöscht');
  };

  const addStudent = async (body) => {
    await api.post(`/workspaces/${workspaceId}/students`, body);
    await loadAll();
    showToast('Schüler hinzugefügt');
  };
  const editStudent = async (id, body) => {
    await api.patch(`/workspaces/${workspaceId}/students/${id}`, body);
    await loadAll();
    showToast('Schüler aktualisiert');
  };
  const deleteStudent = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/students/${id}`);
    await loadAll();
    showToast('Schüler gelöscht');
  };

  const saveAttendance = async (body) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/attendance`, body);
    await loadAll();
    if (data.levelUps && data.levelUps.length > 0) {
      data.levelUps.forEach((lu) => {
        showToast(`🏆 ${lu.studentName} hat ${lu.level.emoji} ${lu.level.name} erreicht!`);
      });
    } else {
      showToast('Anwesenheit gespeichert');
    }
  };
  const deleteEvent = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/events/${id}`);
    await loadAll();
    showToast('Termin gelöscht');
  };

  const addLesson = async (body) => {
    await api.post(`/workspaces/${workspaceId}/lessons`, body);
    await loadAll();
    showToast('Stunde geplant');
  };
  const editLesson = async (id, body) => {
    await api.patch(`/workspaces/${workspaceId}/lessons/${id}`, body);
    await loadAll();
  };
  const deleteLesson = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/lessons/${id}`);
    await loadAll();
    showToast('Stunde gelöscht');
  };

  const addSession = async (body) => {
    await api.post(`/workspaces/${workspaceId}/trainer-sessions`, body);
    await loadAll();
    showToast('Stunden erfasst');
  };
  const editSession = async (id, body) => {
    await api.patch(`/workspaces/${workspaceId}/trainer-sessions/${id}`, body);
    await loadAll();
  };
  const deleteSession = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/trainer-sessions/${id}`);
    await loadAll();
    showToast('Eintrag gelöscht');
  };

  const addLevel = async (body) => {
    await api.post(`/workspaces/${workspaceId}/reward-levels`, body);
    await loadAll();
    showToast('Level hinzugefügt');
  };
  const editLevel = async (id, body) => {
    await api.patch(`/workspaces/${workspaceId}/reward-levels/${id}`, body);
    await loadAll();
    showToast('Level aktualisiert');
  };
  const deleteLevel = async (id) => {
    await api.delete(`/workspaces/${workspaceId}/reward-levels/${id}`);
    await loadAll();
    showToast('Level gelöscht');
  };

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId) || null;

  return (
    <Ctx.Provider
      value={{
        user, authReady, login, register, logout,
        workspaces, workspaceId, setWorkspaceId, currentWorkspace,
        createWorkspace, deleteWorkspace, updateWorkspace, loadWorkspaces,
        groups, students, events, attendance, lessons, sessions, rewardLevels,
        addGroup, editGroup, deleteGroup,
        addStudent, editStudent, deleteStudent,
        saveAttendance, deleteEvent,
        addLesson, editLesson, deleteLesson,
        addSession, editSession, deleteSession,
        addLevel, editLevel, deleteLevel,
        loadAll, toast, showToast,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useApp = () => useContext(Ctx);
