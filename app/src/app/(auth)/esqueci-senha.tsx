import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import { validateEmail } from '@/lib/validation';
import { layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Recuperação de senha: o Firebase envia um e-mail com o link para criar uma nova senha.
 * A confirmação é a mesma exista ou não a conta (para não revelar quais e-mails estão cadastrados).
 */
export default function EsqueciSenhaScreen() {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;

    setSending(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
      // Conta inexistente: mostra a mesma confirmação, sem revelar nada.
      if (code === 'auth/user-not-found') setSent(true);
      else setError(authErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {sent ? (
            <View style={styles.gap} accessibilityLiveRegion="polite">
              <AppText variant="title">Enviamos um link para seu e-mail</AppText>
              <AppText muted>
                Se existir uma conta para {email.trim()}, o link para criar uma nova senha chega em alguns minutos.
                Confira também a caixa de spam.
              </AppText>
              <Button title="Voltar para o login" onPress={() => router.back()} />
            </View>
          ) : (
            <View style={styles.gap}>
              <AppText muted>Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</AppText>
              <TextField
                label="E-mail"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(validateEmail(text));
                }}
                error={error ?? undefined}
                placeholder="nome@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                editable={!sending}
              />
              <Button title="Enviar link" onPress={handleSubmit} loading={sending} />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.xl, maxWidth: layout.formMaxWidth, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl },
  gap: { gap: spacing.lg },
});
