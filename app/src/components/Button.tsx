import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  /** Mostra o indicador de carregamento e impede toques repetidos. */
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

/** Botão padrão do app (principal, secundário, perigo ou link). */
export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const background =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.error : 'transparent';
  const textColor =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.onPrimary : variant === 'link' ? colors.primary : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        variant !== 'link' && styles.boxed,
        { backgroundColor: background },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        (pressed || inactive) && { opacity: inactive ? 0.6 : 0.85 },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText variant="label" color={textColor} style={variant === 'link' && styles.linkText}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  boxed: { borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: touchTarget + 4 },
  linkText: { textDecorationLine: 'underline' },
});
