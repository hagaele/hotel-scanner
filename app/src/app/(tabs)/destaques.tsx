import { useMemo } from 'react';

import { HotelList } from '@/components/HotelList';
import { StateView } from '@/components/StateView';
import { useHotels } from '@/data/useHotels';
import { sortForDashboard, summarizeHotel } from '@/lib/pricing';

/** Destaques: só os hotéis cuja diferença para a média passou do limite do cliente. */
export default function DestaquesScreen() {
  const { client, hotels, now, loading, error } = useHotels();

  const highlighted = useMemo(
    () =>
      sortForDashboard(hotels.map((h) => summarizeHotel(h, client.alertThresholdPct, now))).filter(
        (s) => s.highlighted,
      ),
    [hotels, client.alertThresholdPct, now],
  );

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;

  return <HotelList summaries={highlighted} emptyMessage="Nenhum hotel em destaque agora" />;
}
