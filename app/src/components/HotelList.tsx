import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { HotelSummary } from '@/lib/pricing';
import { breakpoints, layout, spacing } from '@/theme/tokens';

import { HotelCard } from './HotelCard';
import { StateView } from './StateView';

type Props = {
  summaries: HotelSummary[];
  emptyMessage: string;
  header?: ReactElement;
  /** Rodapé da lista (ex.: nota sobre a origem dos dados). */
  footer?: ReactElement;
  /** Largura disponível para calcular as colunas (padrão: a janela inteira). */
  availableWidth?: number;
  /** Sugestão de preço exibida em cada cartão. */
  suggestionFor?: (summary: HotelSummary) => string | undefined;
};

/** Lista de cartões: 1 coluna no celular, 2 no tablet e 3 no desktop. */
export function HotelList({ summaries, emptyMessage, header, footer, availableWidth, suggestionFor }: Props) {
  const router = useRouter();
  const window = useWindowDimensions();
  const width = availableWidth ?? window.width;
  const columns = width >= breakpoints.threeColumns ? 3 : width >= breakpoints.twoColumns ? 2 : 1;

  return (
    <FlatList
      key={columns} // FlatList exige remontar quando o número de colunas muda
      data={summaries}
      numColumns={columns}
      keyExtractor={(item) => item.hotel.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={<StateView kind="empty" message={emptyMessage} />}
      contentContainerStyle={styles.content}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <HotelCard
            summary={item}
            suggestion={suggestionFor?.(item)}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: item.hotel.id } })}
            onCompare={() => router.push({ pathname: '/comparativo/[id]', params: { id: item.hotel.id } })}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  row: { gap: spacing.lg },
  cell: { flex: 1 },
});
