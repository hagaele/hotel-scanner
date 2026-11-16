import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ConfirmSheetProvider } from '@/components/ConfirmSheet';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { HotelsProvider } from '@/context/HotelsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

/**
 * Raiz do app. Três estados globais (Context API) envolvem tudo:
 * - ThemeProvider: tema claro, escuro ou o do aparelho;
 * - ConfirmSheetProvider: confirmações em folha inferior (no lugar do alerta do sistema);
 * - AuthProvider: quem está logado;
 * - HotelsProvider: dados da rede em tempo real (hotéis, tarifas, eventos, alertas), compartilhados por todas as telas.
 */
/** Erro inesperado numa tela: mensagem em português e "Tentar de novo" no lugar da tela em branco. */
export { AppErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ConfirmSheetProvider>
        <AuthProvider>
          <HotelsProvider>
            <RootNavigator />
          </HotelsProvider>
        </AuthProvider>
      </ConfirmSheetProvider>
    </ThemeProvider>
  );
}

/**
 * Navegador raiz: uma pilha (Stack) com proteção de rotas.
 * - Sem login: só o grupo "(auth)" (login e esqueci-senha) existe. Qualquer outra rota volta para o login.
 * - Com login: o grupo "(tabs)": abas com uma pilha (Stack) em cada uma, onde entram as telas de detalhe,
 *   comparativo e formulários (o menu continua visível). Ver src/app/(tabs)/_layout.tsx.
 * Quando o usuário entra ou sai, o Stack.Protected troca as telas sozinho
 * (redirectTo leva para o login ao sair e para o painel ao entrar).
 * A splash fica visível até as fontes carregarem e o Firebase dizer se já há sessão salva,
 * para a tela de login não "piscar" para quem já está logado.
 */
function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { user, initializing } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
          // Barra superior escura, como no mockup.
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontFamily: fonts.displaySemibold },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={isLoggedIn} redirectTo="/login">
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn} redirectTo="/">
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
