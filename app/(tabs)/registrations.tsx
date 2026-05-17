import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';
import { Card, EmptyState, Avatar } from '../../src/ui';

export default function Registrations() {
  const { students, groups, editStudent } = useApp();

  const groupById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
  const pending = useMemo(
    () => students.filter((st) => !st.isRegistered).sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  );
  const registeredCount = students.length - pending.length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} removeClippedSubviews>
      <Card>
        <Text style={[s.stat, { fontFamily: fonts.heading }]}>{registeredCount}/{students.length}</Text>
        <Text style={{ color: theme.mutedText, fontFamily: fonts.body }}>Bereits angemeldet</Text>
      </Card>
      {students.length === 0 ? (
        <EmptyState emoji="✅" title="Keine Mitglieder" />
      ) : pending.length === 0 ? (
        <EmptyState emoji="🎉" title="Alle angemeldet" subtitle="Alle Mitglieder sind eingetragen" />
      ) : (
        pending.map((st) => {
          const grp = groupById[st.groupId];
          return (
            <TouchableOpacity
              key={st.id}
              onPress={() => editStudent(st.id, { isRegistered: true })}
              testID={`toggle-reg-${st.id}`}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={st.name} photo={st.photoUrl} size={40} bgColor={grp?.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { fontFamily: fonts.bodyBold }]}>{st.name}</Text>
                  <Text style={s.sub}>{grp?.name || '—'}</Text>
                </View>
                <View style={s.check} />
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  stat: { fontSize: 32, color: theme.primary, marginBottom: 4 },
  name: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
});
