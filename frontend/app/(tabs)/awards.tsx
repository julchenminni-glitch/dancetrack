import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel } from '../../src/theme';
import { Card, ProgressBar, EmptyState } from '../../src/ui';

export default function Awards() {
  const { rewardLevels, students, attendance, groups } = useApp();
  const sorted = [...rewardLevels].sort((a, b) => a.threshold - b.threshold);

  const studentAttendanceCount = students.reduce((acc, s) => {
    acc[s.id] = attendance.filter((a) => a.studentId === s.id && a.status === 'Present').length;
    return acc;
  }, {});

  const top = [...students]
    .map((s) => ({ s, c: studentAttendanceCount[s.id] || 0, lvl: getCurrentLevel(studentAttendanceCount[s.id] || 0, rewardLevels) }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 10);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <Text style={[s.title, { fontFamily: fonts.heading }]}>🏆 Top Achievers</Text>
        {top.length === 0 ? <Text style={s.muted}>Noch keine Daten</Text> : top.map((t, i) => {
          const grp = groups.find((g) => g.id === t.s.groupId);
          return (
            <View key={t.s.id} style={s.row}>
              <Text style={{ fontSize: 18, width: 28 }}>{['🥇', '🥈', '🥉'][i] || `${i + 1}.`}</Text>
              <Text style={{ fontSize: 22 }}>{t.lvl?.emoji || '🌱'}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.name, { fontFamily: fonts.bodyBold }]}>{t.s.name}</Text>
                <Text style={s.sub}>{grp?.name} • {t.lvl?.name}</Text>
              </View>
              <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>{t.c}x</Text>
            </View>
          );
        })}
      </Card>

      <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>Alle Levels</Text>
      {sorted.map((lvl, i) => {
        const next = sorted[i + 1];
        const countAchieved = students.filter((st) => (studentAttendanceCount[st.id] || 0) >= lvl.threshold).length;
        const progress = students.length > 0 ? countAchieved / students.length : 0;
        return (
          <Card key={lvl.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 32 }}>{lvl.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.lvlName, { fontFamily: fonts.heading }]}>{lvl.name}</Text>
              <Text style={s.sub}>Ab {lvl.threshold} Trainings{next ? ` (bis ${next.threshold - 1})` : '+'} • {countAchieved} Schüler</Text>
              <View style={{ marginTop: 6 }}>
                <ProgressBar progress={progress} />
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, color: theme.text, marginBottom: 10 },
  sectionTitle: { fontSize: 18, color: theme.text, marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  name: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  muted: { color: theme.mutedText, fontFamily: 'DMSans_400Regular' },
  lvlName: { fontSize: 16, color: theme.text },
});
