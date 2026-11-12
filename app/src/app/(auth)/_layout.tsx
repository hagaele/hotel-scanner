import { Stack } from 'expo-router';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Telas de quem ainda não entrou: login e recuperação de senha.
 * O grupo "(auth)" não aparece na URL (fica /login e /esqueci-senha).
 * O acesso a este grupo é controlado em src/app/_layout.tsx.
 */
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="esqueci-senha" options={{ title: 'Recuperar senha', headerBackTitle: 'Login' }} />
    </Stack>
  );
}
