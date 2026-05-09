import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel, getNextLevel, WEEKDAYS } from '../../src/theme';
import { Card, EmptyState } from '../../src/ui';

export default function Overview() {
  const router = useRouter();
  const { groups, students, sessions, events, attendance, rewardLevels } = useApp();

  // ===== Memoized derivations =====
  const totalHours = useMemo(
    () => sessions.reduce((a, s) => a + (s.duration || 0), 0),
    [sessions]
  );

  // Build single index of attendance counts in one pass (avoid N*M filter)
  const studentAttendanceCount = useMemo(() => {
    const map = {};
    attendance.forEach((a) => {
      if (a.status === 'Present') map[a.studentId] = (map[a.studentId] || 0) + 1;
    });
    return map;
  }, [attendance]);

  const sortedRewardLevels = useMemo(
    () => [...rewardLevels].sort((a, b) => a.threshold - b.threshold),
    [rewardLevels]
  );

  const nextLevelUps = useMemo(() => {
    const list = [];
    for (const st of students) {
      const count = studentAttendanceCount[st.id] || 0;
      const next = getNextLevel(count, sortedRewardLevels);
      if (!next) continue;
      if (next.threshold - count === 1) {
        list.push({ student: st, next, current: getCurrentLevel(count, sortedRewardLevels), count });
      }
    }
    return list;
  }, [students, studentAttendanceCount, sortedRewardLevels]);

  const topAchievers = useMemo(() => {
    return students
      .map((st) => ({
        st,
        count: studentAttendanceCount[st.id] || 0,
        lvl: getCurrentLevel(studentAttendanceCount[st.id] || 0, sortedRewardLevels),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [students, studentAttendanceCount, sortedRewardLevels]);

  const groupsByDay = useMemo(() => {
    const map = {};
    groups.forEach((g) => { (map[g.weekday] ||= []).push(g); });
    return map;
  }, [groups]);

  const weekEventsByGroup = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
    const set = new Set();
    events.forEach((e) => {
      const d = new Date(e.date);
      if (d >= startOfWeek && d < endOfWeek) set.add(e.groupId);
    });
    return set;
  }, [events]);

  const goStudent = (id) => router.push({ pathname: '/(tabs)/students', params: { openId: id } });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} removeClippedSubviews>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/groups')} testID="stat-groups-btn">
          <Card style={s.stat}><Text style={s.statEmoji}>👯</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{groups.length}</Text><Text style={s.statLabel}>Gruppen</Text></Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/students')} testID="stat-students-btn">
          <Card style={s.stat}><Text style={s.statEmoji}>👥</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{students.length}</Text><Text style={s.statLabel}>Schüler</Text></Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/work-hours')} testID="stat-hours-btn">
          <Card style={s.stat}><Text style={s.statEmoji}>💼</Text><Text style={[s.statNum, { fontFamily: fonts.heading }]}>{totalHours.toFixed(1)}</Text><Text style={s.statLabel}>Stunden</Text></Card>
        </TouchableOpacity>
      </View>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>🎯 Level-Up wartet</Text>
        {nextLevelUps.length === 0 ? (
          <Text style={s.muted}>Keine Schüler kurz vor einem Level-Up</Text>
        ) : nextLevelUps.slice(0, 5).map(({ student, next, current }) => (
          <TouchableOpacity key={student.id} style={s.lvlRow} onPress={() => goStudent(student.id)}>
            <Text style={{ fontSize: 20 }}>{current?.emoji || '🌱'}</Text>
            <Text style={{ fontSize: 14, color: theme.mutedText }}>→</Text>
            <Text style={{ fontSize: 20 }}>{next.emoji}</Text>
            <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]} numberOfLines={1}>{student.name}</Text>
            <Text style={s.muted}>{next.name}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>🏆 Top Achievers</Text>
        {topAchievers.length === 0 ? <Text style={s.muted}>Noch keine Schüler</Text> : topAchievers.map(({ st, count, lvl }, i) => (
          <TouchableOpacity key={st.id} style={s.lvlRow} onPress={() => goStudent(st.id)} testID={`achiever-${st.id}`}>
            <Text style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</Text>
            <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]}>{st.name}</Text>
            <Text style={{ fontSize: 18 }}>{lvl?.emoji || '🌱'}</Text>
            <Text style={s.muted}>{count}x</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card>
        <Text style={[s.sectionTitle, { fontFamily: fonts.heading }]}>📅 Diese Woche</Text>
        {groups.length === 0 ? (
          <EmptyState emoji="🎭" title="Noch keine Gruppen" subtitle="Erstelle deine erste Tanzgruppe" />
        ) : WEEKDAYS.map((wd) => {
          const gs = groupsByDay[wd];
          if (!gs || gs.length === 0) return null;
          return (
            <View key={wd} style={{ marginTop: 8 }}>
              <Text style={[s.weekDay, { fontFamily: fonts.bodyBold }]}>{wd}</Text>
              {gs.map((g) => {
                const done = weekEventsByGroup.has(g.id);
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
  stat: { alignItems: 'center', padding: 14 },
  statEmoji: { fontSize: 26, marginBottom: 4 },
  statNum: { fontSize: 24, color: theme.text },
  statLabel: { fontSize: 11, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  sectionTitle: { fontSize: 17, color: theme.text, marginBottom: 10 },
  muted: { color: theme.mutedText, fontSize: 13, fontFamily: 'DMSans_400Regular' },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  lvlName: { flex: 1, color: theme.text, fontSize: 14 },
  weekDay: { fontSize: 13, color: theme.primary, marginTop: 4, marginBottom: 4 },
  weekItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
});
