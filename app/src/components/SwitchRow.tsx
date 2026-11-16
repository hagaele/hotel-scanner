import { Platform, StyleSheet, Switch, View } from 'react-native';

import { spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type SwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * Chave liga/desliga nativa (Switch) com as cores do tema.
 * Na web o botão da chave ligada usa outra propriedade (activeThumbColor): sem ela fica verde-água.
 */
export function ThemedSwitch({ value, onChange, accessibilityLabel, disabled }: SwitchProps) {
  const { colors } = useTheme();
  const webThumb = Platform.OS === 'web' ? ({ activeThumbColor: colors.onPrimary } as object) : {};
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.primary, false: colors.border }}
      thumbColor={value ? colors.onPrimary : colors.textMuted}
      {...webThumb}
    />
  );
}

type Props = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Linha com rótulo e chave liga/desliga. */
export function SwitchRow({ label, hint, value, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        ) : null}
      </View>
      <ThemedSwitch value={value} onChange={onChange} accessibilityLabel={label} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  texts: { flex: 1, gap: 2 },
});
