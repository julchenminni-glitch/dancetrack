import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';
import { Btn, Input, Sheet, Card } from '../../src/ui';
import { confirm } from '../../src/confirm';

export default function Settings() {
  const { user, logout, currentWorkspace, updateWorkspace, rewardLevels, addLevel, deleteLevel } = useApp();
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '⭐', threshold: '1', phase: '' });
  const [trainerName, setTrainerName] = useState(currentWorkspace?.trainerName || '');
  const [phaseNames, setPhaseNames] = useState({
    knospe: currentWorkspace?.phaseNames?.knospe || 'Knospenphase',
    bluete: currentWorkspace?.phaseNames?.bluete || 'Blütenphase',
    glueck: currentWorkspace?.phaseNames?.glueck || 'Glückstierchenphase',
  });

  useEffect(() => {
    if (currentWorkspace) {
      setTrainerName(currentWorkspace.trainerName || '');
      setPhaseNames({
        knospe: currentWorkspace.phaseNames?.knospe || 'Knospenphase',
        bluete: currentWorkspace.phaseNames?.bluete || 'Blütenphase',
        glueck: currentWorkspace.phaseNames?.glueck || 'Glückstierchenphase',
      });
    }
  }, [currentWorkspace]);

  const save = async () => {
    if (!form.name.trim()) return;
    await addLevel({ name: form.name, emoji: form.emoji, threshold: parseInt(form.threshold, 10) || 0, phase: form.phase });
    setSheet(false);
    setForm({ name: '', emoji: '⭐', threshold: '1', phase: '' });
  };

  const savePhases = async () => {
    await updateWorkspace(currentWorkspace.id, { phaseNames });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}>
      <Card>
        <Text style={[s.t, { fontFamily: fonts.heading }]}>Konto</Text>
        <Text style={s.lbl}>E-Mail</Text>
        <Text style={s.val}>{user?.email}</Text>
        <Text style={s.lbl}>Trainer-Name</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Input testID="trainer-name-input" value={trainerName} onChangeText={setTrainerName} /></View>
          <Btn small title="✓" onPress={() => updateWorkspace(currentWorkspace.id, { trainerName })} testID="save-trainer-btn" />
        </View>
      </Card>

      <Card>
        <Text style={[s.t, { fontFamily: fonts.heading }]}>Phasen-Namen</Text>
        <Text style={{ color: theme.mutedText, fontFamily: fonts.body, fontSize: 12, marginBottom: 8 }}>Werden in der Awards-Übersicht verwendet</Text>
        <Text style={s.lbl}>Phase 1 (Standard: Knospenphase)</Text>
        <Input testID="phase-knospe" value={phaseNames.knospe} onChangeText={(v) => setPhaseNames({ ...phaseNames, knospe: v })} />
        <Text style={s.lbl}>Phase 2 (Standard: Blütenphase)</Text>
        <Input testID="phase-bluete" value={phaseNames.bluete} onChangeText={(v) => setPhaseNames({ ...phaseNames, bluete: v })} />
        <Text style={s.lbl}>Phase 3 (Standard: Glückstierchenphase)</Text>
        <Input testID="phase-glueck" value={phaseNames.glueck} onChangeText={(v) => setPhaseNames({ ...phaseNames, glueck: v })} />
        <View style={{ height: 10 }} />
        <Btn title="Phasen speichern" onPress={savePhases} testID="save-phases-btn" />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[s.t, { fontFamily: fonts.heading }]}>Belohnungs-Levels</Text>
          <Btn small title="+ Neu" onPress={() => setSheet(true)} testID="add-level-btn" />
        </View>
        {rewardLevels.sort((a, b) => a.threshold - b.threshold).map((lvl) => (
          <View key={lvl.id} style={s.levelRow}>
            <Text style={{ fontSize: 22 }}>{lvl.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]}>{lvl.name}{lvl.isDefault ? ' (Standard)' : ''}</Text>
              <Text style={s.lvlSub}>Ab {lvl.threshold} Trainings{lvl.phase ? ` • ${lvl.phase}` : ''}</Text>
            </View>
            {!lvl.isDefault ? (
              <TouchableOpacity onPress={() => confirm('Level löschen?', lvl.name, () => deleteLevel(lvl.id))}>
                <Text style={{ fontSize: 16, color: theme.mutedText }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[s.t, { fontFamily: fonts.heading }]}>Farb-Palette</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {[{ n: 'Primär', c: theme.primary }, { n: 'Sekundär', c: theme.secondary }, { n: 'Grün', c: theme.accentGreen }, { n: 'Lila', c: theme.accentPurple }, { n: 'Gold', c: theme.accentGold }].map((x) => (
            <View key={x.n} style={{ alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: x.c }} />
              <Text style={s.colorLabel}>{x.n}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Btn variant="ghost" title="Abmelden" onPress={() => confirm('Abmelden?', '', logout, 'Abmelden')} testID="logout-btn" />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Neues Level">
        <View style={{ gap: 10 }}>
          <Text style={s.lblS}>Emoji</Text>
          <Input testID="level-emoji" value={form.emoji} onChangeText={(v) => setForm({ ...form, emoji: v })} placeholder="🌟" />
          <Text style={s.lblS}>Name</Text>
          <Input testID="level-name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="z.B. Superstar" />
          <Text style={s.lblS}>Trainings-Schwelle</Text>
          <Input testID="level-threshold" value={form.threshold} onChangeText={(v) => setForm({ ...form, threshold: v })} keyboardType="numeric" />
          <Text style={s.lblS}>Phase (optional)</Text>
          <Input value={form.phase} onChangeText={(v) => setForm({ ...form, phase: v })} />
          <Btn title="Erstellen" onPress={save} testID="level-save-btn" />
        </View>
      </Sheet>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  t: { fontSize: 18, color: theme.text, marginBottom: 8 },
  lbl: { fontSize: 12, color: theme.mutedText, marginTop: 10, fontFamily: 'DMSans_700Bold' },
  lblS: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold' },
  val: { fontSize: 15, color: theme.text, fontFamily: 'DMSans_400Regular', marginTop: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lvlName: { fontSize: 14, color: theme.text },
  lvlSub: { fontSize: 12, color: theme.mutedText, fontFamily: 'DMSans_400Regular' },
  colorLabel: { fontSize: 11, color: theme.mutedText, marginTop: 4, fontFamily: 'DMSans_400Regular' },
});
