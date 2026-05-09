import AsyncStorage from '@react-native-async-storage/async-storage';
import { localApi, initLocalDb, exportDb, importDb, resetDb } from './localApi';

// Local-only mode: every request is served from AsyncStorage.
// The backend is NOT contacted; the app works fully offline.
export const api = localApi;

export const setToken = async (t) => {
  if (t) await AsyncStorage.setItem('dt_token', t);
  else await AsyncStorage.removeItem('dt_token');
};
export const getToken = () => AsyncStorage.getItem('dt_token');

export const storage = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
  del: (k) => AsyncStorage.removeItem(k),
};

// Re-export local-data utilities used by Settings (Backup/Restore/Reset)
export { initLocalDb, exportDb, importDb, resetDb };
