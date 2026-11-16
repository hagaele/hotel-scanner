import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Tela mostrada quando um erro inesperado quebra uma tela: em vez da tela em branco,
 * uma mensagem em português e o botão para tentar de novo. Os dados no Firestore não são afetados.
 * Fica fora dos provedores de tema, por isso usa cores neutras fixas.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <AppText variant="title" style={styles.text}>
        Algo deu errado nesta tela
      </AppText>
      <AppText variant="body" color="#5B6472" style={styles.text}>
        Seus dados estão salvos. Tente de novo; se o erro continuar, volte à visão geral.
      </AppText>
      {__DEV__ && (
        <AppText variant="caption" color="#B42318" style={styles.text}>
          {error.message}
        </AppText>
      )}
      <View style={styles.actions}>
        <Button title="Tentar de novo" onPress={retry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: '#F5F6F8' },
  text: { textAlign: 'center', maxWidth: 420 },
  actions: { width: '100%', maxWidth: 320 },
});
