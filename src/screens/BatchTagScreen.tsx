import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, UNTAGGED_LABEL, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { activityTagKey } from '../tagUtils';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onBatchSetTag: (ids: string[], tagId: ActivityTag['id']) => void;
  onBack: () => void;
}

export default function BatchTagScreen({ activities, tags, onBatchSetTag, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  // All untagged activities (no tagId, no category fallback from legacy records).
  const untagged = useMemo(
    () => activities.filter((a) => activityTagKey(a) === undefined),
    [activities],
  );

  // Selected tag to apply.
  const [selectedTagId, setSelectedTagId] = useState<ActivityTag['id'] | null>(null);
  // Selected activity ids (toggle individual rows).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [done, setDone] = useState(false);

  // Effective selection: if selectAll, all untagged; otherwise, the manual set.
  const effectiveIds = useMemo(
    () => selectAll ? untagged.map((a) => a.id) : [...selectedIds],
    [selectAll, untagged, selectedIds],
  );

  const canApply = selectedTagId !== null && effectiveIds.length > 0;

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds(new Set());
    } else {
      setSelectAll(true);
      setSelectedIds(new Set());
    }
  };

  const toggleItem = (id: string) => {
    if (selectAll) {
      // Switching from "all" to manual — pre-fill all, then remove this one.
      setSelectAll(false);
      const next = new Set(untagged.map((a) => a.id));
      next.delete(id);
      setSelectedIds(next);
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isChecked = (id: string) => selectAll || selectedIds.has(id);

  const handleApply = () => {
    if (!selectedTagId || effectiveIds.length === 0) return;
    onBatchSetTag(effectiveIds, selectedTagId);
    setDone(true);
  };

  if (done) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.doneCenter}>
          <Text style={styles.doneTitle}>已设置标签</Text>
          <Text style={styles.doneDesc}>
            已为 {effectiveIds.length} 条记录设置了标签「{tags.find((t) => t.id === selectedTagId)?.label}」。
          </Text>
          <Pressable onPress={onBack} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>返回设置</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (untagged.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>批量设置标签</Text>
          </View>
        </View>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyTitle}>没有无标签的记录</Text>
          <Text style={styles.emptyDesc}>所有记录都已关联了标签，无需批量设置。</Text>
        </View>
      </View>
    );
  }

  const selectedTag = tags.find((t) => t.id === selectedTagId);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>批量设置标签</Text>
          <Text style={styles.subtitle}>
            共 {untagged.length} 条无标签记录，已选 {effectiveIds.length} 条
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        {/* Tag selection */}
        <View style={styles.tagCard}>
          <Text style={styles.sectionLabel}>选择要设置的标签</Text>
          <View style={styles.tagRow}>
            {tags.map((tag) => {
              const active = tag.id === selectedTagId;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => setSelectedTagId(tag.id)}
                  style={[
                    styles.tagChip,
                    active && { backgroundColor: tag.dot, borderColor: tag.dot },
                  ]}
                >
                  {!active && <View style={[styles.dot, { backgroundColor: tag.dot }]} />}
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Select all toggle */}
        <View style={styles.selectAllRow}>
          <Pressable onPress={toggleSelectAll} style={styles.checkBtn}>
            <View style={[styles.checkBox, selectAll && styles.checkBoxActive]}>
              {selectAll && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.selectAllText}>全选 {untagged.length} 条</Text>
          </Pressable>
        </View>

        {/* Activity list */}
        <View style={styles.list}>
          {untagged.map((a, idx) => {
            const checked = isChecked(a.id);
            const d = new Date(a.timestamp);
            const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            return (
              <Pressable
                key={a.id}
                onPress={() => toggleItem(a.id)}
                style={({ pressed }) => [
                  styles.itemRow,
                  idx === untagged.length - 1 && styles.itemRowLast,
                  pressed && styles.itemPressed,
                ]}
              >
                <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
                  {checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.itemMeta}>
                    {dateStr} · {UNTAGGED_LABEL}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Apply button */}
      {canApply && (
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            styles.applyBtn,
            { bottom: insets.bottom + 20 },
            pressed && styles.applyPressed,
          ]}
        >
          <View style={[styles.applyDot, { backgroundColor: selectedTag?.dot || c.muted3 }]} />
          <Text style={styles.applyText}>
            为 {effectiveIds.length} 条设置「{selectedTag?.label}」
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    backIcon: { fontSize: 20, color: c.muted, marginTop: -2 },
    titleBlock: { flex: 1, gap: 2 },
    title: { fontSize: 22, fontWeight: '800', color: c.ink, lineHeight: 25 },
    subtitle: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },

    tagCard: {
      marginTop: 18,
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 15,
      gap: 12,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    sectionLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    dot: { width: 8, height: 8, borderRadius: 999 },
    tagText: { fontSize: 12, fontWeight: '700', color: c.muted },
    tagTextActive: { color: '#FFFFFF', fontWeight: '800' },

    selectAllRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkBtn: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxActive: { backgroundColor: c.accent, borderColor: c.accent },
    checkMark: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: -1 },
    selectAllText: { fontSize: 13, fontWeight: '700', color: c.ink },

    list: {
      marginTop: 14,
      backgroundColor: c.card,
      borderRadius: 18,
      paddingHorizontal: 14,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.inputBg,
    },
    itemRowLast: { borderBottomWidth: 0 },
    itemPressed: { opacity: 0.55 },
    itemBody: { flex: 1, minWidth: 0, gap: 3 },
    itemTitle: { fontSize: 14, fontWeight: '700', color: c.ink },
    itemMeta: { fontSize: 11, fontWeight: '600', color: c.muted3 },

    applyBtn: {
      position: 'absolute',
      left: 20,
      right: 20,
      backgroundColor: c.accent,
      borderRadius: 15,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    applyPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
    applyDot: { width: 10, height: 10, borderRadius: 999 },
    applyText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

    doneCenter: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 },
    doneTitle: { fontSize: 20, fontWeight: '800', color: c.ink },
    doneDesc: { fontSize: 13, fontWeight: '600', color: c.muted3, textAlign: 'center', lineHeight: 20 },
    doneBtn: {
      backgroundColor: c.accent,
      borderRadius: 15,
      paddingVertical: 13,
      paddingHorizontal: 28,
    },
    doneBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

    emptyCenter: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
    emptyDesc: { fontSize: 12.5, fontWeight: '600', color: c.muted3, textAlign: 'center', lineHeight: 20 },
  });