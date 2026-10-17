import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppButton } from './AppButton';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl }]} onPress={() => undefined}>
          <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>{message}</Text>
          <View style={[styles.actions, { gap: spacing.md, marginTop: spacing.xl }]}>
            <View style={{ flex: 1 }}>
              <AppButton label={cancelLabel} onPress={onCancel} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={confirmLabel}
                onPress={onConfirm}
                variant={destructive ? 'danger' : 'primary'}
                accessibilityLabel={confirmLabel}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface TextInputDialogProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function TextInputDialog({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel,
  onConfirm,
  onCancel,
}: TextInputDialogProps) {
  const { colors, typography, spacing, radii } = useTheme();
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl }]} onPress={() => undefined}>
          <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: colors.border, borderRadius: radii.md, marginTop: spacing.lg },
            ]}
          >
            <TextInput
              accessibilityLabel={title}
              autoCorrect={false}
              autoFocus
              multiline
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              style={[typography.body, styles.input, { color: colors.text }]}
              value={value}
            />
          </View>
          <View style={[styles.actions, { gap: spacing.md, marginTop: spacing.xl }]}>
            <View style={{ flex: 1 }}>
              <AppButton label="Cancel" onPress={onCancel} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label={confirmLabel} onPress={() => onConfirm(value)} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
  },
  actions: {
    flexDirection: 'row',
  },
  inputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
