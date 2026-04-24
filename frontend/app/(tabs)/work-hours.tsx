import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, WEEKDAYS } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState } from '../../src/ui';

const STATUSES = ['Planned', 'Done', 'Substituted', 'Cancelled'];
const STATUS_LABEL = { Planned: 'Geplant', Done: 'Gehalten', Substituted: 'Vertretung', Cancelled: 'Entfällt' };

export default function WorkHours() {
  const { groups, lessons, addLesson, editLesson, deleteLesson } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ groupId: '', date: '', notes: '', choreography: '', music: '', exercises: '', status: 'Planned', checklist: [] });
  const [editId, setEditId] = useState(null);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const open = (groupId, date, existing) => {
    if (existing) { setForm({ groupId: existing.groupId, date: existing.date, notes: existing.notes || '', choreography: existing.choreography || '', music: existing.music || '', exercises: existing.exercises || '', status: existing.status, checklist: existing.checklist || [] }); setEditId(existing.id); }
    else { setForm({ groupId, date: date.toISOString(), notes: '', choreography: '', music: '', exercises: '', status: 'Planned', checklist: [] }); setEditId(null); }
    setSheet(true);
  };

  const save = async () => {
    if (editId) await editLesson(editId, form); else await addLesson(form);
    setSheet(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} testID="prev-week"><Text style={s.navBtn}>◀</Text></TouchableOpacity>
        <Text style={[s.weekLabel, { fontFamily: fonts.heading }]}>{startOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – {days[6].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</Text>
        <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)} testID="next-week"><Text style={s.navBtn}>▶</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
        {groups.length === 0 ? <EmptyState emoji="📅" title="Keine Gruppen" /> : days.map((d, i) => {
          const wd = WEEKDAYS[i];
          const gs = groups.filter((g) => g.weekday === wd);
          if (gs.length === 0) return null;
          return (
            <View key={i}>
              <Text style={[s.dayLabel, { fontFamily: fonts.bodyBold }]}>{wd} • {d.getDate()}.{d.getMonth() + 1}</Text>
              {gs.map((g) => {
                const lesson = lessons.find((l) => l.groupId === g.id && l.date.slice(0, 10) === d.toISOString().slice(0, 10));
                return (
                  <TouchableOpacity key={g.id} onPress={() => open(g.id, d, lesson)}>
                    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <View style={[s.dot, { backgroundColor: g.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.gName, { fontFamily: fonts.heading }]}>{g.name} • {g.time}</Text>
                        {lesson ? <Text style={s.sub}>{STATUS_LABEL[lesson.status]} • {lesson.notes || lesson.choreography || '—'}</Text> : <Text style={s.sub}>Noch nicht geplant</Text>}
                      </View>
                      {lesson ? <Text style={{ fontSize: 20 }}>{lesson.status === 'Done' ? '✅' : lesson.status === 'Cancelled' ? '🚫' : '📝'}</Text> : <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>+</Text>}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Stunde planen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {STATUSES.map((st) => <Chip key={st} label={STATUS_LABEL[st]} active={form.status === st} onPress={() => setForm({ ...form, status: st })} />)}
          </View>
          <Text style={s.lbl}>Choreografie</Text>
          <Input value={form.choreography} onChangeText={(v) => setForm({ ...form, choreography: v })} />
          <Text style={s.lbl}>Musik</Text>
          <Input value={form.music} onChangeText={(v) => setForm({ ...form, music: v })} />
          <Text style={s.lbl}>Übungen</Text>
          <Input value={form.exercises} onChangeText={(v) => setForm({ ...form, exercises: v })} multiline />
          <Text style={s.lbl}>Notizen</Text>
          <Input value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
          <Text style={s.lbl}>Nicht vergessen (Komma-getrennt)</Text>
          <Input value={form.checklist.join(', ')} onChangeText={(v) => setForm({ ...form, checklist: v.split(',').map((x) => x.trim()).filter(Boolean) })} />
          <Btn title="Speichern" onPress={save} testID="lesson-save-btn" />
          {editId ? <Btn title="Löschen" variant="ghost" onPress={() => { deleteLesson(editId); setSheet(false); }} /> : null}
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  weekLabel: { fontSize: 16, color: theme.text },
  navBtn: { fontSize: 18, color: theme.primary, padding: 8 },
  dayLabel: { fontSize: 13, color: theme.primary, marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  gName: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 6 },
});
