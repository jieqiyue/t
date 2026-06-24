import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { ActivityItem, ActivityTag } from '../types';

interface Props {
  items: ActivityItem[];
  tags: ActivityTag[];
  onChangeItems: (items: ActivityItem[]) => void;
  onDeleteItem: (item: ActivityItem) => void;
  onBack: () => void;
}

export default function ManageItemsScreen({ items, tags, onChangeItems, onDeleteItem, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState(() => tags[0]?.id || 'life');
  const [pendingArchive, setPendingArchive] = useState<ActivityItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ActivityItem | null>(null);
  const visibleItems = useMemo(
    () => [
      ...items.filter((item) => !item.archived),
      ...items.filter((item) => item.archived),
    ],
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

  const toggleArchive = (item: ActivityItem) => {
    if (item.archived) {
      updateItem({ ...item, archived: false });
      return;
    }

    setPendingArchive(item);
  };

  const confirmArchive = () => {
    if (!pendingArchive) return;
    updateItem({ ...pendingArchive, archived: true });
    setPendingArchive(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteItem(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>事件管理</Text>
          <Text style={styles.subtitle}>维护快捷记录里可直接选择的事件</Text>
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
            placeholder="新增一个常做事件"
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
            <Text style={styles.primaryText}>添加事件</Text>
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
                  onPress={() => toggleArchive(item)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>{item.archived ? '恢复' : '归档'}</Text>
                </Pressable>
                <Pressable onPress={() => setPendingDelete(item)} style={styles.smallButton}>
                  <Text style={styles.deleteText}>删除</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {pendingArchive && (
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmScrim} onPress={() => setPendingArchive(null)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>归档事件</Text>
            <Text style={styles.confirmBody}>
              归档「{pendingArchive.title}」后，它将不再出现在快捷记录的选择列表里，历史记录和统计不会删除。
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPendingArchive(null)}
                style={[styles.confirmButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={confirmArchive}
                style={[styles.confirmButton, styles.archiveButton]}
              >
                <Text style={styles.archiveText}>确认归档</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {pendingDelete && (
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmScrim} onPress={() => setPendingDelete(null)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>删除事件</Text>
            <Text style={styles.confirmBody}>
              删除「{pendingDelete.title}」会一并清除它的所有历史记录和统计，且无法恢复。若只是想暂时不再记录、保留历史，请改用「归档」。
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                style={[styles.confirmButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={[styles.confirmButton, styles.deleteButton]}
              >
                <Text style={styles.archiveText}>确认删除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.scrim,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: COLORS.sheet,
    padding: 18,
    gap: 12,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  confirmBody: { fontSize: 13, fontWeight: '500', color: COLORS.muted, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmButton: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12 },
  cancelButton: { backgroundColor: COLORS.inputBg },
  archiveButton: { backgroundColor: '#C9A9A0' },
  deleteButton: { backgroundColor: '#9B6E64' },
  cancelText: { fontSize: 14, fontWeight: '800', color: COLORS.muted },
  archiveText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
