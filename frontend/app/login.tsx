import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../src/store';
import { theme, fonts } from '../src/theme';
import { Btn, Input, Card } from '../src/ui';

export default function Login() {
  const { login, register } = useApp();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@dancetrack.app');
  const [password, setPassword] = useState('demo12345');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, name || email.split('@')[0]);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Fehler beim Anmelden');
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
            <View style={s.tabs}>
              <TouchableOpacity testID="tab-login" onPress={() => setMode('login')} style={[s.tab, mode === 'login' && s.tabActive]}>
                <Text style={[s.tabText, { fontFamily: fonts.bodyBold }, mode === 'login' && { color: theme.primary }]}>Anmelden</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="tab-register" onPress={() => setMode('register')} style={[s.tab, mode === 'register' && s.tabActive]}>
                <Text style={[s.tabText, { fontFamily: fonts.bodyBold }, mode === 'register' && { color: theme.primary }]}>Registrieren</Text>
              </TouchableOpacity>
            </View>
            {mode === 'register' ? (
              <Input testID="name-input" value={name} onChangeText={setName} placeholder="Dein Name" />
            ) : null}
            <View style={{ height: 10 }} />
            <Input testID="email-input" value={email} onChangeText={setEmail} placeholder="E-Mail" keyboardType="email-address" autoCapitalize="none" />
            <View style={{ height: 10 }} />
            <Input testID="password-input" value={password} onChangeText={setPassword} placeholder="Passwort" secureTextEntry />
            {err ? <Text style={s.err}>{err}</Text> : null}
            <View style={{ height: 16 }} />
            <Btn testID="submit-btn" title={loading ? '…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'} onPress={submit} disabled={loading} />
            <View style={{ height: 8 }} />
            <Text style={s.demo}>Demo: demo@dancetrack.app / demo12345</Text>
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
  err: { color: '#c0477b', marginTop: 12, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  demo: { textAlign: 'center', color: theme.mutedText, fontSize: 12, fontFamily: 'DMSans_400Regular' },
});
