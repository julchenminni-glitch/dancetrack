import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../src/store';
import { theme, fonts, EVENT_TYPES } from '../../src/theme';
import { Btn, Input, Sheet, Card, Chip, EmptyState, Avatar } from '../../src/ui';
import { confirm } from '../../src/confirm';

const STATUS = [
  { key: 'Present', label: 'Anwesend', emoji: '🪩', color: '#bffcc6' },
  { key: 'Excused', label: 'Entschuldigt', emoji: '🌴', color: '#fff5ba' },
  { key: 'Absent', label: 'Fehlend', emoji: '👻', color: '#ffabab' },
];
type StatusKey = 'Present' | 'Excused' | 'Absent';
const STATUS_MAP: Record<StatusKey, typeof STATUS[0]> = { Present: STATUS[0], Excused: STATUS[1], Absent: STATUS[2] };

// EVENT_TYPES may not include a color field in its type; coerce to any to safely apply a default color
const EVENT_TYPES_WITH_COLORS = EVENT_TYPES.map((t: any) => ({ ...t, color: (t as any).color || theme.primary }));

// Memoized event row to avoid re-rendering all cards on small state changes
const EventCard = memo(function EventCard({
  ev,
  group,
  eventType,
  presentCount,
  totalGroupSize,
  onPress,
}: any) {
  return (
    <Card style={{}} testID={`event-${ev.id}`}>
      <TouchableOpacity onPress={onPress}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>{eventType?.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { fontFamily: fonts.heading }]}>{group?.name || '—'} • {eventType?.label}</Text>
            <Text style={s.sub}>{new Date(ev.date).toLocaleDateString('de-DE')} • {presentCount}/{totalGroupSize} anwesend</Text>
          </View>
          <Text style={{ color: theme.mutedText, fontSize: 16 }}>›</Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
});

