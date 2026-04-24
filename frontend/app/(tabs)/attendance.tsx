import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, EVENT_TYPES } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState, Avatar } from '../../src/ui';

const STATUS = [
  { key: 'Present', label: 'Anwesend', emoji: '🪩', color: '#5b8a72' },
  { key: 'Excused', label: 'Entschuldigt', emoji: '🌴', color: '#c4883a' },
  { key: 'Absent', label: 'Fehlend', emoji: '👻', color: '#d4719d' },
];

export default function Attendance() {
  const { groups, students, events, attendance, saveAttendance, deleteEvent } = useApp();
  const [sheet, setSheet] = useState(false);
  const [type, setType] = useState('Training');
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({});

  const open = () => { setType('Training'); setGroupId(groups[0]?.id || ''); setDate(new Date().toISOString().slice(0, 10)); setMarks({}); setSheet(true); };
  const cycle = (id) => {
    const cur = marks[id] || 'Present';
    const idx = STATUS.findIndex((s) => s.key === cur);
    setMarks({ ...marks, [id]: STATUS[(idx + 1) % STATUS.length].key });
  };
  const save = async () => {
    if (!groupId) return;
    const groupStudents = students.filter((st) => st.groupId === groupId);
    const final = {};
    groupStudents.forEach((st) => { final[st.id] = marks[st.id] || 'Absent'; });
    await saveAttendance({ groupId, type, date: new Date(date).toISOString(), attendance: final, duration: 1.0 });
    setSheet(false);
  };

  const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        {sortedEvents.length === 0 ? <EmptyState emoji="📋" title="Keine Termine" subtitle="Erstelle deinen ersten Termin" /> : sortedEvents.map((e) => {
          const grp = groups.find((g) => g.id === e.groupId);
          const recs = attendance.filter((a) => a.eventId === e.id);
          const present = recs.filter((r) => r.status === 'Present').length;
          const t = EVENT_TYPES.find((x) => x.key === e.type);
          return (
            <Card key={e.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>{t?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, { fontFamily: fonts.heading }]}>{grp?.name || '—'} • {t?.label}</Text>
                  <Text style={s.sub}>{new Date(e.date).toLocaleDateString('de-DE')} • {present}/{recs.length} anwesend</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Termin löschen?', '', [{ text: 'Abbrechen' }, { text: 'Ja', style: 'destructive', onPress: () => deleteEvent(e.id) }])}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <Btn title="+ Neuer Termin" onPress={open} testID="new-attendance-btn" disabled={groups.length === 0} />
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Anwesenheit eintragen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Typ</Text>
          <View style={{ flexDirection: 'row' }}>
            {EVENT_TYPES.map((t) => <Chip key={t.key} label={`${t.emoji} ${t.label}`} active={type === t.key} onPress={() => setType(t.key)} />)}
          </View>
          <Text style={s.lbl}>Gruppe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {groups.map((g) => <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} color={g.color} />)}
          </View>
          <Text style={s.lbl}>Datum (YYYY-MM-DD)</Text>
          <Input testID="attendance-date" value={date} onChangeText={setDate} />
          <Text style={s.lbl}>Schüler</Text>
          {students.filter((st) => st.groupId === groupId).map((st) => {
            const cur = marks[st.id] || 'Present';
            const stat = STATUS.find((x) => x.key === cur);
            return (
              <TouchableOpacity key={st.id} onPress={() => cycle(st.id)} testID={`mark-${st.id}`} style={s.row}>
                <Avatar name={st.name} photo={st.photoUrl} size={36} />
                <Text style={{ flex: 1, marginLeft: 10, color: theme.text, fontFamily: fonts.body }}>{st.name}</Text>
                <View style={[s.status, { backgroundColor: stat.color + '22' }]}>
                  <Text style={{ fontSize: 16 }}>{stat.emoji}</Text>
                  <Text style={{ color: stat.color, fontFamily: fonts.bodyBold, fontSize: 12, marginLeft: 4 }}>{stat.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Btn testID="attendance-save-btn" title="Speichern" onPress={save} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 16, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  status: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
});
