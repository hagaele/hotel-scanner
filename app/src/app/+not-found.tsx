import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { StateView } from '@/components/StateView';
import { spacing } from '@/theme/tokens';

/** Endereço que não existe no app (link antigo ou digitado errado): mensagem em português e caminho de volta. */
export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <StateView kind="error" message="Esta página não existe. O link pode estar errado ou o conteúdo foi removido." />
      <View style={styles.actions}>
        <Button title="Ir para a visão geral" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  actions: { padding: spacing.xl, alignSelf: 'center', width: '100%', maxWidth: 360 },
});
