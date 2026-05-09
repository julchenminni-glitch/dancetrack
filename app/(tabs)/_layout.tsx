import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';

const TABS = [
  { key: 'overview', label: 'Übersicht', icon: '🏠' },
  { key: 'groups', label: 'Gruppen', icon: '👯' },
  { key: 'students', label: 'Schüler', icon: '👥' },
  { key: 'attendance', label: 'Anwesenheit', icon: '📋' },
  { key: 'registrations', label: 'Anmeldungen', icon: '✅' },
  { key: 'work-hours', label: 'Stunden', icon: '📅' },
  { key: 'awards', label: 'Awards', icon: '🏆' },
  { key: 'settings', label: 'Einstellungen', icon: '⚙️' },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentWorkspace, groups, events, setWorkspaceId } = useApp();
  const [bellOpen, setBellOpen] = useState(false);

  const active = TABS.find((t) => pathname.includes(t.key))?.key || 'overview';

  // Groups missing attendance today
  const today = new Date();
  const weekdayIdx = (today.getDay() + 6) % 7; // 0 = Monday
  const WD = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const todayStr = today.toISOString().slice(0, 10);
  const groupsToday = groups.filter((g) => g.weekday === WD[weekdayIdx]);
  const missingGroups = groupsToday.filter((g) => !events.some((e) => e.groupId === g.id && e.date.slice(0, 10) === todayStr));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setWorkspaceId(null)} testID="switch-workspace-btn">
          <Text style={[s.wsName, { fontFamily: fonts.heading }]} numberOfLines={1}>{currentWorkspace?.name || 'DanceTrack'}</Text>
          <Text style={[s.wsTrainer, { fontFamily: fonts.body }]}>👤 {currentWorkspace?.trainerName}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setBellOpen(!bellOpen)} style={s.bell} testID="bell-btn">
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {missingGroups.length > 0 ? (
            <View style={s.badge}><Text style={s.badgeText}>{missingGroups.length}</Text></View>
          ) : null}
        </TouchableOpacity>
      </View>

      {bellOpen ? (
        <View style={s.bellPanel}>
          <Text style={[s.bellTitle, { fontFamily: fonts.heading }]}>Heute</Text>
          {missingGroups.length === 0 ? (
            <Text style={{ color: theme.mutedText, fontFamily: fonts.body }}>Alles erledigt! 🎉</Text>
          ) : (
            missingGroups.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => { setBellOpen(false); router.push('/(tabs)/attendance'); }}
                style={s.bellItem}
                testID={`bell-group-${g.id}`}
              >
                <View style={[s.dot, { backgroundColor: g.color }]} />
                <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.body }}>{g.name} • {g.time}</Text>
                <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>Eintragen ›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            testID={`tab-${t.key}`}
            onPress={() => router.replace(`/(tabs)/${t.key}`)}
            style={[s.tab, active === t.key && s.tabActive]}
          >
            <Text style={{ fontSize: 14, marginRight: 6 }}>{t.icon}</Text>
            <Text style={[s.tabLabel, { fontFamily: fonts.bodyBold }, active === t.key && { color: theme.primary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  wsName: { fontSize: 22, color: theme.text, maxWidth: 260 },
  wsTrainer: { fontSize: 12, color: theme.mutedText, marginTop: 2 },
  bell: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: theme.primary, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'DMSans_700Bold' },
  bellPanel: { backgroundColor: theme.surface, marginHorizontal: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 8, gap: 8 },
  bellTitle: { fontSize: 16, color: theme.text, marginBottom: 8 },
  bellItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tabs: { maxHeight: 48, marginBottom: 4, flexGrow: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, height: 36 },
  tabActive: { borderColor: theme.primary, backgroundColor: '#fce7ee' },
  tabLabel: { fontSize: 13, color: theme.mutedText },
});
