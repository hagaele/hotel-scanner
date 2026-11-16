import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = { kind: 'success' | 'error'; message: string };

/** Aviso de resultado de uma operação (salvou, apagou, deu erro). Ícone + texto, nunca só cor. */
export function Banner({ kind, message }: Props) {
  const { colors } = useTheme();
  const tone = kind === 'success' ? colors.primary : colors.error;
  return (
    <View
      style={[styles.banner, { borderColor: tone, backgroundColor: colors.card }]}
      accessibilityRole="alert"
      accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}>
      <Ionicons name={kind === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={tone} />
      <AppText variant="label" color={tone} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { flex: 1 },
});
