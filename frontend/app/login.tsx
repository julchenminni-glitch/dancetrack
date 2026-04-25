import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../src/store';
import { api, setToken } from '../src/api';
import { theme, fonts } from '../src/theme';
import { Btn, Input, Card } from '../src/ui';

export default function Login() {
  const { login, register } = useApp();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@dancetrack.app');
  const [password, setPassword] = useState('demo12345');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password fields
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwd2, setResetPwd2] = useState('');
  const [showReset, setShowReset] = useState(false);

  const submit = async () => {
    setErr(''); setInfo(''); setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else if (mode === 'register') await register(email.trim(), password, name || email.split('@')[0]);
      else if (mode === 'forgot') {
        if (resetPwd.length < 6) { setErr('Mindestens 6 Zeichen'); setLoading(false); return; }
        if (resetPwd !== resetPwd2) { setErr('Passwörter stimmen nicht überein'); setLoading(false); return; }
        await api.post('/auth/reset-password', { email: email.trim(), new_password: resetPwd });
        setInfo('Passwort zurückgesetzt – jetzt anmelden');
        setPassword(resetPwd);
        setMode('login');
        setResetPwd(''); setResetPwd2('');
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Fehler');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.c}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <Text style={{ fontSize: 60 }}>💃</Text>
            <Text style={[s.title, { fontFamily: fonts.heading }]}>DanceTrack</Text>
            <Text style={[s.sub, { fontFamily: fonts.body }]}>Deine Tanzgruppen, perfekt organisiert</Text>
          </View>
          <Card style={{ padding: 20 }}>
            {mode !== 'forgot' ? (
              <View style={s.tabs}>
                <TouchableOpacity testID="tab-login" onPress={() => { setMode('login'); setErr(''); setInfo(''); }} style={[s.tab, mode === 'login' && s.tabActive]}>
                  <Text style={[s.tabText, { fontFamily: fonts.bodyBold }, mode === 'login' && { color: theme.primary }]}>Anmelden</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="tab-register" onPress={() => { setMode('register'); setErr(''); setInfo(''); }} style={[s.tab, mode === 'register' && s.tabActive]}>
                  <Text style={[s.tabText, { fontFamily: fonts.bodyBold }, mode === 'register' && { color: theme.primary }]}>Registrieren</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 14 }}>
                <Text style={[{ fontSize: 18, color: theme.text, fontFamily: fonts.heading }]}>Passwort zurücksetzen</Text>
                <Text style={{ fontSize: 12, color: theme.mutedText, fontFamily: fonts.body, marginTop: 4 }}>Gib deine E-Mail ein und ein neues Passwort.</Text>
              </View>
            )}

            {mode === 'register' ? (
              <Input testID="name-input" value={name} onChangeText={setName} placeholder="Dein Name" />
            ) : null}
            {mode === 'register' ? <View style={{ height: 10 }} /> : null}

            <Input testID="email-input" value={email} onChangeText={setEmail} placeholder="E-Mail" keyboardType="email-address" autoCapitalize="none" />
            <View style={{ height: 10 }} />

            {mode !== 'forgot' ? (
              <View style={s.pwdWrap}>
                <View style={{ flex: 1 }}>
                  <Input testID="password-input" value={password} onChangeText={setPassword} placeholder="Passwort" secureTextEntry={!showPwd} />
                </View>
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.pwdToggle} testID="toggle-pwd">
                  <Text style={{ fontSize: 18 }}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.pwdWrap}>
                  <View style={{ flex: 1 }}>
                    <Input testID="reset-pwd-input" value={resetPwd} onChangeText={setResetPwd} placeholder="Neues Passwort" secureTextEntry={!showReset} />
                  </View>
                  <TouchableOpacity onPress={() => setShowReset(!showReset)} style={s.pwdToggle} testID="toggle-reset">
                    <Text style={{ fontSize: 18 }}>{showReset ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 10 }} />
                <Input testID="reset-pwd-input2" value={resetPwd2} onChangeText={setResetPwd2} placeholder="Neues Passwort wiederholen" secureTextEntry={!showReset} />
              </>
            )}

            {err ? <Text style={s.err}>{err}</Text> : null}
            {info ? <Text style={s.info}>{info}</Text> : null}

            <View style={{ height: 16 }} />
            <Btn testID="submit-btn" title={loading ? '…' : mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Konto erstellen' : 'Passwort zurücksetzen'} onPress={submit} disabled={loading} />

            <View style={{ height: 10 }} />
            {mode === 'login' ? (
              <TouchableOpacity testID="forgot-btn" onPress={() => { setMode('forgot'); setErr(''); setInfo(''); }}>
                <Text style={s.forgot}>Passwort vergessen?</Text>
              </TouchableOpacity>
            ) : null}
            {mode === 'forgot' ? (
              <TouchableOpacity testID="back-login-btn" onPress={() => { setMode('login'); setErr(''); setInfo(''); }}>
                <Text style={s.forgot}>← Zurück zum Login</Text>
              </TouchableOpacity>
            ) : null}

            {mode === 'login' ? (
              <Text style={s.demo}>Demo: demo@dancetrack.app / demo12345</Text>
            ) : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 24, gap: 24, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 44, color: theme.text, marginTop: 12 },
  sub: { fontSize: 15, color: theme.mutedText, marginTop: 4 },
  tabs: { flexDirection: 'row', marginBottom: 16, backgroundColor: theme.bg, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: theme.surface },
  tabText: { color: theme.mutedText, fontSize: 14 },
  err: { color: '#c0477b', marginTop: 12, fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center' },
  info: { color: '#5b8a72', marginTop: 12, fontFamily: 'DMSans_700Bold', fontSize: 13, textAlign: 'center' },
  demo: { textAlign: 'center', color: theme.mutedText, fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 8 },
  pwdWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pwdToggle: { padding: 10, borderRadius: 12, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', height: 44, width: 44 },
  forgot: { color: theme.primary, fontSize: 13, fontFamily: 'DMSans_700Bold', textAlign: 'center', paddingVertical: 8 },
});
