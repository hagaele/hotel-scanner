import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { HotelForm } from '@/components/HotelForm';
import { StateView } from '@/components/StateView';
import {
  competitorKeyOf,
  competitorToFormValues,
  formContextFor,
  ownToFormValues,
  updateCompetitor,
  updateOwnHotel,
} from '@/data/hotelsRepository';
import { useHotels } from '@/data/useHotels';

/**
 * Edição de um item por vez.
 * - Sem "propriedade" (ou com o id do próprio hotel): edita o hotel da rede (nome, link, localização e preço-piso).
 * - Com o id de um concorrente: edita nome, link e os hotéis da rede com que ele concorre, em todos os vínculos.
 * Preços e histórico são mantidos.
 */
export default function EditarScreen() {
  const { id, propriedade } = useLocalSearchParams<{ id: string; propriedade?: string }>();
  const { hotels, loading, error } = useHotels();

  if (loading) return <StateView kind="loading" message="Carregando hotel..." />;
  if (error) return <StateView kind="error" message={error} />;

  const hotel = hotels.find((h) => h.id === id);
  if (!hotel) return <StateView kind="error" message="Hotel não encontrado. Ele pode ter sido removido." />;

  const competitor = propriedade ? hotel.competitors.find((c) => c.id === propriedade) : undefined;
  if (propriedade && propriedade !== hotel.own.id && !competitor) {
    return <StateView kind="error" message="Concorrente não encontrado. O vínculo pode ter sido removido." />;
  }

  const back = <Button title="Voltar ao hotel" onPress={() => router.dismissTo({ pathname: '/hotel/[id]', params: { id: hotel.id } })} />;

  if (competitor) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editar concorrente' }} />
        <HotelForm
          key={competitor.id}
          initialValues={competitorToFormValues(competitor, hotels)}
          context={formContextFor(hotels, { exceptKey: competitorKeyOf(competitor) })}
          canChangeKind={false}
          submitLabel={() => 'Salvar concorrente'}
          successMessage={() => 'Concorrente atualizado em todos os hotéis marcados.'}
          onSubmit={(values) => updateCompetitor(competitor, values, hotels)}
          successActions={() => back}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Editar hotel' }} />
      <HotelForm
        key={hotel.id}
        initialValues={ownToFormValues(hotel)}
        context={formContextFor(hotels, { exceptHotelId: hotel.id })}
        canChangeKind={false}
        submitLabel={() => 'Salvar hotel'}
        successMessage={() => 'Alterações salvas.'}
        onSubmit={(values) => updateOwnHotel(hotel.id, values)}
        successActions={() => back}
      />
    </>
  );
}

