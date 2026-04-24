import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '../../src/store';
import { theme, fonts, WEEKDAYS, GROUP_COLORS, calcAge, formatDate, getCurrentLevel } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState } from '../../src/ui';
import { confirm } from '../../src/confirm';

const empty = { name: '', weekday: 'Montag', time: '16:00', color: GROUP_COLORS[0], rewardSystemEnabled: true };

export default function Groups() {
  const { groups, students, attendance, rewardLevels, addGroup, editGroup, deleteGroup, showToast } = useApp();
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
  const del = (g) => confirm('Gruppe löschen?', `"${g.name}" und alle zugehörigen Schüler werden gelöscht.`, () => { deleteGroup(g.id); setSheet(false); });

  const exportGroup = async (g) => {
    const members = students.filter((st) => st.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name));
    const rows = [['Name', 'Geburtstag', 'Alter', 'Telefon', 'Angemeldet', 'Trainings', 'Level']];
    members.forEach((st) => {
      const count = attendance.filter((a) => a.studentId === st.id && a.status === 'Present').length;
      const lvl = getCurrentLevel(count, rewardLevels);
      rows.push([
        st.name,
        formatDate(st.birthday) || '',
        calcAge(st.birthday) != null ? String(calcAge(st.birthday)) : '',
        st.phone || '',
        st.isRegistered ? 'Ja' : 'Nein',
        String(count),
        lvl ? `${lvl.emoji} ${lvl.name}` : '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const header = `Gruppe: ${g.name} (${g.weekday} ${g.time}) - ${members.length} Schüler\n\n`;
    const content = header + csv;

    try {
      if (Platform.OS === 'web') {
        // Web: trigger download
        // eslint-disable-next-line no-undef
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        // eslint-disable-next-line no-undef
        const url = URL.createObjectURL(blob);
        // eslint-disable-next-line no-undef
        const a = document.createElement('a');
        a.href = url; a.download = `${g.name.replace(/\s+/g, '_')}.csv`; a.click();
        // eslint-disable-next-line no-undef
        URL.revokeObjectURL(url);
        showToast('CSV heruntergeladen');
      } else {
        const path = `${FileSystem.cacheDirectory}${g.name.replace(/\s+/g, '_')}.csv`;
        await FileSystem.writeAsStringAsync(path, '\uFEFF' + content, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Gruppe "${g.name}" teilen` });
        } else {
          await Share.share({ message: content, title: `${g.name} Gruppenliste` });
        }
      }
    } catch (e) {
      Alert.alert('Export fehlgeschlagen', e.message || 'Unbekannter Fehler');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {groups.length === 0 ? <EmptyState emoji="🎭" title="Keine Gruppen" subtitle="Erstelle deine erste Tanzgruppe" /> : groups.map((g) => {
          const members = students.filter((st) => st.groupId === g.id);
          const recs = attendance.filter((a) => members.some((m) => m.id === a.studentId));
          const presentCount = recs.filter((e) => e.status === 'Present').length;
          const quote = recs.length ? Math.round((presentCount / recs.length) * 100) : 0;
          return (
            <Card key={g.id} style={{ gap: 10 }} testID={`group-card-${g.id}`}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} onPress={() => open(g)}>
                <View style={[s.initial, { backgroundColor: g.color }]}><Text style={s.initialText}>{g.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.gName, { fontFamily: fonts.heading }]}>{g.name}</Text>
                  <Text style={s.gSub}>{g.weekday} • {g.time}</Text>
                  <Text style={s.gSub}>{members.length} Schüler • {quote}% Anwesend</Text>
                </View>
                <Text style={{ color: theme.mutedText, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Btn small title="📤 Liste exportieren" variant="secondary" onPress={() => exportGroup(g)} testID={`export-group-${g.id}`} /></View>
              </View>
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
          {editId ? (
            <TouchableOpacity onPress={() => del(groups.find((x) => x.id === editId))} style={{ paddingVertical: 10, alignItems: 'center' }} testID={`delete-group-${editId}`}>
              <Text style={{ color: '#c0477b', fontSize: 13, fontFamily: fonts.body }}>Gruppe löschen</Text>
            </TouchableOpacity>
          ) : null}
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
