import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { DateInfo, DateKind } from '@/lib/market';
import { radius, spacing, fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

const ICONS: Record<DateKind, keyof typeof Ionicons.glyphMap> = {
  feriado: 'flag-outline',
  evento: 'people-outline',
  vespera: 'arrow-forward-circle-outline',
  fim_de_semana: 'sunny-outline',
  util: 'briefcase-outline',
};

type Props = { info: DateInfo; /** Mostra o nome do feriado ou evento junto. */ withName?: boolean };

/** Selo do tipo de data (feriado, evento, véspera, fim de semana, dia útil): ícone + texto. */
export function DateTypeTag({ info, withName }: Props) {
  const { colors } = useTheme();
  const tone =
    info.kind === 'feriado' || info.kind === 'vespera'
      ? colors.pricier
      : info.kind === 'evento'
        ? colors.event
        : info.kind === 'fim_de_semana'
          ? colors.cheaper
          : colors.textMuted;
  const text = withName && info.name ? `${info.label}: ${info.name}` : info.label;
  return (
    <View style={[styles.tag, { borderColor: tone }]}>
      <Ionicons name={ICONS[info.kind]} size={14} color={tone} />
      <AppText variant="caption" color={tone} style={styles.text} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  text: { fontFamily: fonts.semibold, flexShrink: 1 },
});
