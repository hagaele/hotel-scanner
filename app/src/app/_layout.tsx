import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

/** Raiz do app: o AuthProvider envolve tudo para qualquer tela saber quem está logado. */
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * Navegador raiz: uma pilha (Stack) com proteção de rotas.
 * - Sem login: só o grupo "(auth)" (login e esqueci-senha) existe. Qualquer outra rota volta para o login.
 * - Com login: só as abas "(tabs)" e o detalhe "hotel/[id]" existem.
 * Quando o usuário entra ou sai, o Stack.Protected troca as telas sozinho
 * (redirectTo leva para o login ao sair e para o painel ao entrar).
 * A splash fica visível até as fontes carregarem e o Firebase dizer se já há sessão salva,
 * para a tela de login não "piscar" para quem já está logado.
 */
function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { user, initializing } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  const ready = (fontsLoaded || !!fontError) && !initializing;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const isLoggedIn = user !== null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.semibold },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={isLoggedIn} redirectTo="/login">
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="hotel/[id]" options={{ title: 'Detalhe do hotel', headerBackTitle: 'Painel' }} />
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn} redirectTo="/">
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
