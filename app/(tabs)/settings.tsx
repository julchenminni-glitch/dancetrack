import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../src/store';
import { theme, fonts } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip } from '../../src/ui';
import { confirm } from '../../src/confirm';
import { exportDb, importDb, resetDb } from '../../src/api';

export default function Settings() {
  const { user, logout, currentWorkspace, updateWorkspace, rewardLevels, addLevel, editLevel, deleteLevel, loadAll, showToast } = useApp();
  const [sheet, setSheet] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isDefault, setIsDefault] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '⭐', threshold: '1', phase: '' });
  const [trainerName, setTrainerName] = useState(currentWorkspace?.trainerName || '');
  const [phaseNames, setPhaseNames] = useState({
    knospe: currentWorkspace?.phaseNames?.knospe || 'Knospenphase',
    bluete: currentWorkspace?.phaseNames?.bluete || 'Blütenphase',
    glueck: currentWorkspace?.phaseNames?.glueck || 'Glückstierchenphase',
  });

  // ===== Backup / Restore =====
  const handleExport = async () => {
    try {
      const json = await exportDb();
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `dancetrack_backup_${ts}.json`;
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-undef
        const blob = new Blob([json], { type: 'application/json' });
        // eslint-disable-next-line no-undef
        const url = URL.createObjectURL(blob);
        // eslint-disable-next-line no-undef
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        // eslint-disable-next-line no-undef
        URL.revokeObjectURL(url);
        showToast('Backup heruntergeladen');
      } else {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Backup teilen' });
        } else {
          Alert.alert('Backup gespeichert', path);
        }
      }
    } catch (e) {
      Alert.alert('Export fehlgeschlagen', e?.message || 'Unbekannter Fehler');
    }
  };

  const handleImport = async () => {
    confirm(
      'Backup einspielen?',
      'Alle aktuellen Daten werden überschrieben.',
      async () => {
        try {
          const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
          if (res.canceled || !res.assets?.[0]) return;
          const asset = res.assets[0];
          let content;
          if (Platform.OS === 'web' && asset.file) {
            content = await asset.file.text();
          } else {
            content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
          }
          await importDb(content);
          await loadAll();
          showToast('Backup eingespielt');
          setTimeout(() => {
            // Re-render outermost state by re-reading workspace
            if (typeof window !== 'undefined' && window.location && Platform.OS === 'web') {
              window.location.reload();
            }
          }, 500);
        } catch (e) {
          Alert.alert('Import fehlgeschlagen', e?.message || 'Datei konnte nicht gelesen werden');
        }
      },
      'Einspielen'
    );
  };

  const handleReset = () => {
    confirm(
      'Alle Daten löschen?',
      'Schüler, Gruppen, Anwesenheit und Stunden werden unwiderruflich entfernt.',
      async () => {
        await resetDb();
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.reload();
        } else {
          await logout();
        }
      },
      'Löschen'
    );
  };

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

  const phaseOptions = useMemo(() => [
    { key: 'none', label: '— Keine —', value: '' },
    { key: 'knospe', label: phaseNames.knospe, value: phaseNames.knospe },
    { key: 'bluete', label: phaseNames.bluete, value: phaseNames.bluete },
    { key: 'glueck', label: phaseNames.glueck, value: phaseNames.glueck },
  ], [phaseNames]);

  const sortedLevels = useMemo(
    () => [...rewardLevels].sort((a, b) => a.threshold - b.threshold),
    [rewardLevels]
  );

  const openCreate = () => {
    setEditId(null);
    setIsDefault(false);
    setForm({ name: '', emoji: '⭐', threshold: '1', phase: '' });
    setSheet(true);
  };
  const openEdit = (lvl) => {
    setEditId(lvl.id);
    setIsDefault(!!lvl.isDefault);
    setForm({ name: lvl.name, emoji: lvl.emoji, threshold: String(lvl.threshold), phase: lvl.phase || '' });
    setSheet(true);
  };
  const save = async () => {
    if (!form.name.trim()) return;
    const body = {
      name: form.name.trim(),
      emoji: form.emoji,
      threshold: parseInt(form.threshold, 10) || 0,
      phase: form.phase,
    };
    setSheet(false);
    if (editId) await editLevel(editId, body);
    else await addLevel(body);
  };
  const removeLevel = (lvl) => {
    confirm('Level löschen?', lvl.name, () => {
      deleteLevel(lvl.id);
      setSheet(false);
    });
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
        <Text style={{ color: theme.mutedText, fontFamily: fonts.body, fontSize: 12, marginBottom: 8 }}>
          Wird auch in den Belohnungs-Levels aktualisiert
        </Text>
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
          <Btn small title="+ Neu" onPress={openCreate} testID="add-level-btn" />
        </View>
        {sortedLevels.map((lvl) => (
          <TouchableOpacity
            key={lvl.id}
            onPress={() => openEdit(lvl)}
            style={s.levelRow}
            testID={`edit-level-${lvl.id}`}
          >
            <Text style={{ fontSize: 22 }}>{lvl.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.lvlName, { fontFamily: fonts.bodyBold }]}>
                {lvl.name}{lvl.isDefault ? ' (Standard)' : ''}
              </Text>
              <Text style={s.lvlSub}>Ab {lvl.threshold} Trainings{lvl.phase ? ` • ${lvl.phase}` : ''}</Text>
            </View>
            <Text style={{ fontSize: 16, color: theme.mutedText }}>›</Text>
          </TouchableOpacity>
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

      <Card>
        <Text style={[s.t, { fontFamily: fonts.heading }]}>💾 Daten & Backup</Text>
        <Text style={{ color: theme.mutedText, fontFamily: fonts.body, fontSize: 12, marginBottom: 10 }}>
          Alle Daten werden lokal auf deinem Gerät gespeichert. Erstelle regelmäßig Backups.
        </Text>
        <View style={{ gap: 8 }}>
          <Btn title="📤 Backup exportieren" variant="secondary" onPress={handleExport} testID="export-backup-btn" />
          <Btn title="📥 Backup einspielen" variant="secondary" onPress={handleImport} testID="import-backup-btn" />
          <Btn title="🗑️  Alle Daten löschen" variant="ghost" onPress={handleReset} testID="reset-data-btn" />
        </View>
      </Card>

      <Btn variant="ghost" title="Abmelden" onPress={() => confirm('Abmelden?', '', logout, 'Abmelden')} testID="logout-btn" />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editId ? 'Level bearbeiten' : 'Neues Level'}>
        <View style={{ gap: 10 }}>
          <Text style={s.lblS}>Emoji</Text>
          <Input testID="level-emoji" value={form.emoji} onChangeText={(v) => setForm({ ...form, emoji: v })} placeholder="🌟" />
          <Text style={s.lblS}>Name</Text>
          <Input testID="level-name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="z.B. Superstar" />
          <Text style={s.lblS}>Trainings-Schwelle</Text>
          <Input testID="level-threshold" value={form.threshold} onChangeText={(v) => setForm({ ...form, threshold: v })} keyboardType="numeric" />
          <Text style={s.lblS}>Phase</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {phaseOptions.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                active={(form.phase || '') === opt.value}
                onPress={() => setForm({ ...form, phase: opt.value })}
              />
            ))}
          </View>
          <Btn title={editId ? 'Speichern' : 'Erstellen'} onPress={save} testID="level-save-btn" />
          {editId && !isDefault ? (
            <Btn
              title="🗑️  Level löschen"
              variant="ghost"
              onPress={() => removeLevel(rewardLevels.find((l) => l.id === editId))}
              testID="level-delete-btn"
            />
          ) : null}
          {editId && isDefault ? (
            <Text style={[s.hint, { fontFamily: fonts.body }]}>Standard-Levels können bearbeitet, aber nicht gelöscht werden.</Text>
          ) : null}
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
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  lvlName: { fontSize: 14, color: theme.text },
  lvlSub: { fontSize: 12, color: theme.mutedText, fontFamily: 'DMSans_400Regular' },
  colorLabel: { fontSize: 11, color: theme.mutedText, marginTop: 4, fontFamily: 'DMSans_400Regular' },
  hint: { fontSize: 12, color: theme.mutedText, textAlign: 'center', marginTop: 4 },
});
