import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel } from '../../src/theme';
import { Card, ProgressBar } from '../../src/ui';

export default function Awards() {
  const { rewardLevels, students, attendance, groups, currentWorkspace } = useApp();

  const phaseNames = useMemo(
    () => currentWorkspace?.phaseNames || { knospe: 'Knospenphase', bluete: 'Blütenphase', glueck: 'Glückstierchenphase' },
    [currentWorkspace]
  );

  const sortedLevels = useMemo(
    () => [...rewardLevels].sort((a, b) => a.threshold - b.threshold),
    [rewardLevels]
  );

  // Map default phase strings to current names (legacy fallback)
  const phaseMap = useMemo(
    () => ({ Knospenphase: phaseNames.knospe, Blütenphase: phaseNames.bluete, Glückstierchenphase: phaseNames.glueck }),
    [phaseNames]
  );
  const displayPhase = (p) => (p ? (phaseMap[p] || p) : '');

  const grouped = useMemo(() => {
    const map = {};
    sortedLevels.forEach((lvl) => {
      const key = displayPhase(lvl.phase) || 'Weitere';
      (map[key] ||= []).push(lvl);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedLevels, phaseMap]);

  // Single-pass attendance count map
  const studentAttendanceCount = useMemo(() => {
    const map = {};
    attendance.forEach((a) => {
      if (a.status === 'Present') map[a.studentId] = (map[a.studentId] || 0) + 1;
    });
    return map;
  }, [attendance]);

  const groupById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);

  const top = useMemo(() => {
    const list = students
      .map((st) => {
        const c = studentAttendanceCount[st.id] || 0;
        return { s: st, c, lvl: getCurrentLevel(c, sortedLevels) };
      })
      .filter((x) => x.c > 0);
    list.sort((a, b) => b.c - a.c);
    return list.slice(0, 10);
  }, [students, studentAttendanceCount, sortedLevels]);

  // Pre-compute per-level achievement count (one pass over students)
  const levelAchievement = useMemo(() => {
    const map = {};
    sortedLevels.forEach((lvl) => {
      let cnt = 0;
      students.forEach((st) => {
        if ((studentAttendanceCount[st.id] || 0) >= lvl.threshold) cnt++;
      });
      map[lvl.id] = cnt;
    });
    return map;
  }, [sortedLevels, students, studentAttendanceCount]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} removeClippedSubviews>
      <Card>
        <Text style={[s.title, { fontFamily: fonts.heading }]}>🏆 Top Achievers</Text>
        {top.length === 0 ? <Text style={s.muted}>Noch keine Daten</Text> : top.map((t, i) => {
          const grp = groupById[t.s.groupId];
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

      {Object.entries(grouped).map(([phase, levels]) => (
        <View key={phase}>
          <Text style={[s.phaseTitle, { fontFamily: fonts.heading }]}>{phase}</Text>
          {levels.map((lvl) => {
            const idx = sortedLevels.findIndex((x) => x.id === lvl.id);
            const next = sortedLevels[idx + 1];
            const countAchieved = levelAchievement[lvl.id] || 0;
            const progress = students.length > 0 ? countAchieved / students.length : 0;
            return (
              <Card key={lvl.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 32 }}>{lvl.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lvlName, { fontFamily: fonts.heading }]}>{lvl.name}</Text>
                  <Text style={s.sub}>Ab {lvl.threshold}{next ? ` – ${next.threshold - 1}` : '+'} Trainings • {countAchieved} Schüler</Text>
                  <View style={{ marginTop: 6 }}>
                    <ProgressBar progress={progress} />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, color: theme.text, marginBottom: 10 },
  phaseTitle: { fontSize: 20, color: theme.primary, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  name: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  muted: { color: theme.mutedText, fontFamily: 'DMSans_400Regular' },
  lvlName: { fontSize: 16, color: theme.text },
});
