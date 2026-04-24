import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState } from '../../src/ui';

export default function TrainerHours() {
  const { sessions, groups, addSession, editSession, deleteSession } = useApp();
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ groupId: '', date: new Date().toISOString().slice(0, 10), duration: '1.0', notes: '', isPaid: false });

  const total = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const paid = sessions.filter((s) => s.isPaid).reduce((a, s) => a + (s.duration || 0), 0);
  const open_ = total - paid;

  const save = async () => {
    await addSession({ groupId: form.groupId || null, date: new Date(form.date).toISOString(), duration: parseFloat(form.duration) || 0, notes: form.notes, isPaid: form.isPaid });
    setSheet(false);
    setForm({ groupId: '', date: new Date().toISOString().slice(0, 10), duration: '1.0', notes: '', isPaid: false });
  };

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={s.stat}><Text style={[s.num, { fontFamily: fonts.heading }]}>{total.toFixed(1)}</Text><Text style={s.lbl}>Gesamt</Text></Card>
          <Card style={s.stat}><Text style={[s.num, { color: theme.accentGreen, fontFamily: fonts.heading }]}>{paid.toFixed(1)}</Text><Text style={s.lbl}>Bezahlt</Text></Card>
          <Card style={s.stat}><Text style={[s.num, { color: theme.accentGold, fontFamily: fonts.heading }]}>{open_.toFixed(1)}</Text><Text style={s.lbl}>Offen</Text></Card>
        </View>
        {sorted.length === 0 ? <EmptyState emoji="💼" title="Keine Einträge" subtitle="Erfasse deine Trainingsstunden" /> : sorted.map((s0) => {
          const g = groups.find((x) => x.id === s0.groupId);
          return (
            <Card key={s0.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { fontFamily: fonts.bodyBold }]}>{g?.name || 'Allgemein'} • {s0.duration}h</Text>
                <Text style={s.subText}>{new Date(s0.date).toLocaleDateString('de-DE')}{s0.notes ? ` • ${s0.notes}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => editSession(s0.id, { isPaid: !s0.isPaid })} style={[s.pill, s0.isPaid && { backgroundColor: '#e4f2e9' }]} testID={`toggle-paid-${s0.id}`}>
                <Text style={{ color: s0.isPaid ? theme.accentGreen : theme.mutedText, fontFamily: fonts.bodyBold, fontSize: 11 }}>{s0.isPaid ? '✓ Bezahlt' : 'Offen'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Löschen?', '', [{ text: 'Abbrechen' }, { text: 'Ja', style: 'destructive', onPress: () => deleteSession(s0.id) }])} style={{ marginLeft: 8 }}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}><Btn title="+ Stunden erfassen" onPress={() => setSheet(true)} testID="add-session-btn" /></View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Stunden erfassen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl2}>Gruppe (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {groups.map((g) => <Chip key={g.id} label={g.name} active={form.groupId === g.id} onPress={() => setForm({ ...form, groupId: g.id })} color={g.color} />)}
          </View>
          <Text style={s.lbl2}>Datum</Text>
          <Input testID="session-date-input" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} />
          <Text style={s.lbl2}>Dauer (h)</Text>
          <Input testID="session-duration-input" value={form.duration} onChangeText={(v) => setForm({ ...form, duration: v })} keyboardType="numeric" />
          <Text style={s.lbl2}>Notizen</Text>
          <Input value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
          <Btn title="Erfassen" onPress={save} testID="session-save-btn" />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center', padding: 14 },
  num: { fontSize: 22, color: theme.text },
  lbl: { fontSize: 11, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  name: { fontSize: 15, color: theme.text },
  subText: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.bg },
  lbl2: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 4 },
});
