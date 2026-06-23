import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { ActivityItem, ActivityTag } from '../types';

interface Props {
  items: ActivityItem[];
  tags: ActivityTag[];
  onChangeItems: (items: ActivityItem[]) => void;
  onBack: () => void;
}

export default function ManageItemsScreen({ items, tags, onChangeItems, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState(() => tags[0]?.id || 'life');
  const visibleItems = useMemo(
    () => [...items].sort((a, b) => Number(a.archived) - Number(b.archived) || b.createdAt - a.createdAt),
    [items],
  );

  const addItem = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const item: ActivityItem = {
      id: `item-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
      title: trimmed,
      tagId,
      createdAt: Date.now(),
    };
    onChangeItems([item, ...items]);
    setTitle('');
  };

  const updateItem = (next: ActivityItem) => {
    onChangeItems(items.map((item) => (item.id === next.id ? next : item)));
  };

  const removeItem = (id: string) => {
    onChangeItems(items.filter((item) => item.id !== id));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>管理事情</Text>
          <Text style={styles.subtitle}>维护快捷记录里可直接选择的事情</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="新增一件常做的事"
            placeholderTextColor={COLORS.muted3}
            maxLength={40}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
            {tags.map((tag) => {
              const active = tag.id === tagId;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => setTagId(tag.id)}
                  style={[styles.tagChip, active && { backgroundColor: tag.dot, borderColor: tag.dot }]}
                >
                  {!active && <View style={[styles.dot, { backgroundColor: tag.dot }]} />}
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={addItem}
            disabled={!title.trim()}
            style={[styles.primaryButton, !title.trim() && styles.disabled]}
          >
            <Text style={styles.primaryText}>添加事情</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {visibleItems.map((item) => {
            const tag = tags.find((candidate) => candidate.id === item.tagId) || tags[0];
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={[styles.dot, { backgroundColor: tag?.dot || COLORS.accent }]} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, item.archived && styles.archived]}>{item.title}</Text>
                  <Text style={[styles.itemTag, { color: tag?.text || COLORS.accentInk }]}>
                    {tag?.label || '标签'}{item.archived ? ' · 已归档' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => updateItem({ ...item, archived: !item.archived })}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>{item.archived ? '恢复' : '归档'}</Text>
                </Pressable>
                <Pressable onPress={() => removeItem(item.id)} style={styles.smallButton}>
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
  tagRow: { gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  tagTextActive: { color: '#FFFFFF', fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 999 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 15, paddingVertical: 13, alignItems: 'center' },
  disabled: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  list: { marginTop: 14, backgroundColor: COLORS.card, borderRadius: 18, paddingHorizontal: 14 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  itemText: { flex: 1, minWidth: 0, gap: 3 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  archived: { color: COLORS.muted3, textDecorationLine: 'line-through' },
  itemTag: { fontSize: 11, fontWeight: '800' },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.inputBg },
  smallButtonText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  deleteText: { fontSize: 11, fontWeight: '800', color: '#9B6E64' },
});
