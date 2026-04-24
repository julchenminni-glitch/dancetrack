export const theme = {
  bg: '#fef5f5',
  surface: '#ffffff',
  text: '#6b4e5c',
  mutedText: '#9e7e8d',
  primary: '#d4719d',
  secondary: '#c9a8d4',
  accentGreen: '#5b8a72',
  accentPurple: '#7b6ba5',
  accentGold: '#c4883a',
  border: '#f0e1e5',
  danger: '#d4719d',
};

export const fonts = {
  heading: 'DMSerifDisplay_400Regular',
  body: 'DMSans_400Regular',
  bodyBold: 'DMSans_700Bold',
};

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const EVENT_TYPES = [
  { key: 'Training', label: 'Training', emoji: '💃' },
  { key: 'Performance', label: 'Auftritt', emoji: '🎭' },
  { key: 'Event', label: 'Event', emoji: '🎉' },
];
export const GROUP_COLORS = ['#d4719d', '#c9a8d4', '#5b8a72', '#7b6ba5', '#c4883a', '#e48fae', '#8bb8a0', '#a491c9'];

export const DEFAULT_LEVELS = [
  { name: 'Samen', emoji: '🌱', threshold: 0 },
  { name: 'Spross', emoji: '🌿', threshold: 5 },
  { name: 'Mini Blatt', emoji: '🍃', threshold: 10 },
  { name: 'Kleeblatt', emoji: '🍀', threshold: 15 },
  { name: 'Knospe', emoji: '🌱', threshold: 20 },
  { name: 'Blüte', emoji: '🌼', threshold: 25 },
  { name: 'Blume', emoji: '🌻', threshold: 30 },
  { name: 'Biene', emoji: '🐝', threshold: 35 },
  { name: 'Marienkäfer', emoji: '🐞', threshold: 40 },
  { name: 'Raupe', emoji: '🐛', threshold: 45 },
  { name: 'Schmetterling', emoji: '🦋', threshold: 50 },
];

export const getCurrentLevel = (count, levels) => {
  const sorted = [...levels].sort((a, b) => b.threshold - a.threshold);
  return sorted.find((l) => l.threshold <= count) || null;
};

export const getNextLevel = (count, levels) => {
  const sorted = [...levels].sort((a, b) => a.threshold - b.threshold);
  return sorted.find((l) => l.threshold > count) || null;
};

export const calcAge = (birthday) => {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};
