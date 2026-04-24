import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, TouchableOpacity, Platform } from 'react-native';
import { theme, fonts } from './theme';
import { _registerConfirm } from './confirm';

// On web: browser window.confirm (always on top, bypasses RN-Web Modal stacking)
// On native: custom in-app modal
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const confirmFn = useCallback((title, message, onConfirm, confirmLabel = 'Löschen') => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-undef
      const ok = typeof window !== 'undefined' && window.confirm(`${title}${message ? '\n\n' + message : ''}`);
      if (ok && onConfirm) {
        Promise.resolve().then(() => onConfirm()).catch((e) => console.log('confirm err', e));
      }
      return;
    }
    setState({ title, message, onConfirm, confirmLabel });
  }, []);

  useEffect(() => {
    _registerConfirm(confirmFn);
    return () => _registerConfirm(null);
  }, [confirmFn]);

  const close = () => setState(null);
  const ok = async () => {
    const fn = state?.onConfirm;
    setState(null);
    if (fn) { try { await fn(); } catch (e) { console.log('confirm err', e); } }
  };

  if (Platform.OS === 'web') return <>{children}</>;

  return (
    <>
      {children}
      <Modal visible={!!state} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={s.bg} onPress={close}>
          <Pressable style={s.inner} onPress={(e) => e.stopPropagation?.()}>
            <Text style={[s.title, { fontFamily: fonts.heading }]}>{state?.title}</Text>
            {state?.message ? <Text style={[s.msg, { fontFamily: fonts.body }]}>{state.message}</Text> : null}
            <View style={s.row}>
              <TouchableOpacity style={[s.btn, s.cancel]} onPress={close} testID="confirm-cancel">
                <Text style={[s.btnTxt, { fontFamily: fonts.bodyBold, color: theme.text }]}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.ok]} onPress={ok} testID="confirm-ok">
                <Text style={[s.btnTxt, { fontFamily: fonts.bodyBold, color: '#fff' }]}>{state?.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(107,78,92,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  inner: { backgroundColor: theme.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  title: { fontSize: 20, color: theme.text, marginBottom: 8, textAlign: 'center' },
  msg: { fontSize: 14, color: theme.mutedText, marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancel: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border },
  ok: { backgroundColor: '#d4719d' },
  btnTxt: { fontSize: 14 },
});
