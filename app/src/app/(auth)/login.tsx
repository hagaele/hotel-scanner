import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField, type TextFieldRef } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import { hasErrors, validateEmail, validateLoginForm, validatePassword, type LoginErrors } from '@/lib/validation';
import { layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Tela de login (e-mail e senha).
 * Estados do formulário:
 * - erros por campo: aparecem ao sair do campo e ao tentar enviar;
 * - enviando: botão com indicador e campos bloqueados;
 * - erro do servidor: mensagem em português acima do botão.
 * Quando o login dá certo, não é preciso navegar: a proteção de rotas
 * (src/app/_layout.tsx) troca para o painel sozinha.
 */
export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passwordRef = useRef<TextFieldRef>(null);

  async function handleSubmit() {
    const formErrors = validateLoginForm(email, password);
    setErrors(formErrors);
    setTouched({ email: true, password: true });
    setSubmitError(null);
    if (hasErrors(formErrors)) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setSubmitError(authErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.brand }]}>
              <AppText variant="titleLg" color={colors.accent}>
                H
              </AppText>
            </View>
            <AppText variant="titleLg">HOFIX</AppText>
            <AppText muted style={styles.center}>
              Entre para acompanhar os preços dos seus hotéis e dos concorrentes.
            </AppText>
          </View>

          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (touched.email) setErrors((e) => ({ ...e, email: validateEmail(text) ?? undefined }));
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, email: true }));
                setErrors((e) => ({ ...e, email: validateEmail(email) ?? undefined }));
              }}
              error={touched.email ? errors.email : undefined}
              placeholder="nome@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!submitting}
            />

            <TextField
              ref={passwordRef}
              label="Senha"
              password
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (touched.password) setErrors((e) => ({ ...e, password: validatePassword(text) ?? undefined }));
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, password: true }));
                setErrors((e) => ({ ...e, password: validatePassword(password) ?? undefined }));
              }}
              error={touched.password ? errors.password : undefined}
              placeholder="Sua senha"
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />

            {submitError && (
              <View
                style={[styles.alert, { borderColor: colors.error }]}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive">
                <AppText variant="label" color={colors.error}>
                  {submitError}
                </AppText>
              </View>
            )}

            <Button title="Entrar" onPress={handleSubmit} loading={submitting} />

            <Button
              title="Esqueci minha senha"
              variant="link"
              onPress={() => router.push('/esqueci-senha')}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl, maxWidth: layout.formMaxWidth, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', gap: spacing.sm },
  logo: { width: layout.logoSize, height: layout.logoSize, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  form: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  alert: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
