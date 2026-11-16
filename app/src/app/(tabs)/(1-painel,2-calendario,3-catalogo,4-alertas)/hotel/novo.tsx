import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { HotelForm } from '@/components/HotelForm';
import { StateView } from '@/components/StateView';
import { createCompetitor, createOwnHotel, formContextFor } from '@/data/hotelsRepository';
import { useHotels } from '@/data/useHotels';
import { emptyHotelForm } from '@/lib/hotelForm';
import { spacing } from '@/theme/tokens';

/**
 * Cadastro, um hotel por vez: um hotel da rede ou um concorrente.
 * Parâmetros opcionais: tipo=concorrente abre já no concorrente; hotel=<id> deixa esse hotel da rede marcado.
 */
export default function NovoCadastroScreen() {
  const { tipo, hotel } = useLocalSearchParams<{ tipo?: string; hotel?: string }>();
  const { hotels, loading, error } = useHotels();
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Trocar a chave remonta o formulário vazio para cadastrar outro.
  const [formKey, setFormKey] = useState(0);

  if (loading) return <StateView kind="loading" message="Carregando hotéis..." />;
  if (error) return <StateView kind="error" message={error} />;

  const kind = tipo === 'concorrente' ? 'competitor' : 'own';
  const preselected = hotel && hotels.some((h) => h.id === hotel) ? [hotel] : [];

  return (
    <HotelForm
      // A chave inclui os parâmetros: "Adicionar concorrente a este hotel" troca tipo/hotel na mesma tela.
      key={`${formKey}-${tipo ?? ''}-${hotel ?? ''}`}
      initialValues={emptyHotelForm(kind, preselected)}
      context={formContextFor(hotels)}
      canChangeKind
      submitLabel={(k) => (k === 'own' ? 'Cadastrar hotel' : 'Cadastrar concorrente')}
      successMessage={(k) =>
        k === 'own'
          ? 'Hotel cadastrado. Agora vincule os concorrentes dele e registre a primeira leitura de preço.'
          : 'Concorrente cadastrado e vinculado.'
      }
      onSubmit={async (values) => {
        if (values.kind === 'own') {
          const nextOrder = hotels.reduce((max, h) => Math.max(max, h.order), 0) + 1;
          setCreatedId(await createOwnHotel(values, nextOrder));
        } else {
          await createCompetitor(values, hotels);
          setCreatedId(values.hotelIds[0] ?? null);
        }
      }}
      successActions={(values) => (
        <View style={styles.actions}>
          {values.kind === 'own' && createdId && (
            <Button
              title="Adicionar concorrente a este hotel"
              onPress={() => {
                router.setParams({ tipo: 'concorrente', hotel: createdId });
              }}
            />
          )}
          <Button
            title={values.kind === 'own' ? 'Cadastrar outro' : 'Cadastrar outro concorrente'}
            variant={values.kind === 'own' ? 'secondary' : 'primary'}
            onPress={() => setFormKey((k) => k + 1)}
          />
          {createdId && (
            <Button
              title="Ver hotel"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/hotel/[id]', params: { id: createdId } })}
            />
          )}
          <Button
            title="Concluir"
            variant="link"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});

