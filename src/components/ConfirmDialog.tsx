import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '../theme';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  /** confirm button colour; defaults to the destructive clay-red */
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation dialog with a scrim. Render it conditionally
 * (e.g. `{pending && <ConfirmDialog … />}`) as the last child of a screen's
 * root view so it overlays everything.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor = '#9B6E64',
  onConfirm,
  onCancel,
}: Props) {
  const c = useTheme();
  const styles = createStyles(c);
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onCancel} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{message}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onCancel} style={[styles.button, styles.cancel]}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={[styles.button, { backgroundColor: confirmColor }]}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.scrim },
    card: {
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
    title: { fontSize: 18, fontWeight: '800', color: c.ink },
    body: { fontSize: 13, fontWeight: '500', color: c.muted, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    button: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12 },
    cancel: { backgroundColor: c.inputBg },
    cancelText: { fontSize: 14, fontWeight: '800', color: c.muted },
    confirmText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  });
