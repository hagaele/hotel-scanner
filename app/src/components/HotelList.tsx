import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { HotelSummary } from '@/lib/pricing';
import { breakpoints, spacing } from '@/theme/tokens';

import { HotelCard } from './HotelCard';
import { StateView } from './StateView';

type Props = {
  summaries: HotelSummary[];
  emptyMessage: string;
  header?: ReactElement;
};

/** Lista de cartões: 1 coluna no celular, 2 no tablet e 3 no desktop. */
export function HotelList({ summaries, emptyMessage, header }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= breakpoints.threeColumns ? 3 : width >= breakpoints.twoColumns ? 2 : 1;

  return (
    <FlatList
      key={columns} // FlatList exige remontar quando o número de colunas muda
      data={summaries}
      numColumns={columns}
      keyExtractor={(item) => item.hotel.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<StateView kind="empty" message={emptyMessage} />}
      contentContainerStyle={styles.content}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <HotelCard
            summary={item}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: item.hotel.id } })}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.md },
  cell: { flex: 1 },
});
