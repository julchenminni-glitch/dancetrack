import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel, calcAge } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState, Avatar } from '../../src/ui';

const empty = { name: '', birthday: '', phone: '', photoUrl: '', groupId: '', isRegistered: false };

export default function Students() {
  const { students, groups, attendance, rewardLevels, addStudent, editStudent, deleteStudent } = useApp();
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filterGroup, setFilterGroup] = useState('all');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Berechtigung fehlt', 'Bitte erlaube den Zugriff auf die Galerie.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.4, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setForm((f) => ({ ...f, photoUrl: `data:image/jpeg;base64,${a.base64}` }));
    }
  };

  const open = (st) => {
    if (st) { setForm({ name: st.name, birthday: st.birthday || '', phone: st.phone || '', photoUrl: st.photoUrl || '', groupId: st.groupId, isRegistered: st.isRegistered }); setEditId(st.id); }
    else { setForm({ ...empty, groupId: groups[0]?.id || '' }); setEditId(null); }
    setSheet(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.groupId) { Alert.alert('Bitte Name & Gruppe wählen'); return; }
    if (editId) await editStudent(editId, form); else await addStudent(form);
    setSheet(false);
  };

  const del = (st) => Alert.alert('Löschen?', `${st.name} entfernen?`, [{ text: 'Abbrechen' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteStudent(st.id) }]);

  const filtered = filterGroup === 'all' ? students : students.filter((st) => st.groupId === filterGroup);
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }} style={{ flexGrow: 0 }}>
        <Chip label="Alle" active={filterGroup === 'all'} onPress={() => setFilterGroup('all')} />
        {groups.map((g) => <Chip key={g.id} label={g.name} active={filterGroup === g.id} onPress={() => setFilterGroup(g.id)} color={g.color} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        {sorted.length === 0 ? <EmptyState emoji="👥" title="Keine Schüler" subtitle="Füge Schüler zu deinen Gruppen hinzu" /> : sorted.map((st) => {
          const count = attendance.filter((a) => a.studentId === st.id && a.status === 'Present').length;
          const lvl = getCurrentLevel(count, rewardLevels);
          const grp = groups.find((g) => g.id === st.groupId);
          const age = calcAge(st.birthday);
          return (
            <TouchableOpacity key={st.id} onPress={() => open(st)} testID={`student-card-${st.id}`}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar photo={st.photoUrl} name={st.name} size={48} badgeEmoji={lvl?.emoji} bgColor={grp?.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { fontFamily: fonts.heading }]}>{st.name}</Text>
                  <Text style={s.sub}>{grp?.name || '—'}{age ? ` • ${age}J` : ''} • {count}x dabei</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {st.isRegistered ? <Text style={s.pill}>✓ Angemeldet</Text> : <Text style={[s.pill, { backgroundColor: '#fde2e9', color: '#c05778' }]}>Offen</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => del(st)} testID={`delete-student-${st.id}`}><Text style={{ fontSize: 20 }}>🗑️</Text></TouchableOpacity>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={s.fab}><Btn title="+ Neuer Schüler" onPress={() => open(null)} testID="add-student-btn" /></View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editId ? 'Schüler bearbeiten' : 'Neuer Schüler'}>
        <View style={{ gap: 10 }}>
          <TouchableOpacity onPress={pickImage} style={{ alignSelf: 'center' }} testID="photo-pick-btn">
            {form.photoUrl ? <Image source={{ uri: form.photoUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : (
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={{ color: theme.mutedText, fontSize: 11, fontFamily: fonts.body }}>Foto</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={s.lbl}>Name</Text>
          <Input testID="student-name-input" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <Text style={s.lbl}>Geburtstag (YYYY-MM-DD)</Text>
          <Input testID="student-birthday-input" value={form.birthday} onChangeText={(v) => setForm({ ...form, birthday: v })} placeholder="2015-08-20" />
          <Text style={s.lbl}>Telefon</Text>
          <Input testID="student-phone-input" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          <Text style={s.lbl}>Gruppe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {groups.map((g) => <Chip key={g.id} label={g.name} active={form.groupId === g.id} onPress={() => setForm({ ...form, groupId: g.id })} color={g.color} />)}
          </View>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }} onPress={() => setForm({ ...form, isRegistered: !form.isRegistered })}>
            <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.body }}>Angemeldet</Text>
            <View style={[{ width: 44, height: 24, borderRadius: 12, backgroundColor: theme.border, justifyContent: 'center' }, form.isRegistered && { backgroundColor: theme.primary }]}>
              <View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginLeft: 2, position: 'absolute' }, form.isRegistered && { left: 22 }]} />
            </View>
          </TouchableOpacity>
          <Btn testID="student-save-btn" title={editId ? 'Speichern' : 'Hinzufügen'} onPress={save} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 16, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  pill: { fontSize: 11, backgroundColor: '#e4f2e9', color: '#5b8a72', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontFamily: 'DMSans_700Bold' },
  fab: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 4 },
});
