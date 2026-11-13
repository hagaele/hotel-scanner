import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { HotelForm } from '@/components/HotelForm';
import { StateView } from '@/components/StateView';
import { hotelToFormValues, updateHotel } from '@/data/hotelsRepository';
import { useHotels } from '@/data/useHotels';

/** Edição de hotel: troca nomes e links. Os preços e o histórico são mantidos. */
export default function EditarHotelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hotels, loading, error } = useHotels();

  if (loading) return <StateView kind="loading" message="Carregando hotel..." />;
  if (error) return <StateView kind="error" message={error} />;

  const hotel = hotels.find((h) => h.id === id);
  if (!hotel) return <StateView kind="error" message="Hotel não encontrado. Ele pode ter sido removido." />;

  return (
    <HotelForm
      key={hotel.id}
      initialValues={hotelToFormValues(hotel)}
      submitLabel="Salvar alterações"
      successMessage="Alterações salvas."
      onSubmit={(values) => updateHotel(hotel.id, values)}
      successActions={<Button title="Voltar ao hotel" onPress={() => router.back()} />}
    />
  );
}
