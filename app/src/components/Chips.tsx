import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fonts, radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  /** Nome do grupo, lido por leitores de tela. */
  label: string;
  options: Option<T>[];
  /** Escolha única: a opção marcada. */
  value?: T;
  /** Escolha múltipla: as opções marcadas (cada toque liga ou desliga uma). */
  values?: T[];
  /** Opções que não podem ser marcadas agora (aparecem apagadas). */
  disabledValues?: T[];
  onChange: (value: T) => void;
  /** Uma linha com rolagem lateral (muitas opções) em vez de quebrar linha. */
  scroll?: boolean;
};

/** Pílulas de escolha (localização, unidade, seção, hotéis do usuário): a escolhida fica em grafite, como no mockup. */
export function Chips<T extends string>({ label, options, value, values, disabledValues, onChange, scroll }: Props<T>) {
  const { colors } = useTheme();

  const chips = options.map((option) => {
    const selected = values ? values.includes(option.value) : option.value === value;
    const disabled = !selected && (disabledValues?.includes(option.value) ?? false);
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        disabled={disabled}
        accessibilityRole={values ? 'checkbox' : 'button'}
        accessibilityState={values ? { checked: selected, disabled } : { selected, disabled }}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: selected ? colors.ink : colors.card,
            borderColor: selected ? colors.ink : colors.inputBorder,
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}>
        <AppText variant="label" color={selected ? colors.onInk : colors.text} numberOfLines={1} style={styles.text}>
          {option.label}
        </AppText>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={label}
        contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.row, styles.wrap]} accessibilityLabel={label}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
  text: { fontFamily: fonts.semibold },
  chip: {
    minHeight: touchTarget - 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
