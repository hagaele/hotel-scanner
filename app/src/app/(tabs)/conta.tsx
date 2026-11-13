import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useHotels } from '@/data/useHotels';
import { authErrorMessage } from '@/lib/authErrors';
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

/** Conta: usuário logado, dados do cliente e botão "Sair". */
export default function ContaScreen() {
  const { colors } = useTheme();
  const { client } = useHotels();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <View style={styles.container}>
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

      {error && (
        <AppText variant="label" color={colors.error} accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Button title="Sair" variant="danger" onPress={handleSignOut} loading={signingOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
});
