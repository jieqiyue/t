import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, UNTAGGED_LABEL, useTheme } from '../theme';
import { ActivityItem, ActivityTag } from '../types';
import { newId } from '../ids';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props {
  items: ActivityItem[];
  tags: ActivityTag[];
  onChangeItems: (items: ActivityItem[]) => void;
  onDeleteItem: (item: ActivityItem) => void;
  onOpenStats: (title: string) => void;
  onBack: () => void;
}

export default function ManageItemsScreen({
  items,
  tags,
  onChangeItems,
  onDeleteItem,
  onOpenStats,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState<ActivityTag['id'] | null>(null);
  const [query, setQuery] = useState('');
  const [pendingArchive, setPendingArchive] = useState<ActivityItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ActivityItem | null>(null);
  const selectedTag = tags.find((tag) => tag.id === tagId) || null;
  const canAddItem = !!title.trim();
  const sortedActiveItems = useMemo(
    () =>
      [...items.filter((item) => !item.archived)].sort(
        (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt,
      ),
    [items],
  );
  const sortedArchivedItems = useMemo(
    () => [...items.filter((item) => item.archived)].sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );
  const visibleItems = useMemo(
    () => {
      const keyword = query.trim().toLowerCase();
      return [...sortedActiveItems, ...sortedArchivedItems].filter(
        (item) => !keyword || item.title.toLowerCase().includes(keyword),
      );
    },
    [query, sortedActiveItems, sortedArchivedItems],
  );

  const addItem = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const item: ActivityItem = {
      id: newId('item-'),
      title: trimmed,
      tagId: selectedTag?.id,
      createdAt: Date.now(),
    };
    onChangeItems([item, ...items]);
    setTitle('');
  };

  const updateItem = (next: ActivityItem) => {
    onChangeItems(items.map((item) => (item.id === next.id ? next : item)));
  };

  const togglePin = (item: ActivityItem) => {
    updateItem({ ...item, pinned: !item.pinned });
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
            placeholderTextColor={c.muted3}
            maxLength={40}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
            <Pressable
              onPress={() => setTagId(null)}
              style={[
                styles.tagChip,
                tagId == null && { backgroundColor: c.accent, borderColor: c.accent },
              ]}
            >
              {tagId != null && <View style={[styles.dot, { backgroundColor: c.muted3 }]} />}
              <Text style={[styles.tagText, tagId == null && styles.tagTextActive]}>无标签</Text>
            </Pressable>
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
          {tags.length === 0 && (
            <Text style={styles.formHint}>当前没有标签，也可以先创建无标签事件。</Text>
          )}
          <Pressable
            onPress={addItem}
            disabled={!canAddItem}
            style={[styles.primaryButton, !canAddItem && styles.disabled]}
          >
            <Text style={styles.primaryText}>添加事件</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="搜索事件"
          placeholderTextColor={c.muted3}
          maxLength={40}
        />

        <View style={styles.list}>
          {visibleItems.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{query.trim() ? '没有匹配的事件' : '还没有事件'}</Text>
            </View>
          ) : visibleItems.map((item) => {
            const tag = tags.find((candidate) => candidate.id === item.tagId) || null;
            return (
              <View key={item.id} style={styles.itemRow}>
                <Pressable
                  onPress={() => onOpenStats(item.title)}
                  style={({ pressed }) => [styles.itemMain, pressed && styles.itemPressed]}
                >
                  <View style={[styles.dot, { backgroundColor: tag?.dot || c.muted3 }]} />
                  <View style={styles.itemText}>
                    <View style={styles.itemTitleLine}>
                      {item.pinned && !item.archived && (
                        <Text style={styles.pinBadge}>置顶</Text>
                      )}
                      <Text style={[styles.itemTitle, item.archived && styles.archived]} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[styles.itemTag, { color: tag?.text || c.muted3 }]}>
                      {tag?.label || UNTAGGED_LABEL}{item.archived ? ' · 已归档' : ''}
                    </Text>
                  </View>
                  <Text style={styles.statHint}>统计 ›</Text>
                </Pressable>
                {!item.archived && (
                  <Pressable
                    onPress={() => togglePin(item)}
                    style={[styles.smallButton, item.pinned && styles.pinButtonActive]}
                  >
                    <Text style={item.pinned ? styles.pinButtonActiveText : styles.smallButtonText}>
                      {item.pinned ? '取消置顶' : '置顶'}
                    </Text>
                  </Pressable>
                )}
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
        <ConfirmDialog
          title="归档事件"
          message={`归档「${pendingArchive.title}」后，它将不再出现在快捷记录的选择列表里，历史记录和统计不会删除。`}
          confirmLabel="确认归档"
          confirmColor="#C9A9A0"
          onConfirm={confirmArchive}
          onCancel={() => setPendingArchive(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="删除事件"
          message={`删除「${pendingDelete.title}」会一并清除它的所有历史记录和统计，且无法恢复。若只是想暂时不再记录、保留历史，请改用「归档」。`}
          confirmLabel="确认删除"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: c.muted, marginTop: -2 },
  titleBlock: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: c.ink, lineHeight: 25 },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },
  form: { marginTop: 20, backgroundColor: c.card, borderRadius: 18, padding: 15, gap: 12 },
  input: {
    backgroundColor: c.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  tagRow: { gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: c.muted },
  tagTextActive: { color: '#FFFFFF', fontWeight: '800' },
  formHint: { fontSize: 12, fontWeight: '600', color: c.muted3, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  primaryButton: { backgroundColor: c.accent, borderRadius: 15, paddingVertical: 13, alignItems: 'center' },
  disabled: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  searchInput: {
    marginTop: 14,
    backgroundColor: c.card,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  list: { marginTop: 14, backgroundColor: c.card, borderRadius: 18, paddingHorizontal: 14 },
  emptyRow: { paddingVertical: 22, alignItems: 'center' },
  emptyText: { fontSize: 12.5, fontWeight: '700', color: c.muted3 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  itemPressed: { opacity: 0.55 },
  statHint: { fontSize: 10, fontWeight: '800', color: c.accent, marginLeft: 2 },
  itemText: { flex: 1, minWidth: 0, gap: 3 },
  itemTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  pinBadge: {
    backgroundColor: c.accentSoft,
    color: c.accentInk,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemTitle: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: c.ink },
  archived: { color: c.muted3, textDecorationLine: 'line-through' },
  itemTag: { fontSize: 11, fontWeight: '800' },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: c.inputBg },
  smallButtonText: { fontSize: 11, fontWeight: '800', color: c.muted },
  pinButtonActive: { backgroundColor: c.accentSoft },
  pinButtonActiveText: { fontSize: 11, fontWeight: '800', color: c.accentInk },
  deleteText: { fontSize: 11, fontWeight: '800', color: '#9B6E64' },
});
