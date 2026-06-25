import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityItem, ActivityTag } from '../types';
import {
  buildBackup,
  CsvFields,
  ExportRange,
  filterByRange,
  overviewStats,
  parseBackup,
  RestoredData,
  sizeLabel,
  toCsv,
  toJson,
} from '../exporters';
import { CheckIcon, DownloadIcon, ShareIcon } from '../components/moodWeather';

interface Props {
  activities: Activity[];
  items: ActivityItem[];
  tags: ActivityTag[];
  themeId: string;
  overviewStyle: string;
  onRestore: (data: RestoredData) => void;
  onBack: () => void;
}

type Format = 'csv' | 'json';
const RANGES: { id: ExportRange; label: string }[] = [
  { id: 'month', label: '本月' },
  { id: '3months', label: '近 3 个月' },
  { id: 'all', label: '全部' },
];

export default function ExportScreen({
  activities,
  items,
  tags,
  themeId,
  overviewStyle,
  onRestore,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  const [format, setFormat] = useState<Format | null>(null);
  const [range, setRange] = useState<ExportRange>('all');
  const [fields, setFields] = useState<CsvFields>({ moodWeather: true, note: false });
  const [pendingRestore, setPendingRestore] = useState<RestoredData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const stats = useMemo(() => overviewStats(activities, items, tags), [activities, items, tags]);

  const records = useMemo(
    () => (format ? filterByRange(activities, range, new Date()) : []),
    [activities, range, format],
  );
  const content = useMemo(() => {
    if (!format) return '';
    return format === 'csv' ? toCsv(records, tags, fields) : toJson(records, tags);
  }, [format, records, tags, fields]);
  const fileName = `activity-log-${new Date().getFullYear()}.${format ?? 'csv'}`;

  const closeSheet = () => setFormat(null);

  const doExport = async () => {
    try {
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: format === 'csv' ? 'text/csv' : 'application/json',
          dialogTitle: '导出记录',
        });
      } else {
        setNotice('当前环境不支持分享，请在手机上使用。');
      }
    } catch (e) {
      setNotice('导出失败，请重试。');
    } finally {
      closeSheet();
    }
  };

  const doBackup = async () => {
    try {
      const text = buildBackup({
        activities,
        items,
        tags,
        themeId,
        overviewStyle,
        exportedAt: new Date().toISOString(),
      });
      const uri = FileSystem.cacheDirectory + `daily-activity-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: '保存备份' });
      } else {
        setNotice('当前环境不支持分享，请在手机上使用。');
      }
    } catch (e) {
      setNotice('备份失败，请重试。');
    }
  };

  const pickRestore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const data = parseBackup(text);
      setPendingRestore(data);
    } catch (e) {
      setNotice('无法读取该文件，请选择有效的 .json 备份。');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.roundBtn} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>导出与备份</Text>
        </View>

        {/* Overview */}
        <View style={styles.overview}>
          <View style={styles.overviewMain}>
            <Text style={styles.overviewNum}>
              {stats.count}
              <Text style={styles.overviewNumUnit}> 条记录</Text>
            </Text>
            <Text style={styles.overviewSub}>
              {stats.itemCount} 个事件 · {stats.tagCount} 个标签
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View>
            <Text style={styles.overviewSub}>最早</Text>
            <Text style={styles.overviewEarliest}>{stats.earliestLabel}</Text>
          </View>
        </View>

        {/* Export */}
        <Text style={styles.sectionLabel}>导出数据</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => {
              setFormat('csv');
            }}
            style={({ pressed }) => [styles.row, styles.rowBorder, pressed && styles.pressed]}
          >
            <View style={[styles.badge, { backgroundColor: '#E9EEE6' }]}>
              <Text style={[styles.badgeText, { color: '#5E7257' }]}>CSV</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>导出为 CSV</Text>
              <Text style={styles.rowDesc}>表格软件可打开（Excel / Numbers）</Text>
            </View>
            <ShareIcon color={c.muted3} size={17} />
          </Pressable>
          <Pressable
            onPress={() => {
              setFormat('json');
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.badge, { backgroundColor: '#E7ECEF' }]}>
              <Text style={[styles.badgeText, { color: '#5E7080', fontSize: 9 }]}>JSON</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>导出为 JSON</Text>
              <Text style={styles.rowDesc}>含心情、天气、备注的完整结构</Text>
            </View>
            <ShareIcon color={c.muted3} size={17} />
          </Pressable>
        </View>

        {/* Backup */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>本地备份</Text>
        <View style={styles.card}>
          <Pressable
            onPress={doBackup}
            style={({ pressed }) => [styles.row, styles.rowBorder, pressed && styles.pressed]}
          >
            <View style={[styles.badge, { backgroundColor: '#F4EFE0' }]}>
              <DownloadIcon color="#897B5E" size={18} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>立即备份</Text>
              <Text style={styles.rowDesc}>导出完整备份（含事件、标签、设置）</Text>
            </View>
            <Text style={styles.backupPill}>备份</Text>
          </Pressable>
          <Pressable onPress={pickRestore} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>从备份恢复</Text>
              <Text style={styles.rowDesc}>导入 .json 备份文件，覆盖当前数据</Text>
            </View>
            <DownloadIcon color={c.muted3} size={17} />
          </Pressable>
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>

      {/* Export sheet */}
      <Modal visible={!!format} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetFill}>
          <Pressable style={styles.sheetScrim} onPress={closeSheet} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHead}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: format === 'csv' ? '#E9EEE6' : '#E7ECEF' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: format === 'csv' ? '#5E7257' : '#5E7080', fontSize: format === 'csv' ? 10 : 9 },
                  ]}
                >
                  {format === 'csv' ? 'CSV' : 'JSON'}
                </Text>
              </View>
              <View>
                <Text style={styles.sheetTitle}>导出为 {format === 'csv' ? 'CSV' : 'JSON'}</Text>
                <Text style={styles.sheetSub}>选择导出范围</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>时间范围</Text>
            <View style={styles.rangeRow}>
              {RANGES.map((r) => {
                const active = range === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setRange(r.id)}
                    style={[styles.rangeChip, active && styles.rangeChipActive]}
                  >
                    <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {format === 'csv' && (
              <>
                <Text style={styles.fieldLabel}>包含字段</Text>
                <View style={styles.fieldsCard}>
                  <View style={[styles.fieldRow, styles.rowBorder]}>
                    <Text style={styles.fieldText}>事件 · 标签 · 时间</Text>
                    <View style={[styles.check, styles.checkOn]}>
                      <CheckIcon color="#FFFFFF" size={12} />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setFields((f) => ({ ...f, moodWeather: !f.moodWeather }))}
                    style={[styles.fieldRow, styles.rowBorder]}
                  >
                    <Text style={styles.fieldText}>心情 · 天气</Text>
                    <View style={[styles.check, fields.moodWeather ? styles.checkOn : styles.checkOff]}>
                      {fields.moodWeather && <CheckIcon color="#FFFFFF" size={12} />}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setFields((f) => ({ ...f, note: !f.note }))}
                    style={styles.fieldRow}
                  >
                    <Text style={styles.fieldText}>备注（一句话）</Text>
                    <View style={[styles.check, fields.note ? styles.checkOn : styles.checkOff]}>
                      {fields.note && <CheckIcon color="#FFFFFF" size={12} />}
                    </View>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.filePreview}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={styles.fileSize}>{sizeLabel(content)}</Text>
            </View>

            <Pressable
              onPress={doExport}
              disabled={records.length === 0}
              style={({ pressed }) => [
                styles.exportBtn,
                records.length === 0 && styles.exportDisabled,
                pressed && records.length > 0 ? styles.pressed : null,
              ]}
            >
              <ShareIcon color="#FFFFFF" size={16} />
              <Text style={styles.exportText}>导出 {records.length} 条记录</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Restore confirm */}
      {pendingRestore && (
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmScrim} onPress={() => setPendingRestore(null)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>从备份恢复</Text>
            <Text style={styles.confirmBody}>
              将用备份中的 {pendingRestore.activities.length} 条记录、{pendingRestore.items.length} 个事件、
              {pendingRestore.tags.length} 个标签覆盖当前数据，此操作无法撤销。
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPendingRestore(null)}
                style={[styles.confirmButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onRestore(pendingRestore);
                  setPendingRestore(null);
                  setNotice('已从备份恢复。');
                }}
                style={[styles.confirmButton, styles.restoreButton]}
              >
                <Text style={styles.restoreText}>确认恢复</Text>
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
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundBtn: {
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
  title: { fontSize: 22, fontWeight: '800', color: c.ink },
  overview: {
    marginTop: 18,
    backgroundColor: c.sheet,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  overviewMain: { flex: 1, gap: 1 },
  overviewNum: { fontSize: 24, fontWeight: '800', color: c.ink },
  overviewNumUnit: { fontSize: 12, fontWeight: '700', color: c.muted3 },
  overviewSub: { fontSize: 11, fontWeight: '600', color: c.muted3 },
  overviewDivider: { width: 1, height: 34, backgroundColor: c.divider },
  overviewEarliest: { fontSize: 13, fontWeight: '800', color: c.ink },
  sectionLabel: { marginTop: 22, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: c.gold, paddingLeft: 2 },
  card: {
    marginTop: 10,
    backgroundColor: c.card,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.inputBg },
  pressed: { opacity: 0.6 },
  badge: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: -0.3 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: c.ink },
  rowDesc: { fontSize: 11, fontWeight: '600', color: c.muted3 },
  backupPill: {
    fontSize: 11.5,
    fontWeight: '800',
    color: c.accentInk,
    backgroundColor: c.accentSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  notice: { marginTop: 16, fontSize: 12, fontWeight: '600', color: c.muted, textAlign: 'center' },

  sheetFill: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 13,
    gap: 14,
    shadowColor: '#322E2A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: '#DAD3C7', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  sheetSub: { fontSize: 11, fontWeight: '600', color: c.muted3 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rangeChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  rangeChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  rangeText: { fontSize: 12, fontWeight: '700', color: c.muted },
  rangeTextActive: { color: '#FFFFFF', fontWeight: '800' },
  fieldsCard: { backgroundColor: c.card, borderRadius: 14, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 11 },
  fieldText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.ink },
  check: { width: 19, height: 19, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: c.accent },
  checkOff: { borderWidth: 1.5, borderColor: c.border },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.inputBg,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  fileName: { flex: 1, fontSize: 11.5, fontWeight: '700', color: c.muted },
  fileSize: { fontSize: 10.5, fontWeight: '600', color: c.gold },
  exportBtn: {
    backgroundColor: c.fab,
    borderRadius: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  exportDisabled: { opacity: 0.45 },
  exportText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800', letterSpacing: 0.5 },

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
  restoreButton: { backgroundColor: '#9B6E64' },
  cancelText: { fontSize: 14, fontWeight: '800', color: c.muted },
  restoreText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
