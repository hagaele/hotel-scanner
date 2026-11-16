import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fonts, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Abas de seção com sublinhado azul na escolhida, como no Catálogo do mockup. Rolam de lado no celular. */
export function UnderlineTabs<T extends string>({ label, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={label}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, { borderBottomColor: selected ? colors.primary : 'transparent' }]}>
              <AppText variant="label" color={selected ? colors.text : colors.textMuted} style={styles.text}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 1 },
  tab: { minHeight: touchTarget, paddingHorizontal: spacing.lg, justifyContent: 'center', borderBottomWidth: 3, marginBottom: -1 },
  text: { fontFamily: fonts.semibold },
});
