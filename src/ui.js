import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, ScrollView, Pressable, Image } from 'react-native';
import { theme, fonts } from './theme';

export const Card = ({ children, style, testID }) => (
  <View testID={testID} style={[s.card, style]}>{children}</View>
);

export const Btn = ({ title, onPress, variant = 'primary', testID, disabled, icon, small }) => {
  const bg = variant === 'primary' ? theme.primary : variant === 'ghost' ? 'transparent' : variant === 'danger' ? '#e4568a' : theme.surface;
  const color = variant === 'ghost' ? theme.text : variant === 'secondary' ? theme.text : '#fff';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && { paddingVertical: 8, paddingHorizontal: 14 },
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0, borderColor: theme.border },
      ]}
    >
      {icon ? <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text> : null}
      <Text style={[s.btnText, { color, fontFamily: fonts.bodyBold }]}>{title}</Text>
    </Pressable>
  );
};

export const Input = ({ value, onChangeText, placeholder, testID, multiline, keyboardType, secureTextEntry, ...rest }) => (
  <TextInput
    testID={testID}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={theme.mutedText}
    multiline={multiline}
    keyboardType={keyboardType}
    secureTextEntry={secureTextEntry}
    style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
    {...rest}
  />
);

export const Sheet = ({ visible, onClose, title, children, testID }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.backdrop} onPress={onClose} />
    <View style={s.sheet} testID={testID}>
      <View style={s.sheetHandle} />
      <View style={s.sheetHeader}>
        <Text style={[s.sheetTitle, { fontFamily: fonts.heading }]}>{title}</Text>
        <TouchableOpacity onPress={onClose} testID="sheet-close">
          <Text style={{ fontSize: 24, color: theme.mutedText }}>×</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  </Modal>
);

export const ProgressBar = ({ progress, color }) => (
  <View style={s.progressBg}>
    <View style={[s.progressFill, { width: `${Math.min(100, progress * 100)}%`, backgroundColor: color || theme.primary }]} />
  </View>
);

export const Chip = ({ label, active, onPress, color }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[s.chip, active && { backgroundColor: color || theme.primary, borderColor: color || theme.primary }]}
  >
    <Text style={[s.chipText, { color: active ? '#fff' : theme.text, fontFamily: fonts.bodyBold }]}>{label}</Text>
  </TouchableOpacity>
);

export const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <View style={s.toast} pointerEvents="none">
      <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>{toast.msg}</Text>
    </View>
  );
};

export const Avatar = ({ photo, name, size = 48, emoji, badgeEmoji, bgColor }) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.border }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor || theme.secondary, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: fonts.heading, fontSize: size * 0.4 }}>{emoji || initial}</Text>
        </View>
      )}
      {badgeEmoji ? (
        <View style={s.avatarBadge}>
          <Text style={{ fontSize: 12 }}>{badgeEmoji}</Text>
        </View>
      ) : null}
    </View>
  );
};

export const EmptyState = ({ emoji, title, subtitle }) => (
  <View style={{ alignItems: 'center', padding: 40 }}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
    <Text style={[s.emptyTitle, { fontFamily: fonts.heading }]}>{title}</Text>
    {subtitle ? <Text style={[s.emptySub, { fontFamily: fonts.body }]}>{subtitle}</Text> : null}
  </View>
);

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#6b4e5c', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
  btnText: { fontSize: 15 },
  input: { backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 15, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: theme.border },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(107,78,92,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  sheetHandle: { width: 48, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, color: theme.text },
  progressBg: { height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.border, marginRight: 8, marginBottom: 8, backgroundColor: theme.surface },
  chipText: { fontSize: 13 },
  toast: { position: 'absolute', bottom: 60, left: 20, right: 20, backgroundColor: theme.text, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, zIndex: 999, alignItems: 'center' },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: theme.surface, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  emptyTitle: { fontSize: 20, color: theme.text, marginBottom: 4 },
  emptySub: { fontSize: 14, color: theme.mutedText, textAlign: 'center' },
});
