import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel, getNextLevel, WEEKDAYS } from '../../src/theme';
import { Card, ProgressBar, EmptyState } from '../../src/ui';

export default function Overview() {
  const router = useRouter();
  const { groups, students, sessions, events, attendance, rewardLevels } = useApp();

  const totalHours = sessions.reduce((a, s) => a + (s.duration || 0), 0);

  const studentAttendanceCount = students.reduce((acc, st) => {
    acc[st.id] = attendance.filter((a) => a.studentId === st.id && a.status === 'Present').length;
    return acc;
  }, {});

  const nextLevelUps = students
    .map((st) => {
      const count = studentAttendanceCount[st.id] || 0;
      const next = getNextLevel(count, rewardLevels);
      if (!next) return null;
      const diff = next.threshold - count;
      return diff === 1 ? { student: st, next } : null;
    })
    .filter(Boolean);

  const topAchievers = [...students]
    .map((st) => ({ st, count: studentAttendanceCount[st.id] || 0, lvl: getCurrentLevel(studentAttendanceCount[st.id] || 0, rewardLevels) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // This week
  const today = new Date();
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
  const weekEvents = events.filter((e) => { const d = new Date(e.date); return d >= startOfWeek && d < endOfWeek; });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={s.stat}><Text style={s.statEmoji}>🎭</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{groups.length}</Text><Text style={s.statLabel}>Gruppen</Text></Card>
        <Card style={s.stat}><Text style={s.statEmoji}>👥</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{students.length}</Text><Text style={s.statLabel}>Schüler</Text></Card>
        <Card style={s.stat}><Text style={s.statEmoji}>💼</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{totalHours.toFixed(1)}</Text><Text style={s.statLabel}>Stunden</Text></Card>
      </View>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>🎯 Level-Up wartet</Text>
        {nextLevelUps.length === 0 ? (
          <Text style={s.muted}>Keine Schüler kurz vor einem Level-Up</Text>
        ) : nextLevelUps.slice(0, 5).map(({ student, next }) => (
          <View key={student.id} style={s.lvlRow}>
            <Text style={{ fontSize: 20 }}>{next.emoji}</Text>
            <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]}>{student.name}</Text>
            <Text style={s.muted}>→ {next.name}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>🏆 Top Achievers</Text>
        {topAchievers.length === 0 ? <Text style={s.muted}>Noch keine Schüler</Text> : topAchievers.map(({ st, count, lvl }, i) => (
          <View key={st.id} style={s.lvlRow}>
            <Text style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</Text>
            <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]}>{st.name}</Text>
            <Text style={{ fontSize: 18 }}>{lvl?.emoji || '🌱'}</Text>
            <Text style={s.muted}>{count}x</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>📅 Diese Woche</Text>
        {groups.length === 0 ? (
          <EmptyState emoji="🎭" title="Noch keine Gruppen" subtitle="Erstelle deine erste Tanzgruppe" />
        ) : WEEKDAYS.map((wd) => {
          const gs = groups.filter((g) => g.weekday === wd);
          if (gs.length === 0) return null;
          return (
            <View key={wd} style={{ marginTop: 8 }}>
              <Text style={[s.weekDay, { fontFamily: fonts.bodyBold }]}>{wd}</Text>
              {gs.map((g) => {
                const done = weekEvents.some((e) => e.groupId === g.id);
                return (
                  <TouchableOpacity key={g.id} style={s.weekItem} onPress={() => router.push('/(tabs)/attendance')}>
                    <View style={[s.groupDot, { backgroundColor: g.color }]} />
                    <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.body }}>{g.name} • {g.time}</Text>
                    <Text style={{ fontSize: 16 }}>{done ? '✅' : '⏳'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center', padding: 14 },
  statEmoji: { fontSize: 26, marginBottom: 4 },
  statNum: { fontSize: 24, color: theme.text },
  statLabel: { fontSize: 11, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  sectionTitle: { fontSize: 17, color: theme.text, marginBottom: 10 },
  muted: { color: theme.mutedText, fontSize: 13, fontFamily: 'DMSans_400Regular' },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  lvlName: { flex: 1, color: theme.text, fontSize: 14 },
  weekDay: { fontSize: 13, color: theme.primary, marginTop: 4, marginBottom: 4 },
  weekItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
});
