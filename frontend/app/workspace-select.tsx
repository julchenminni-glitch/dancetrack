import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../src/store';
import { theme, fonts } from '../src/theme';
import { Btn, Input, Card, Sheet, EmptyState } from '../src/ui';

export default function WorkspaceSelect() {
  const { workspaces, createWorkspace, setWorkspaceId, deleteWorkspace, logout, user } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [trainer, setTrainer] = useState(user?.name || '');

  const create = async () => {
    if (!name.trim() || !trainer.trim()) return;
    await createWorkspace(name.trim(), trainer.trim());
    setShowCreate(false);
    setName('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { fontFamily: fonts.body }]}>Hallo {user?.name} 👋</Text>
            <Text style={[s.title, { fontFamily: fonts.heading }]}>Wähle deinen Workspace</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Abmelden?', '', [{ text: 'Abbrechen' }, { text: 'Ja', onPress: logout }])} testID="logout-btn">
            <Text style={{ color: theme.mutedText, fontFamily: fonts.bodyBold }}>Abmelden</Text>
          </TouchableOpacity>
        </View>

        {workspaces.length === 0 ? (
          <EmptyState emoji="✨" title="Noch kein Workspace" subtitle="Erstelle deinen ersten Workspace, um loszulegen" />
        ) : (
          <View style={{ gap: 12 }}>
            {workspaces.map((w) => (
              <TouchableOpacity key={w.id} testID={`workspace-${w.id}`} onPress={() => setWorkspaceId(w.id)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[s.avatar, { backgroundColor: theme.primary }]}><Text style={{ color: '#fff', fontSize: 22, fontFamily: fonts.heading }}>{w.name.charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.wsName, { fontFamily: fonts.heading }]}>{w.name}</Text>
                    <Text style={[s.wsSub, { fontFamily: fonts.body }]}>Trainer: {w.trainerName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Workspace löschen?', `"${w.name}" und alle Daten werden entfernt.`, [{ text: 'Abbrechen' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteWorkspace(w.id) }])}
                    testID={`delete-ws-${w.id}`}
                  >
                    <Text style={{ fontSize: 22 }}>🗑️</Text>
                  </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
        <Btn title="+ Neuen Workspace erstellen" onPress={() => setShowCreate(true)} testID="create-workspace-btn" />
      </ScrollView>

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Neuer Workspace">
        <View style={{ gap: 12 }}>
          <Text style={s.label}>Workspace-Name</Text>
          <Input testID="ws-name-input" value={name} onChangeText={setName} placeholder="z.B. Hip Hop Kids" />
          <Text style={s.label}>Trainer-Name</Text>
          <Input testID="ws-trainer-input" value={trainer} onChangeText={setTrainer} placeholder="Dein Name" />
          <View style={{ height: 12 }} />
          <Btn testID="ws-create-submit" title="Erstellen" onPress={create} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 14, color: theme.mutedText },
  title: { fontSize: 30, color: theme.text, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  wsName: { fontSize: 18, color: theme.text },
  wsSub: { fontSize: 13, color: theme.mutedText, marginTop: 2 },
  label: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold' },
});
