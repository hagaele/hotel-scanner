import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useTheme } from '@/theme/useTheme';

/**
 * Pilha (Native Stack) de uma aba. Cada aba principal tem a sua: Visão geral, Calendário, Catálogo e Alertas.
 *
 * As telas de detalhe (hotel, comparativo, leitura, cadastro e edição) ficam em
 * `(tabs)/(1-painel,2-calendario,3-catalogo,4-alertas)/` e são compartilhadas pelas quatro pilhas ("shared routes"):
 * aberto pelo Calendário, o comparativo entra na pilha do Calendário, a aba continua marcada e
 * "Voltar" (ou o gesto de arrastar da borda no iPhone) retorna ao Calendário.
 *
 * O cabeçalho da pilha fica oculto: a barra superior do app (AppHeader, nas abas) mostra a marca, o menu
 * e o botão "Voltar", que desempilha a tela atual.
 */
export function TabStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // No iPhone, voltar arrastando de qualquer ponto da tela, não só da borda.
        fullScreenGestureEnabled: Platform.OS === 'ios',
      }}
    />
  );
}
