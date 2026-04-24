import { Alert, Platform } from 'react-native';

// Low-level fallback. Used on native and as safety fallback on web if no provider is mounted.
export const confirm = (title, message, onConfirm, confirmLabel = 'Löschen') => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    const ok = typeof window !== 'undefined' && window.confirm(`${title}${message ? `\n\n${message}` : ''}`);
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, message || '', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};
