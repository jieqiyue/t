import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, THEME_LIST, ThemeId, useTheme } from '../theme';
import { ActivityOverviewStyle } from '../types';

interface Props {
  overviewStyle: ActivityOverviewStyle;
  onChangeOverviewStyle: (style: ActivityOverviewStyle) => void;
  themeId: ThemeId;
  onChangeTheme: (id: ThemeId) => void;
  onOpenManageItems: () => void;
  onOpenManageTags: () => void;
  onOpenExport: () => void;
  onClearAllData: () => void;
  onBack: () => void;
}

const OPTIONS: { id: ActivityOverviewStyle; title: string; desc: string }[] = [
  { id: 'rank', title: '频次榜', desc: '按累计次数排序，用进度条快速比较高频活动。' },
  { id: 'cloud', title: '活动云', desc: '用标签大小表达频次，更适合一眼扫全局。' },
];

export default function SettingsScreen({
  overviewStyle,
  onChangeOverviewStyle,
  themeId,
  onChangeTheme,
  onOpenManageItems,
  onOpenManageTags,
  onOpenExport,
  onClearAllData,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const confirmClear = () => {
    setConfirmClearOpen(false);
    onClearAllData();
  };

  const overviewLabel = OPTIONS.find((o) => o.id === overviewStyle)?.title ?? '';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 28,
        }}
      >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>设置</Text>
          <Text style={styles.subtitle}>调整记录、总览样式与配色</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>记录设置</Text>
        <View style={styles.optionCard}>
          <Pressable onPress={onOpenManageItems} style={styles.navOption}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>事件管理</Text>
              <Text style={styles.optionDesc}>添加、归档或删除快捷记录里可选择的事件。</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
          <Pressable onPress={onOpenManageTags} style={[styles.navOption, styles.optionLast]}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>标签管理</Text>
              <Text style={styles.optionDesc}>维护事件所属的标签和显示颜色。</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据</Text>
        <View style={styles.optionCard}>
          <Pressable onPress={onOpenExport} style={[styles.navOption, styles.optionLast]}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>导出与备份</Text>
              <Text style={styles.optionDesc}>导出 CSV / JSON，或备份与恢复全部数据。</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>活动总览样式</Text>
        <View style={styles.optionCard}>
          {OPTIONS.map((option, index) => {
            const active = overviewStyle === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChangeOverviewStyle(option.id)}
                style={[styles.option, index === OPTIONS.length - 1 && styles.optionLast]}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>色调</Text>
        <View style={styles.themeRow}>
          {THEME_LIST.map((t) => {
            const active = themeId === t.id;
            return (
              <Pressable key={t.id} onPress={() => onChangeTheme(t.id)} style={styles.themeItem}>
                <View style={[styles.themeCard, { backgroundColor: t.bg }, active && styles.themeCardActive]}>
                  <View style={styles.swatchGrid}>
                    {t.swatch.map((s, i) => (
                      <View key={i} style={[styles.swatchDot, { backgroundColor: s }]} />
                    ))}
                  </View>
                </View>
                <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentText}>
            <Text style={styles.currentTitle}>
              当前：{c.label} · {overviewLabel}
            </Text>
            <Text style={styles.currentDesc}>更改后立即应用到全部页面</Text>
          </View>
          <View style={styles.currentDots}>
            {c.swatch.map((s, i) => (
              <View key={i} style={[styles.currentDot, { backgroundColor: s }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>危险操作</Text>
        <View style={styles.optionCard}>
          <Pressable
            onPress={() => setConfirmClearOpen(true)}
            style={[styles.navOption, styles.optionLast]}
          >
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, styles.dangerTitle]}>清除所有数据</Text>
              <Text style={styles.optionDesc}>删除所有记录、事件、标签和设置，恢复为空白状态。</Text>
            </View>
            <Text style={styles.dangerArrow}>›</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>

      {confirmClearOpen && (
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmScrim} onPress={() => setConfirmClearOpen(false)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>清除所有数据</Text>
            <Text style={styles.confirmBody}>
              此操作会删除所有记录、事件、标签和设置，并恢复为空白状态。清除后无法恢复。
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setConfirmClearOpen(false)}
                style={[styles.confirmButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable onPress={confirmClear} style={[styles.confirmButton, styles.clearButton]}>
                <Text style={styles.clearText}>确认清除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt },
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
  titleBlock: { gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: c.ink, lineHeight: 25 },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },
  section: { marginTop: 22, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: c.gold },
  optionCard: {
    borderRadius: 18,
    backgroundColor: c.card,
    paddingHorizontal: 15,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  optionLast: { borderBottomWidth: 0 },
  navOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  optionText: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: c.ink },
  optionDesc: { fontSize: 12, fontWeight: '500', color: c.muted3, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: c.accent },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: c.accent },
  navArrow: { fontSize: 20, fontWeight: '700', color: c.gold },
  dangerTitle: { color: '#9B6E64' },
  dangerArrow: { fontSize: 20, fontWeight: '700', color: '#C9A9A0' },

  themeRow: { flexDirection: 'row', gap: 10 },
  themeItem: { flex: 1, alignItems: 'center', gap: 7 },
  themeCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  themeCardActive: { borderColor: c.ink },
  swatchGrid: { width: 34, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  swatchDot: { width: 13, height: 13, borderRadius: 999 },
  themeLabel: { fontSize: 12, fontWeight: '700', color: c.muted3 },
  themeLabelActive: { color: c.ink, fontWeight: '800' },

  currentCard: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: c.card,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  currentText: { flex: 1, gap: 4 },
  currentTitle: { fontSize: 15, fontWeight: '800', color: c.ink },
  currentDesc: { fontSize: 12, fontWeight: '600', color: c.muted3 },
  currentDots: { flexDirection: 'row', gap: 6 },
  currentDot: { width: 12, height: 12, borderRadius: 999 },

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
  confirmScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.scrim },
  confirmCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: c.sheet,
    padding: 18,
    gap: 12,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: c.ink },
  confirmBody: { fontSize: 13, fontWeight: '500', color: c.muted, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmButton: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12 },
  cancelButton: { backgroundColor: c.inputBg },
  clearButton: { backgroundColor: '#9B6E64' },
  cancelText: { fontSize: 14, fontWeight: '800', color: c.muted },
  clearText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
