import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store';
import { theme, fonts, WEEKDAYS } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState } from '../../src/ui';

const STATUSES = ['Planned', 'Done', 'Substituted', 'Cancelled'];
const STATUS_LABEL = { Planned: 'Geplant', Done: 'Gehalten', Substituted: 'Vertretung', Cancelled: 'Entfällt' };

export default function Stunden() {
  const router = useRouter();
  const { groups, lessons, sessions, addLesson, editLesson, deleteLesson, addSession, deleteSession } = useApp();
  const [mode, setMode] = useState('plan'); // plan | history
  const [weekOffset, setWeekOffset] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ groupId: '', date: '', notes: '', choreography: '', music: '', exercises: '', status: 'Planned', checklist: [] });
  const [editId, setEditId] = useState(null);
  const [manualSheet, setManualSheet] = useState(false);
  const [mForm, setMForm] = useState({ groupId: '', date: new Date().toISOString().slice(0, 10), duration: '1.0', notes: '' });

  const startOfWeek = React.useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7); d.setHours(0, 0, 0, 0); return d;
  }, [weekOffset]);
  const days = [...Array(7)].map((_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });

  const total = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  const openLesson = (groupId, date, existing) => {
    if (existing) { setForm({ groupId: existing.groupId, date: existing.date, notes: existing.notes || '', choreography: existing.choreography || '', music: existing.music || '', exercises: existing.exercises || '', status: existing.status, checklist: existing.checklist || [] }); setEditId(existing.id); }
    else { setForm({ groupId, date: date.toISOString(), notes: '', choreography: '', music: '', exercises: '', status: 'Planned', checklist: [] }); setEditId(null); }
    setSheet(true);
  };
  const saveLesson = async () => { if (editId) await editLesson(editId, form); else await addLesson(form); setSheet(false); };
  const saveManual = async () => {
    await addSession({ groupId: mForm.groupId || null, date: new Date(mForm.date).toISOString(), duration: parseFloat(mForm.duration) || 0, notes: mForm.notes, isPaid: false });
    setManualSheet(false); setMForm({ groupId: '', date: new Date().toISOString().slice(0, 10), duration: '1.0', notes: '' });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.modeSwitch}>
        <TouchableOpacity onPress={() => setMode('plan')} style={[s.modeBtn, mode === 'plan' && s.modeActive]} testID="mode-plan"><Text style={[s.modeTxt, mode === 'plan' && { color: theme.primary, fontFamily: fonts.bodyBold }]}>📅 Planung</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('history')} style={[s.modeBtn, mode === 'history' && s.modeActive]} testID="mode-history"><Text style={[s.modeTxt, mode === 'history' && { color: theme.primary, fontFamily: fonts.bodyBold }]}>💼 Gehaltene</Text></TouchableOpacity>
      </View>

      {mode === 'plan' ? (
        <>
          <View style={s.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)}><Text style={s.navBtn}>◀</Text></TouchableOpacity>
            <Text style={[s.weekLabel, { fontFamily: fonts.heading }]}>{startOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – {days[6].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</Text>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)}><Text style={s.navBtn}>▶</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
            {groups.length === 0 ? <EmptyState emoji="📅" title="Keine Gruppen" /> : days.map((d, i) => {
              const wd = WEEKDAYS[i]; const gs = groups.filter((g) => g.weekday === wd);
              if (gs.length === 0) return null;
              return (
                <View key={i}>
                  <Text style={[s.dayLabel, { fontFamily: fonts.bodyBold }]}>{wd} • {d.getDate().toString().padStart(2, '0')}.{(d.getMonth() + 1).toString().padStart(2, '0')}</Text>
                  {gs.map((g) => {
                    const lesson = lessons.find((l) => l.groupId === g.id && l.date.slice(0, 10) === d.toISOString().slice(0, 10));
                    return (
                      <TouchableOpacity key={g.id} onPress={() => openLesson(g.id, d, lesson)}>
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
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
          <Card style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 32, color: theme.primary, fontFamily: fonts.heading }}>{total.toFixed(1)} h</Text>
            <Text style={{ color: theme.mutedText, fontFamily: fonts.body }}>Gehaltene Stunden gesamt</Text>
            <Text style={{ color: theme.mutedText, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>{sessions.length} Einträge</Text>
          </Card>
          {sortedSessions.length === 0 ? <EmptyState emoji="💼" title="Keine Einträge" /> : sortedSessions.map((s0) => {
            const g = groups.find((x) => x.id === s0.groupId);
            return (
              <Card key={s0.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.gName, { fontFamily: fonts.bodyBold }]}>{g?.name || 'Allgemein'} • {s0.duration}h</Text>
                  <Text style={s.sub}>{new Date(s0.date).toLocaleDateString('de-DE')}{s0.notes ? ` • ${s0.notes}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Löschen?', '', [{ text: 'Abbrechen' }, { text: 'Ja', style: 'destructive', onPress: () => deleteSession(s0.id) }])}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
              </Card>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {mode === 'history' ? (
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <Btn title="+ Stunde erfassen" onPress={() => setManualSheet(true)} testID="add-session-btn" />
        </View>
      ) : null}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Stunde planen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {STATUSES.map((st) => <Chip key={st} label={STATUS_LABEL[st]} active={form.status === st} onPress={() => setForm({ ...form, status: st })} />)}
          </View>
          <Text style={s.lbl}>Choreografie</Text><Input value={form.choreography} onChangeText={(v) => setForm({ ...form, choreography: v })} />
          <Text style={s.lbl}>Musik</Text><Input value={form.music} onChangeText={(v) => setForm({ ...form, music: v })} />
          <Text style={s.lbl}>Übungen</Text><Input value={form.exercises} onChangeText={(v) => setForm({ ...form, exercises: v })} multiline />
          <Text style={s.lbl}>Notizen</Text><Input value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
          <Text style={s.lbl}>Nicht vergessen (Komma-getrennt)</Text>
          <Input value={form.checklist.join(', ')} onChangeText={(v) => setForm({ ...form, checklist: v.split(',').map((x) => x.trim()).filter(Boolean) })} />
          <Btn title="Speichern" onPress={saveLesson} testID="lesson-save-btn" />
          {editId ? <Btn title="Löschen" variant="ghost" onPress={() => { deleteLesson(editId); setSheet(false); }} /> : null}
        </View>
      </Sheet>

      <Sheet visible={manualSheet} onClose={() => setManualSheet(false)} title="Stunde erfassen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Gruppe (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {groups.map((g) => <Chip key={g.id} label={g.name} active={mForm.groupId === g.id} onPress={() => setMForm({ ...mForm, groupId: g.id })} color={g.color} />)}
          </View>
          <Text style={s.lbl}>Datum</Text><Input value={mForm.date} onChangeText={(v) => setMForm({ ...mForm, date: v })} />
          <Text style={s.lbl}>Dauer (h)</Text><Input value={mForm.duration} onChangeText={(v) => setMForm({ ...mForm, duration: v })} keyboardType="numeric" />
          <Text style={s.lbl}>Notizen</Text><Input value={mForm.notes} onChangeText={(v) => setMForm({ ...mForm, notes: v })} multiline />
          <Btn title="Erfassen" onPress={saveManual} testID="session-save-btn" />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  modeSwitch: { flexDirection: 'row', padding: 12, gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  modeActive: { borderColor: theme.primary, backgroundColor: '#fce7ee' },
  modeTxt: { color: theme.mutedText, fontFamily: 'DMSans_400Regular' },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  weekLabel: { fontSize: 16, color: theme.text },
  navBtn: { fontSize: 18, color: theme.primary, padding: 8 },
  dayLabel: { fontSize: 13, color: theme.primary, marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  gName: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 6 },
});