export default function Attendance() {
  const { groups, students, events, attendance, saveAttendance, deleteEvent } = useApp();
  const [sheet, setSheet] = useState(false);
  const [type, setType] = useState('Training');
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, StatusKey>>({});

  const [detailEventId, setDetailEventId] = useState(null);

  // ===== Memoized indices for performance =====
  const groupById = useMemo(() => Object.fromEntries(groups.map((g: any) => [g.id, g])), [groups]);
  const studentsByGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    students.forEach((st: any) => { (map[st.groupId] ||= []).push(st); });
    return map;
  }, [students]);
  const studentById = useMemo(() => Object.fromEntries(students.map((st: any) => [st.id, st])), [students]);
  const attendanceByEvent = useMemo(() => {
    const map: Record<string, any[]> = {};
    attendance.forEach((a: any) => { (map[a.eventId] ||= []).push(a); });
    return map;
  }, [attendance]);
  const eventTypeMap = useMemo(() => Object.fromEntries(EVENT_TYPES.map((t) => [t.key, t])), []);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.date.localeCompare(a.date)), [events]);

  const open = useCallback(() => {
    setType('Training');
    setGroupId(groups[0]?.id || '');
    setDate(new Date().toISOString().slice(0, 10));
    setMarks({});
    setSheet(true);
  }, [groups]);

  const cycle = useCallback((id: string) => {
    setMarks((m) => {
      const cur: StatusKey = (m[id] || 'Present') as StatusKey;
      const idx = STATUS.findIndex((sx) => sx.key === cur);
      const next = STATUS[(idx + 1) % STATUS.length].key as StatusKey;
      return { ...m, [id]: next };
    });
  }, []);

  const save = useCallback(async () => {
    if (!groupId) return;
    const groupStudents = studentsByGroup[groupId] || [];
    const final: Record<string, string> = {};
    groupStudents.forEach((st) => { final[st.id] = marks[st.id] || 'Absent'; });
    setSheet(false);
    await saveAttendance({ groupId, type, date: new Date(date).toISOString(), attendance: final, duration: 1.0 });
  }, [groupId, studentsByGroup, marks, saveAttendance, type, date]);

  const detailEvent = detailEventId ? events.find((e: any) => e.id === detailEventId) : null;
  const detailGroup = detailEvent ? groupById[detailEvent.groupId] : null;
  const detailRecs = detailEvent ? (attendanceByEvent[detailEvent.id] || []) : [];
  const detailGroupStudents = detailEvent ? (studentsByGroup[detailEvent.groupId] || []) : [];
  const detailRecByStudent = useMemo(() => Object.fromEntries(detailRecs.map((r) => [r.studentId, r])), [detailRecs]);
  const detailPresent = detailRecs.filter((r) => r.status === 'Present').length;

  const closeDetail = useCallback(() => setDetailEventId(null), []);
  const handleDelete = useCallback(() => {
    if (!detailEventId) return;
    const id = detailEventId;
    confirm('Termin löschen?', 'Dieser Termin wird unwiderruflich gelöscht.', () => {
      setDetailEventId(null);
      deleteEvent(id);
    });
  }, [detailEventId, deleteEvent]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }} removeClippedSubviews>
        {sortedEvents.length === 0 ? <EmptyState emoji="📋" title="Keine Termine" subtitle="Erstelle deinen ersten Termin" /> : sortedEvents.map((e) => {
          const group = groupById[e.groupId];
          const totalGroupSize = (studentsByGroup[e.groupId] || []).length;
          const recs = attendanceByEvent[e.id] || [];
          const presentCount = recs.filter((r) => r.status === 'Present').length;
          return (
            <EventCard
              key={e.id}
              ev={e}
              group={group}
              eventType={eventTypeMap[e.type]}
              presentCount={presentCount}
              totalGroupSize={totalGroupSize}
              onPress={() => setDetailEventId(e.id)}
            />
          );
        })}
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <Btn title="+ Neuer Termin" onPress={open} testID="new-attendance-btn" disabled={groups.length === 0} icon={null} small={false} />
      </View>

      {/* New attendance entry sheet */}
      <Sheet testID="sheet-new-attendance" visible={sheet} onClose={() => setSheet(false)} title="Anwesenheit eintragen">
        <View style={{ gap: 10 }}>
          <Text style={s.lbl}>Typ</Text>
          <View style={{ flexDirection: 'row' }}>
            {EVENT_TYPES_WITH_COLORS.map((t) => (
              <Chip
                key={t.key}
                label={`${t.emoji} ${t.label}`}
                active={type === t.key}
                onPress={() => setType(t.key)}
                color={t.color}
              />
            ))}
          </View>
          <Text style={s.lbl}>Gruppe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {groups.map((g: any) => <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} color={g.color} />)}
          </View>
          <Text style={s.lbl}>Datum (YYYY-MM-DD)</Text>
          <Input
            testID="attendance-date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            multiline={false}
            keyboardType="default"
            secureTextEntry={false}
          />
          <Text style={s.lbl}>Mitglieder</Text>
          {(studentsByGroup[groupId] || []).map((st) => {
            const cur: StatusKey = (marks[st.id] || 'Present') as StatusKey;
            const stat = STATUS_MAP[cur];
            return (
              <TouchableOpacity key={st.id} onPress={() => cycle(st.id)} testID={`mark-${st.id}`} style={s.row}>
                <Avatar name={st.name} photo={st.photoUrl} size={36} emoji="" badgeEmoji="" bgColor={theme.primary} />
                <Text style={{ flex: 1, marginLeft: 10, color: theme.text, fontFamily: fonts.body }}>{st.name}</Text>
                <View style={[s.status, { backgroundColor: stat.color + '22' }]}>
                  <Text style={{ fontSize: 16 }}>{stat.emoji}</Text>
                  <Text style={{ color: stat.color, fontFamily: fonts.bodyBold, fontSize: 12, marginLeft: 4 }}>{stat.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Btn testID="attendance-save-btn" title="Speichern" onPress={save} icon={null} small={false} disabled={false} />
        </View>
      </Sheet>

      {/* Detail sheet for tracked event */}
      <Sheet testID="sheet-detail-event" visible={!!detailEvent} onClose={closeDetail} title={detailGroup ? `${detailGroup.name}` : 'Termin'}>
        {detailEvent ? (
          <View style={{ gap: 10 }}>
            <Text style={s.sub}>
              {eventTypeMap[detailEvent.type]?.emoji} {eventTypeMap[detailEvent.type]?.label} • {new Date(detailEvent.date).toLocaleDateString('de-DE')}
            </Text>
            <View style={s.detailStat}>
              <Text style={[s.detailStatNum, { fontFamily: fonts.heading }]}>{detailPresent}/{detailGroupStudents.length}</Text>
              <Text style={s.detailStatLbl}>anwesend</Text>
            </View>

            {detailGroupStudents.length === 0 ? (
              <EmptyState emoji="💔" title="Keine Mitglieder" subtitle="Diese Gruppe ist leer" />
            ) : (
              detailGroupStudents.map((st) => {
                const rec = detailRecByStudent[st.id];
                const statKey = (rec?.status || 'Absent') as StatusKey;
                const stat = STATUS_MAP[statKey];
                return (
                  <View key={st.id} style={s.row}>
                    <Avatar name={st.name} photo={st.photoUrl} size={36} emoji="" badgeEmoji="" bgColor={theme.primary} />
                    <Text style={{ flex: 1, marginLeft: 10, color: theme.text, fontFamily: fonts.body }}>{st.name}</Text>
                    <View style={[s.status, { backgroundColor: stat.color + '22' }]}>
                      <Text style={{ fontSize: 16 }}>{stat.emoji}</Text>
                      <Text style={{ color: stat.color, fontFamily: fonts.bodyBold, fontSize: 12, marginLeft: 4 }}>{stat.label}</Text>
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ marginTop: 8 }}>
              <Btn title="🗑️  Termin löschen" variant="ghost" onPress={handleDelete} testID="delete-event-btn" disabled={false} icon={null} small={false} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 16, color: theme.text },
  sub: { fontSize: 12, color: theme.mutedText, marginTop: 2, fontFamily: 'DMSans_400Regular' },
  lbl: { fontSize: 13, color: theme.mutedText, fontFamily: 'DMSans_700Bold', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  status: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  detailStat: { backgroundColor: theme.bg, borderRadius: 14, padding: 14, alignItems: 'center', marginVertical: 6 },
  detailStatNum: { fontSize: 28, color: theme.primary },
  detailStatLbl: { fontSize: 12, color: theme.mutedText, fontFamily: 'DMSans_400Regular', marginTop: 2 },
});
