import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, WEEKDAYS, GROUP_COLORS } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState } from '../../src/ui';

const empty = { name: '', weekday: 'Montag', time: '16:00', color: GROUP_COLORS[0], rewardSystemEnabled: true };

export default function Groups() {
  const { groups, students, attendance, addGroup, editGroup, deleteGroup } = useApp();
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const open = (g) => {
    if (g) { setForm({ name: g.name, weekday: g.weekday, time: g.time, color: g.color, rewardSystemEnabled: g.rewardSystemEnabled }); setEditId(g.id); }
    else { setForm(empty); setEditId(null); }
    setSheet(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editId) await editGroup(editId, form); else await addGroup(form);
    setSheet(false);
  };

  const del = (g) => Alert.alert('Gruppe löschen?', `"${g.name}" und alle zugehörigen Schüler werden gelöscht.`, [{ text: 'Abbrechen' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteGroup(g.id) }]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {groups.length === 0 ? <EmptyState emoji="🎭" title="Keine Gruppen" subtitle="Erstelle deine erste Tanzgruppe" /> : groups.map((g) => {
          const members = students.filter((st) => st.groupId === g.id);
          const events = attendance.filter((a) => members.some((m) => m.id === a.studentId));
          const presentCount = events.filter((e) => e.status === 'Present').length;
          const quote = events.length ? Math.round((presentCount / events.length) * 100) : 0;
          return (
            <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} testID={`group-card-${g.id}`}>
              <View style={[s.initial, { backgroundColor: g.color }]}><Text style={s.initialText}>{g.name.charAt(0).toUpperCase()}</Text></View>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => open(g)}>
                <Text style={[s.gName, { fontFamily: fonts.heading }]}>{g.name}</Text>
                <Text style={s.gSub}>{g.weekday} • {g.time}</Text>
                <Text style={s.gSub}>{members.length} Schüler • {quote}% Anwesend</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => del(g)} testID={`delete-group-${g.id}`}><Text style={{ fontSize: 20 }}>🗑️</Text></TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>
      <View style={s.fab}><Btn title="+ Neue Gruppe" onPress={() => open(null)} testID="add-group-btn" /></View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editId ? 'Gruppe bearbeiten' : 'Neue Gruppe'}>
        <View style={{ gap: 10 }}>
          <Text style={s.label}>Name</Text>
          <Input testID="group-name-input" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Name der Gruppe" />
          <Text style={s.label}>Wochentag</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {WEEKDAYS.map((w) => <Chip key={w} label={w.slice(0, 2)} active={form.weekday === w} onPress={() => setForm({ ...form, weekday: w })} />)}
          </View>
          <Text style={s.label}>Uhrzeit</Text>
          <Input testID="group-time-input" value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} placeholder="16:00" />
          <Text style={s.label}>Farbe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GROUP_COLORS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setForm({ ...form, color: c })} style={[s.color, { backgroundColor: c }, form.color === c && s.colorActive]} />
            ))}
          </View>
          <TouchableOpacity style={s.toggleRow} onPress={() => setForm({ ...form, rewardSystemEnabled: !form.rewardSystemEnabled })}>
            <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.body }}>Belohnungs-System</Text>
            <View style={[s.switch, form.rewardSystemEnabled && { backgroundColor: theme.primary }]}>
              <View style={[s.switchDot, form.rewardSystemEnabled && { left: 22 }]} />
            </View>
          </TouchableOpacity>
          <Btn testID="group-save-btn" title={editId ? 'Speichern' : 'Erstellen'} onPress={save} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  initial: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  initialText: { color: '#fff', fontSize: 22, fontFamily: 'DMSerifDisplay_400Regular' },
  gName: { fontSize: 18, color: theme.text },
  gSub: { fontSize: 12, color: theme.mutedText, marginTop: 1, fontFamily: 'DMSans_400Regular' },
  fab: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  label: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 6 },
  color: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: theme.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: theme.border, justifyContent: 'center' },
  switchDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginLeft: 2, position: 'absolute' },
});
