import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { seedExampleData } from '@/data/seed';
import { useHotels } from '@/data/useHotels';
import { authErrorMessage } from '@/lib/authErrors';
import { confirmAction } from '@/lib/confirm';
import { firestoreErrorMessage } from '@/lib/firestore';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Pede confirmação antes de sair. No navegador o Alert com botões não funciona, então usa o confirm da web. */
function confirmSignOut(onConfirm: () => void) {
  const message = 'Você precisará entrar de novo com e-mail e senha.';
  if (Platform.OS === 'web') {
    if (window.confirm(`Sair da conta?\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert('Sair da conta?', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: onConfirm },
  ]);
}

/** Conta: usuário logado, dados do cliente, carga de dados de exemplo e botão "Sair". */
export default function ContaScreen() {
  const { colors } = useTheme();
  const { client } = useHotels();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function handleSeed() {
    const confirmed = await confirmAction(
      'Carregar dados de exemplo?',
      'Grava no Firestore os 9 hotéis da Rede Litoral com os concorrentes e um histórico de leituras. Hotéis que já existem não são alterados.',
      'Carregar',
    );
    if (!confirmed) return;
    setSeedResult(null);
    setSeeding(true);
    try {
      const { created, skipped } = await seedExampleData();
      setSeedResult({
        kind: 'success',
        message:
          created > 0
            ? `${created} hotéis carregados${skipped ? ` (${skipped} já existiam)` : ''}. Confira o Painel.`
            : 'Os hotéis de exemplo já estavam no banco. Nada foi alterado.',
      });
    } catch (e) {
      setSeedResult({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSeeding(false);
    }
  }

  function handleSignOut() {
    confirmSignOut(async () => {
      setError(null);
      setSigningOut(true);
      try {
        // Ao sair, a proteção de rotas (src/app/_layout.tsx) leva para o login sozinha.
        await signOut();
      } catch (e) {
        setError(authErrorMessage(e));
        setSigningOut(false);
      }
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Conectado como
        </AppText>
        <AppText variant="title">{user?.email ?? '—'}</AppText>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Cliente
        </AppText>
        <AppText variant="title">{client.name}</AppText>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Limite de destaque
        </AppText>
        <AppText variant="title">{client.alertThresholdPct}% de diferença para a média</AppText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Administração
        </AppText>
        <AppText variant="body">
          Carrega os dados de exemplo da Rede Litoral no Firestore. Use uma vez, ao configurar um projeto novo.
        </AppText>
        <Button title="Carregar dados de exemplo" variant="secondary" onPress={handleSeed} loading={seeding} />
        {seedResult && <Banner kind={seedResult.kind} message={seedResult.message} />}
      </View>

      {error && (
        <AppText variant="label" color={colors.error} accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Button title="Sair" variant="danger" onPress={handleSignOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
});
