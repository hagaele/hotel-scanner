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

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

/**
 * Navegador raiz: uma pilha (Stack).
 * Dentro dela ficam o grupo de abas "(tabs)" e a tela de detalhe do hotel,
 * que abre por cima das abas e ganha botão de voltar.
 */
export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [loaded, error] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="hotel/[id]" options={{ title: 'Detalhe do hotel', headerBackTitle: 'Painel' }} />
      </Stack>
    </>
  );
}
