import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Activity, ActivityItem, ActivityTag } from '../types';

interface Props {
  tags: ActivityTag[];
  items: ActivityItem[];
  activities: Activity[];
  onChangeTags: (tags: ActivityTag[]) => void;
  onBack: () => void;
}

const DEFAULT_TAG_IDS = ['work', 'life', 'sport', 'fun'];

const PALETTE = [
  { dot: '#A8B5A2', text: '#5E7257', soft: '#E9EEE6' },
  { dot: '#9FB0BE', text: '#5E7080', soft: '#E7ECEF' },
  { dot: '#C9A9A0', text: '#9B6E64', soft: '#F1E7E4' },
  { dot: '#C2B49C', text: '#897B5E', soft: '#EFEBE2' },
  { dot: '#B6A5B8', text: '#765F78', soft: '#EEE7EF' },
];

export default function ManageTagsScreen({ tags, items, activities, onChangeTags, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [editingId, setEditingId] = useState<ActivityTag['id'] | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // A tag is "in use" if any event OR any logged record still references it.
  const isTagInUse = (id: ActivityTag['id']) =>
    items.some((item) => item.tagId === id) ||
    activities.some((activity) => (activity.tagId || activity.category) === id);
  const isDefaultTag = (id: ActivityTag['id']) => DEFAULT_TAG_IDS.includes(id as string);
  const canDeleteTag = (id: ActivityTag['id']) =>
    !isTagInUse(id) && !isDefaultTag(id) && tags.length > 1;

  const addTag = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const palette = PALETTE[paletteIndex];
    onChangeTags([
      {
        id: `tag-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
        label: trimmed,
        ...palette,
      },
      ...tags,
    ]);
    setLabel('');
  };

  const saveEdit = (id: ActivityTag['id']) => {
    const trimmed = editingLabel.trim();
    if (!trimmed) return;
    onChangeTags(tags.map((tag) => (tag.id === id ? { ...tag, label: trimmed } : tag)));
    setEditingId(null);
    setEditingLabel('');
  };

  const removeTag = (id: ActivityTag['id']) => {
    if (!canDeleteTag(id)) return;
    onChangeTags(tags.filter((tag) => tag.id !== id));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>标签管理</Text>
          <Text style={styles.subtitle}>标签决定事件的分类和颜色</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="新增标签名称"
            placeholderTextColor={COLORS.muted3}
            maxLength={12}
          />
          <View style={styles.palette}>
            {PALETTE.map((color, index) => (
              <Pressable
                key={color.dot}
                onPress={() => setPaletteIndex(index)}
                style={[
                  styles.swatch,
                  { backgroundColor: color.dot },
                  paletteIndex === index && styles.swatchActive,
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={addTag}
            disabled={!label.trim()}
            style={[styles.primaryButton, !label.trim() && styles.disabled]}
          >
            <Text style={styles.primaryText}>添加标签</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {tags.map((tag) => {
            const inUse = isTagInUse(tag.id);
            const isDefault = isDefaultTag(tag.id);
            const deletable = canDeleteTag(tag.id);
            const hint = isDefault ? '默认分类' : inUse ? '正在使用' : '未使用';
            const editing = editingId === tag.id;
            return (
              <View key={tag.id} style={styles.tagRow}>
                <View style={[styles.dot, { backgroundColor: tag.dot }]} />
                {editing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editingLabel}
                    onChangeText={setEditingLabel}
                    autoFocus
                    maxLength={12}
                  />
                ) : (
                  <View style={styles.tagTextBlock}>
                    <Text style={styles.tagLabel}>{tag.label}</Text>
                    <Text style={styles.tagHint}>{hint}</Text>
                  </View>
                )}
                {editing ? (
                  <Pressable onPress={() => saveEdit(tag.id)} style={styles.smallButton}>
                    <Text style={styles.smallButtonText}>保存</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      setEditingId(tag.id);
                      setEditingLabel(tag.label);
                    }}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>编辑</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => removeTag(tag.id)}
                  disabled={!deletable}
                  style={[styles.smallButton, !deletable && styles.disabled]}
                >
                  <Text style={styles.deleteText}>删除</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgAlt, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.muted, marginTop: -2 },
  titleBlock: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink, lineHeight: 25 },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted3 },
  form: { marginTop: 20, backgroundColor: COLORS.card, borderRadius: 18, padding: 15, gap: 12 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  palette: { flexDirection: 'row', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 999, borderWidth: 3, borderColor: 'transparent' },
  swatchActive: { borderColor: COLORS.ink },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 15, paddingVertical: 13, alignItems: 'center' },
  disabled: { opacity: 0.42 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  list: { marginTop: 14, backgroundColor: COLORS.card, borderRadius: 18, paddingHorizontal: 14 },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  dot: { width: 9, height: 9, borderRadius: 999 },
  tagTextBlock: { flex: 1, gap: 3 },
  tagLabel: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  tagHint: { fontSize: 11, fontWeight: '700', color: COLORS.muted3 },
  editInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: COLORS.ink,
    fontWeight: '700',
  },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.inputBg },
  smallButtonText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  deleteText: { fontSize: 11, fontWeight: '800', color: '#9B6E64' },
});
