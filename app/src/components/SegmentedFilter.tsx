import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Opções mais estreitas, para caber em barras de filtro. */
  compact?: boolean;
};

/** Botões de opção lado a lado (ex.: "Todos" / "Só em destaque"); o escolhido fica em grafite, como no mockup. */
export function SegmentedFilter<T extends string>({ options, value, onChange, compact }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.option,
              compact && styles.compact,
              {
                backgroundColor: selected ? colors.ink : colors.card,
                borderColor: selected ? colors.ink : colors.inputBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <AppText variant="label" color={selected ? colors.onInk : colors.text} style={styles.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, alignSelf: 'flex-start' },
  option: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: { fontFamily: fonts.semibold },
  compact: { paddingHorizontal: spacing.md },
});
