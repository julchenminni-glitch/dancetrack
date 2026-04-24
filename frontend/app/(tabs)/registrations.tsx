import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';
import { Card, EmptyState, Avatar } from '../../src/ui';

export default function Registrations() {
  const { students, groups, editStudent } = useApp();
  const registered = students.filter((s) => s.isRegistered).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Card>
        <Text style={[s.stat, { fontFamily: fonts.heading }]}>{registered}/{students.length}</Text>
        <Text style={{ color: theme.mutedText, fontFamily: fonts.body }}>Angemeldete Schüler</Text>
      </Card>
      {students.length === 0 ? <EmptyState emoji="✅" title="Keine Schüler" /> : students.map((st) => {
        const grp = groups.find((g) => g.id === st.groupId);
        return (
          <TouchableOpacity
            key={st.id}
            onPress={() => editStudent(st.id, { isRegistered: !st.isRegistered })}
            testID={`toggle-reg-${st.id}`}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={st.name} photo={st.photoUrl} size={40} bgColor={grp?.color} />
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { fontFamily: fonts.bodyBold }]}>{st.name}</Text>
                <Text style={s.sub}>{grp?.name}</Text>
              </View>
              <View style={[s.check, st.isRegistered && { backgroundColor: theme.accentGreen, borderColor: theme.accentGreen }]}>
                {st.isRegistered ? <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold' }}>✓</Text> : null}
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  stat: { fontSize: 32, color: theme.primary, marginBottom: 4 },
  name: { fontSize: 15, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
});
