import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, fonts } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip } from '../../src/ui';

const TYPES = [
  { key: 'move', label: 'Schritt', icon: '👣' },
  { key: 'repeat', label: 'Wiederholung', icon: '🔄' },
  { key: 'mirror', label: 'Andere Richtung', icon: '↔️' },
  { key: 'group', label: 'Gruppen', icon: '🪓' },
  { key: 'formation', label: 'Bild/Formation', icon: '📍' },
  { key: 'note', label: 'Notiz', icon: '📝' },
];

const DIRS = [
  { key: '', label: '—' },
  { key: '→', label: 'rechts' },
  { key: '←', label: 'links' },
  { key: '↑', label: 'vor' },
  { key: '↓', label: 'zurück' },
  { key: 'R Arm', label: 'r Arm' },
  { key: 'L Arm', label: 'l Arm' },
  { key: 'R Bein', label: 'r Bein' },
  { key: 'L Bein', label: 'l Bein' },
];

export default function Choreos() {
  const [title, setTitle] = useState('Neue Choreo');
  const [music, setMusic] = useState('');
  const [blocks, setBlocks] = useState<any[]>([
    { id: 'b1', label: '8er 1', lyrics: '', note: '', actions: [] },
  ]);

  const [sheet, setSheet] = useState(false);
  const [blockId, setBlockId] = useState('b1');
  const [form, setForm] = useState<any>({
    start: '1',
    end: '',
    useAnd: false,
    type: 'move',
    direction: '',
    text: '',
    note: '',
  });

  const currentBlock = useMemo(
    () => blocks.find((b) => b.id === blockId) || blocks[0],
    [blocks, blockId]
  );

  const openAction = (bId: string, count = 1) => {
    setBlockId(bId);
    setForm({
      start: String(count),
      end: '',
      useAnd: false,
      type: 'move',
      direction: '',
      text: '',
      note: '',
    });
    setSheet(true);
  };

  const saveAction = () => {
    const action = {
      id: Date.now().toString(),
      start: Number(form.start) || 1,
      end: form.end ? Number(form.end) : Number(form.start) || 1,
      useAnd: form.useAnd,
      type: form.type,
      direction: form.direction,
      text: form.text,
      note: form.note,
    };

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, actions: [...b.actions, action] } : b
      )
    );

    setSheet(false);
  };

  const addBlock = () => {
    const next = blocks.length + 1;
    setBlocks((prev) => [
      ...prev,
      { id: `b${Date.now()}`, label: `8er ${next}`, lyrics: '', note: '', actions: [] },
    ]);
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  };

  const removeAction = (bId: string, actionId: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === bId ? { ...b, actions: b.actions.filter((a: any) => a.id !== actionId) } : b
      )
    );
  };

  const typeFor = (key: string) => TYPES.find((t) => t.key === key) || TYPES[0];

  const actionsForCount = (block: any, count: number) =>
    block.actions.filter(
      (a: any) => !a.useAnd && a.start <= count && a.end >= count
    );

  const andActionsForCount = (block: any, count: number) =>
    block.actions.filter((a: any) => a.useAnd && a.start === count);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Card testID="choreo-header-card" style={undefined}>
          <Text style={[s.pageTitle, { fontFamily: fonts.heading }]}>📝 Choreos</Text>

          <Text style={s.lbl}>Titel</Text>
          <Input
            testID="choreo-title"
            value={title}
            onChangeText={setTitle}
            placeholder="z.B. Showdance 2026"
            multiline={false}
            keyboardType="default"
            secureTextEntry={false}
          />

          <Text style={s.lbl}>Musik</Text>
          <Input
            testID="choreo-music"
            value={music}
            onChangeText={setMusic}
            placeholder="Song / Version / Timestamp"
            multiline={false}
            keyboardType="default"
            secureTextEntry={false}
          />
        </Card>

        {blocks.map((block) => (
          <Card key={block.id} testID={`block-${block.id}`} style={undefined}>
            <View style={s.blockHead}>
              <Text style={[s.blockTitle, { fontFamily: fonts.heading }]}>{block.label}</Text>
              <Btn
                small
                title="+ Aktion"
                onPress={() => openAction(block.id, 1)}
                testID={`add-action-${block.id}`}
                disabled={false}
                icon={null}
              />
            </View>

            <Text style={s.lbl}>Lyrics / Musikstelle für diesen 8er</Text>
            <Input
              testID={`lyrics-${block.id}`}
              value={block.lyrics}
              onChangeText={(v: string) => updateBlock(block.id, { lyrics: v })}
              placeholder='z.B. "I wanna dance..."'
              multiline={false}
              keyboardType="default"
              secureTextEntry={false}
            />

            <View style={s.grid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => {
                const acts = actionsForCount(block, count);
                const andActs = andActionsForCount(block, count);

                return (
                  <TouchableOpacity
                    key={count}
                    style={s.countCol}
                    onPress={() => openAction(block.id, count)}
                    testID={`count-${block.id}-${count}`}
                  >
                    <View style={s.countBox}>
                      <Text style={s.countNum}>{count}</Text>
                      {acts.slice(0, 2).map((a: any) => (
                        <Text key={a.id} numberOfLines={2} style={s.actionMini}>
                          {typeFor(a.type).icon} {a.direction} {a.text}
                        </Text>
                      ))}
                    </View>

                    <View style={s.andBox}>
                      <Text style={s.andNum}>{count}&</Text>
                      {andActs.slice(0, 1).map((a: any) => (
                        <Text key={a.id} numberOfLines={1} style={s.andText}>
                          {a.direction} {a.text}
                        </Text>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.section}>Aktionen</Text>
            {block.actions.length === 0 ? (
              <Text style={s.empty}>Noch keine Schritte. Tippe auf einen Count oder „+ Aktion“.</Text>
            ) : (
              block.actions.map((a: any) => (
                <TouchableOpacity
                  key={a.id}
                  style={s.actionRow}
                  onLongPress={() => removeAction(block.id, a.id)}
                  testID={`action-${a.id}`}
                >
                  <Text style={s.actionRange}>
                    {a.useAnd ? `${a.start}&` : a.start === a.end ? a.start : `${a.start}-${a.end}`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.actionText}>
                      {typeFor(a.type).icon} {a.direction ? `${a.direction} ` : ''}
                      {a.text || typeFor(a.type).label}
                    </Text>
                    {a.note ? <Text style={s.note}>{a.note}</Text> : null}
                  </View>
                  <Text style={s.deleteHint}>lange drücken</Text>
                </TouchableOpacity>
              ))
            )}

            <Text style={s.lbl}>Notizen / Unterüberschrift</Text>
            <Input
              testID={`note-${block.id}`}
              value={block.note}
              onChangeText={(v: string) => updateBlock(block.id, { note: v })}
              placeholder="z.B. Formation V, Gruppe B verzögert"
              multiline
              keyboardType="default"
              secureTextEntry={false}
            />
          </Card>
        ))}

        <Btn
          title="+ Neuer 8er-Block"
          onPress={addBlock}
          testID="add-block-btn"
          disabled={false}
          icon={null}
          small={false}
        />

        <View style={{ height: 80 }} />
      </ScrollView>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Aktion hinzufügen"
        testID="action-sheet"
      >
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Count</Text>
          <Input
            testID="action-start"
            value={form.start}
            onChangeText={(v: string) => setForm({ ...form, start: v })}
            placeholder="1"
            multiline={false}
            keyboardType="numeric"
            secureTextEntry={false}
          />

          <Text style={s.lbl}>Bis Count optional, z.B. 4 für 1–4</Text>
          <Input
            testID="action-end"
            value={form.end}
            onChangeText={(v: string) => setForm({ ...form, end: v })}
            placeholder="leer lassen für einzelner Count"
            multiline={false}
            keyboardType="numeric"
            secureTextEntry={false}
          />

          <Text style={s.lbl}>Zwischen-Count</Text>
          <Chip
            label="& Count"
            active={form.useAnd}
            onPress={() => setForm({ ...form, useAnd: !form.useAnd })}
            color={theme.primary}
          />

          <Text style={s.lbl}>Typ</Text>
          <View style={s.chips}>
            {TYPES.map((t) => (
              <Chip
                key={t.key}
                label={`${t.icon} ${t.label}`}
                active={form.type === t.key}
                onPress={() => setForm({ ...form, type: t.key })}
                color={theme.primary}
              />
            ))}
          </View>

          <Text style={s.lbl}>Richtung</Text>
          <View style={s.chips}>
            {DIRS.map((d) => (
              <Chip
                key={d.key || 'none'}
                label={`${d.key} ${d.label}`}
                active={form.direction === d.key}
                onPress={() => setForm({ ...form, direction: d.key })}
                color={theme.secondary || theme.primary}
              />
            ))}
          </View>

          <Text style={s.lbl}>Schritt / Aktion</Text>
          <Input
            testID="action-text"
            value={form.text}
            onChangeText={(v: string) => setForm({ ...form, text: v })}
            placeholder="z.B. Slide rechts"
            multiline={false}
            keyboardType="default"
            secureTextEntry={false}
          />

          <Text style={s.lbl}>Erklärung / Notiz</Text>
          <Input
            testID="action-note"
            value={form.note}
            onChangeText={(v: string) => setForm({ ...form, note: v })}
            placeholder="z.B. tief bleiben, Blick nach vorne"
            multiline
            keyboardType="default"
            secureTextEntry={false}
          />

          <Btn
            title="Speichern"
            onPress={saveAction}
            testID="save-action-btn"
            disabled={!form.text.trim()}
            icon={null}
            small={false}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  pageTitle: { fontSize: 22, color: theme.text, marginBottom: 8 },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: 18, color: theme.text },
  lbl: { fontSize: 12, color: theme.mutedText, marginTop: 8, fontFamily: 'DMSans_700Bold' },
  grid: { flexDirection: 'row', marginTop: 12, gap: 4 },
  countCol: { flex: 1 },
  countBox: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    borderRadius: 10,
    padding: 5,
    alignItems: 'center',
  },
  countNum: { color: theme.primary, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  actionMini: { fontSize: 9, color: theme.text, textAlign: 'center', marginTop: 3 },
  andBox: { minHeight: 36, alignItems: 'center', paddingTop: 4 },
  andNum: { fontSize: 9, color: theme.mutedText },
  andText: { fontSize: 9, color: theme.text, textAlign: 'center' },
  section: { marginTop: 14, marginBottom: 4, color: theme.text, fontFamily: 'DMSans_700Bold' },
  empty: { color: theme.mutedText, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  actionRange: { width: 42, color: theme.primary, fontFamily: 'DMSans_700Bold' },
  actionText: { color: theme.text, fontSize: 13, fontFamily: 'DMSans_700Bold' },
  note: { color: theme.mutedText, fontSize: 11, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  deleteHint: { color: theme.mutedText, fontSize: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});