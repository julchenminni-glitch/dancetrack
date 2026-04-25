import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, Platform, Modal, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../src/store';
import { theme, fonts, getCurrentLevel, getNextLevel, calcAge, formatDate, parseGermanDate } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState, Avatar, ProgressBar } from '../../src/ui';
import { confirm } from '../../src/confirm';

const empty = { name: '', birthday: '', phone: '', photoUrl: '', groupId: '', isRegistered: false };

export default function Students() {
  const params = useLocalSearchParams();
  const { students, groups, attendance, rewardLevels, addStudent, editStudent, deleteStudent } = useApp();
  const [sheet, setSheet] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filterGroup, setFilterGroup] = useState('all');
  const [sortBy, setSortBy] = useState('alpha'); // alpha | age | level
  const [photoView, setPhotoView] = useState(null); // { uri, name }

  // Auto-open student detail when navigated with openId
  useEffect(() => {
    if (params.openId) {
      const st = students.find((s) => s.id === params.openId);
      if (st) setDetail(st);
    }
  }, [params.openId, students]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Berechtigung fehlt', 'Erlaube Galerie-Zugriff in den Einstellungen.'); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    let photoUrl = '';
    if (a.base64) {
      photoUrl = `data:image/jpeg;base64,${a.base64}`;
    } else if (a.uri?.startsWith('data:')) {
      photoUrl = a.uri;
    } else if (a.uri) {
      // Web blob URL → downscale to <=512px and convert to compressed JPEG base64
      try {
        photoUrl = await new Promise((resolve, reject) => {
          // eslint-disable-next-line no-undef
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const max = 512;
            let w = img.width, h = img.height;
            if (w > h && w > max) { h = (h * max) / w; w = max; }
            else if (h > max) { w = (w * max) / h; h = max; }
            // eslint-disable-next-line no-undef
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = a.uri;
        });
      } catch (e) {
        Alert.alert('Fehler', 'Foto konnte nicht verarbeitet werden.');
        return;
      }
    }
    if (photoUrl) setForm((f) => ({ ...f, photoUrl }));
  };

  const openNew = () => { setForm({ ...empty, groupId: groups[0]?.id || '' }); setEditId(null); setDetail(null); setSheet(true); };
  const openEdit = (st) => {
    setForm({ name: st.name, birthday: st.birthday ? formatDate(st.birthday) : '', phone: st.phone || '', photoUrl: st.photoUrl || '', groupId: st.groupId, isRegistered: st.isRegistered });
    setEditId(st.id);
    setDetail(null);
    setSheet(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.groupId) { Alert.alert('Bitte Name & Gruppe wählen'); return; }
    const payload = { ...form, birthday: parseGermanDate(form.birthday) };
    if (editId) await editStudent(editId, payload); else await addStudent(payload);
    setSheet(false);
  };

  const del = (st) => confirm('Löschen?', `${st.name} entfernen?`, () => { deleteStudent(st.id); setDetail(null); });

  const filtered = filterGroup === 'all' ? students : students.filter((st) => st.groupId === filterGroup);
  const studentCount = (id) => attendance.filter((a) => a.studentId === id && a.status === 'Present').length;
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'age') {
      const aA = calcAge(a.birthday) ?? 999;
      const bA = calcAge(b.birthday) ?? 999;
      return aA - bA;
    }
    if (sortBy === 'level') return studentCount(b.id) - studentCount(a.id);
    return a.name.localeCompare(b.name);
  });

  const detailData = detail ? (() => {
    const count = studentCount(detail.id);
    const cur = getCurrentLevel(count, rewardLevels);
    const next = getNextLevel(count, rewardLevels);
    const grp = groups.find((g) => g.id === detail.groupId);
    const progress = next && cur ? (count - cur.threshold) / (next.threshold - cur.threshold) : 1;
    return { count, cur, next, grp, progress };
  })() : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6 }} style={{ flexGrow: 0 }}>
        <Chip label="Alle" active={filterGroup === 'all'} onPress={() => setFilterGroup('all')} />
        {groups.map((g) => <Chip key={g.id} label={g.name} active={filterGroup === g.id} onPress={() => setFilterGroup(g.id)} color={g.color} />)}
      </ScrollView>
      <View style={s.sortBar}>
        <Text style={s.sortLabel}>Sortieren:</Text>
        <Chip label="A-Z" active={sortBy === 'alpha'} onPress={() => setSortBy('alpha')} />
        <Chip label="Alter" active={sortBy === 'age'} onPress={() => setSortBy('age')} />
        <Chip label="🏆 Level" active={sortBy === 'level'} onPress={() => setSortBy('level')} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        {sorted.length === 0 ? <EmptyState emoji="👥" title="Keine Schüler" subtitle="Füge Schüler zu deinen Gruppen hinzu" /> : sorted.map((st) => {
          const count = studentCount(st.id);
          const lvl = getCurrentLevel(count, rewardLevels);
          const grp = groups.find((g) => g.id === st.groupId);
          const age = calcAge(st.birthday);
          return (
            <TouchableOpacity key={st.id} onPress={() => setDetail(st)} testID={`student-card-${st.id}`}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar photo={st.photoUrl} name={st.name} size={48} badgeEmoji={lvl?.emoji} bgColor={grp?.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { fontFamily: fonts.heading }]}>{st.name}</Text>
                  <Text style={s.sub}>{grp?.name || '—'}{age != null ? ` • ${age}J` : ''} • {count}x dabei</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {st.isRegistered ? <Text style={s.pill}>✓ Angemeldet</Text> : <Text style={[s.pill, { backgroundColor: '#fde2e9', color: '#c05778' }]}>Offen</Text>}
                    {lvl ? <Text style={{ fontSize: 14 }}>{lvl.emoji} <Text style={{ fontSize: 11, color: theme.mutedText, fontFamily: 'DMSans_400Regular' }}>{lvl.name}</Text></Text> : null}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={s.fab}><Btn title="+ Neuer Schüler" onPress={openNew} testID="add-student-btn" /></View>

      {/* Detail Sheet */}
      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.name || ''}>
        {detailData && detail ? (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Avatar photo={detail.photoUrl} name={detail.name} size={96} bgColor={detailData.grp?.color} />
              <Text style={{ fontSize: 32 }}>{detailData.cur?.emoji || '🌱'}</Text>
              <Text style={[s.lvlName, { fontFamily: fonts.heading }]}>{detailData.cur?.name || '—'}</Text>
            </View>
            <Card style={{ padding: 14, gap: 8 }}>
              <Text style={[s.infoLbl, { fontFamily: fonts.bodyBold }]}>Trainings besucht</Text>
              <Text style={[s.bigNum, { fontFamily: fonts.heading }]}>{detailData.count}</Text>
              {detailData.next ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.sub}>{detailData.count} Trainings</Text>
                    <Text style={s.sub}>Nächstes: {detailData.next.emoji} {detailData.next.name} ({detailData.next.threshold})</Text>
                  </View>
                  <ProgressBar progress={detailData.progress} />
                  <Text style={[s.sub, { textAlign: 'center', marginTop: 4 }]}>Noch {detailData.next.threshold - detailData.count} Training{detailData.next.threshold - detailData.count === 1 ? '' : 's'} bis zum nächsten Level</Text>
                </>
              ) : <Text style={[s.sub, { textAlign: 'center' }]}>🎉 Maximales Level erreicht!</Text>}
            </Card>
            <Card style={{ padding: 14, gap: 6 }}>
              <View style={s.infoRow}><Text style={s.infoLbl}>Gruppe</Text><Text style={s.infoVal}>{detailData.grp?.name || '—'}</Text></View>
              <View style={s.infoRow}><Text style={s.infoLbl}>Alter</Text><Text style={s.infoVal}>{calcAge(detail.birthday) != null ? `${calcAge(detail.birthday)} Jahre` : '—'}</Text></View>
              <View style={s.infoRow}><Text style={s.infoLbl}>Geburtstag</Text><Text style={s.infoVal}>{formatDate(detail.birthday) || '—'}</Text></View>
              <View style={s.infoRow}><Text style={s.infoLbl}>Telefon</Text><Text style={s.infoVal}>{detail.phone || '—'}</Text></View>
              <View style={s.infoRow}><Text style={s.infoLbl}>Anmeldestatus</Text><Text style={s.infoVal}>{detail.isRegistered ? '✓ Angemeldet' : 'Offen'}</Text></View>
            </Card>
            <Btn title="✏️ Bearbeiten" onPress={() => openEdit(detail)} testID="student-edit-btn" />
            <Btn title="🗑️ Löschen" variant="danger" onPress={() => del(detail)} testID="student-delete-btn" />
          </View>
        ) : null}
      </Sheet>

      {/* Edit/New Sheet */}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editId ? 'Schüler bearbeiten' : 'Neuer Schüler'}>        <View style={{ gap: 10 }}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={pickImage} testID="photo-pick-btn">
              {form.photoUrl ? <Image source={{ uri: form.photoUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : (
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: theme.mutedText, fontSize: 11, fontFamily: fonts.body }}>Foto wählen</Text>
                </View>
              )}
            </TouchableOpacity>
            {form.photoUrl ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small testID="photo-change-btn" title="📷 Anderes Foto" variant="secondary" onPress={pickImage} />
                {editId ? (
                  <Btn small testID="photo-save-btn" title="💾 Foto speichern" onPress={async () => { await editStudent(editId, { photoUrl: form.photoUrl }); }} />
                ) : null}
                <Btn small testID="photo-remove-btn" title="✕" variant="ghost" onPress={() => setForm((f) => ({ ...f, photoUrl: '' }))} />
              </View>
            ) : null}
          </View>
          <Text style={s.lbl}>Name</Text>
          <Input testID="student-name-input" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <Text style={s.lbl}>Geburtstag (TT.MM.JJJJ)</Text>
          <Input testID="student-birthday-input" value={form.birthday} onChangeText={(v) => setForm({ ...form, birthday: v })} placeholder="20.08.2015" />
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

      {/* Fullscreen Photo Viewer */}
      <Modal visible={!!photoView} transparent animationType="fade" onRequestClose={() => setPhotoView(null)} statusBarTranslucent>
        <Pressable style={s.photoBg} onPress={() => setPhotoView(null)} testID="photo-viewer-bg">
          {photoView ? (
            <>
              <Image source={{ uri: photoView.uri }} style={s.photoLarge} resizeMode="contain" />
              <Text style={[s.photoName, { fontFamily: fonts.heading }]}>{photoView.name}</Text>
              <TouchableOpacity onPress={() => setPhotoView(null)} style={s.photoClose} testID="photo-viewer-close">
                <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 16, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  pill: { fontSize: 11, backgroundColor: '#e4f2e9', color: '#5b8a72', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontFamily: 'DMSans_700Bold' },
  fab: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 4 },
  sortBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, flexWrap: 'wrap' },
  sortLabel: { fontSize: 12, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginRight: 8, marginBottom: 8 },
  lvlName: { fontSize: 22, color: theme.text },
  infoLbl: { fontSize: 12, color: theme.mutedText, fontFamily: 'DMSans_700Bold' },
  infoVal: { fontSize: 14, color: theme.text, fontFamily: 'DMSans_400Regular' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  bigNum: { fontSize: 36, color: theme.primary, textAlign: 'center' },
  zoomBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.surface, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  photoBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  photoLarge: { width: '100%', height: '80%' },
  photoName: { color: '#fff', fontSize: 22, marginTop: 16, textAlign: 'center' },
  photoClose: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
});
