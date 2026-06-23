import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { ActivityOverviewStyle } from '../types';

interface Props {
  overviewStyle: ActivityOverviewStyle;
  onChangeOverviewStyle: (style: ActivityOverviewStyle) => void;
  onOpenManageItems: () => void;
  onOpenManageTags: () => void;
  onBack: () => void;
}

const OPTIONS: { id: ActivityOverviewStyle; title: string; desc: string }[] = [
  { id: 'rank', title: '频次榜', desc: '按累计次数排序，用进度条快速比较高频活动。' },
  { id: 'cloud', title: '活动云', desc: '用标签大小表达频次，更适合一眼扫全局。' },
];

export default function SettingsScreen({
  overviewStyle,
  onChangeOverviewStyle,
  onOpenManageItems,
  onOpenManageTags,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>设置</Text>
          <Text style={styles.subtitle}>调整活动总览的呈现方式</Text>
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
        <Text style={styles.sectionTitle}>活动总览样式</Text>
        <View style={styles.optionCard}>
          {OPTIONS.map((option, index) => {
            const active = overviewStyle === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChangeOverviewStyle(option.id)}
                style={[
                  styles.option,
                  index === OPTIONS.length - 1 && styles.optionLast,
                  active && styles.optionActive,
                ]}
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
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  backIcon: { fontSize: 20, color: COLORS.muted, marginTop: -2 },
  titleBlock: { gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink, lineHeight: 25 },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted3 },
  section: { marginTop: 22, gap: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.gold,
  },
  optionCard: {
    borderRadius: 18,
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    shadowColor: COLORS.ink,
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
    borderBottomColor: COLORS.inputBg,
  },
  optionLast: { borderBottomWidth: 0 },
  navOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  optionActive: {},
  optionText: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  optionDesc: { fontSize: 12, fontWeight: '500', color: COLORS.muted3, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.accent },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: COLORS.accent },
  navArrow: { fontSize: 20, fontWeight: '700', color: COLORS.gold },
});
