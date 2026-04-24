import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({ baseURL: `${BASE}/api` });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('dt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
