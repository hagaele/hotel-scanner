import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Filtro de opções lado a lado (ex.: "Todos" / "Só em destaque"). */
export function SegmentedFilter<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.option, selected && { backgroundColor: colors.primary }]}>
            <AppText variant="label" color={selected ? colors.onPrimary : colors.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 2, alignSelf: 'flex-start' },
  option: {
    minHeight: touchTarget - 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md - 2,
  },
});
