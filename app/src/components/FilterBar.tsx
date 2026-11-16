import { Fragment, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { breakpoints, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type FilterBarItem = {
  key: string;
  /** Título do filtro: todos com o mesmo tamanho de fonte. */
  title: string;
  /** Linha curta abaixo do controle (opcional). */
  hint?: string;
  control: ReactNode;
  /** Peso na divisão da largura (controles mais largos pedem mais espaço). Padrão: 1. */
  weight?: number;
};

/** Largura de cada filtro quando a barra rola de lado (celular). */
const ITEM_WIDTH = 210;
/** Largura mínima, por unidade de peso, para os filtros caberem lado a lado sem rolar. */
const MIN_WIDTH_PER_WEIGHT = 150;

/**
 * Barra de filtros lado a lado, separados por barras verticais.
 * Em telas largas os filtros dividem a largura; no celular a barra rola de lado,
 * mantendo os filtros na horizontal em vez de empilhar.
 */
export function FilterBar({ items }: { items: FilterBarItem[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const fits = width >= Math.max(breakpoints.twoColumns, totalWeight * MIN_WIDTH_PER_WEIGHT);

  const row = (
    <View style={styles.row}>
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} aria-hidden />}
          <View style={[styles.item, i === 0 && styles.first, fits ? { flex: item.weight ?? 1, minWidth: 0 } : { width: ITEM_WIDTH * (item.weight ?? 1) }]}>
            <AppText variant="label">{item.title}</AppText>
            {item.control}
            {item.hint ? (
              <AppText variant="caption" muted>
                {item.hint}
              </AppText>
            ) : null}
          </View>
        </Fragment>
      ))}
    </View>
  );

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {fits ? (
        row
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scroll}>
          {row}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  scroll: { paddingBottom: spacing.xs },
  item: { gap: spacing.sm, paddingHorizontal: spacing.md, justifyContent: 'flex-start' },
  first: { paddingLeft: 0 },
  divider: { width: 1, alignSelf: 'stretch' },
});
