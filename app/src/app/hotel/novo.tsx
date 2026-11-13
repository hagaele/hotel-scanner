import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { HotelForm } from '@/components/HotelForm';
import { createHotel } from '@/data/hotelsRepository';
import { useHotels } from '@/data/useHotels';
import { spacing } from '@/theme/tokens';

/** Cadastro de hotel: seu hotel + 3 concorrentes. Aparece no fim da lista do painel. */
export default function NovoHotelScreen() {
  const { hotels } = useHotels();
  const [createdId, setCreatedId] = useState<string | null>(null);

  return (
    <HotelForm
      submitLabel="Cadastrar hotel"
      successMessage="Hotel cadastrado. Registre a primeira leitura de preço para ele aparecer na comparação."
      onSubmit={async (values) => {
        const nextOrder = hotels.reduce((max, h) => Math.max(max, h.order), 0) + 1;
        setCreatedId(await createHotel(values, nextOrder));
      }}
      successActions={
        createdId && (
          <View style={styles.actions}>
            <Button
              title="Ver hotel"
              onPress={() => router.replace({ pathname: '/hotel/[id]', params: { id: createdId } })}
            />
            <Button title="Voltar ao painel" variant="secondary" onPress={() => router.back()} />
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
