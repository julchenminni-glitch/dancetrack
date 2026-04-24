import { Alert, Platform } from 'react-native';

// Cross-platform confirm. On web, Alert.alert button callbacks don't fire reliably -
// use window.confirm instead. On native, use Alert.alert.
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
