import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { useHotelsData } from '@/context/HotelsContext';
import { breakpoints, fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Navegação em abas: Visão geral, Calendário, Catálogo, Alertas e Conta.
 * - Celular: barra de abas inferior + barra superior escura (AppHeader).
 * - Telas largas: as seções aparecem como links na barra superior, como no mockup, e a barra inferior some.
 *
 * Navegadores aninhados: Stack raiz (src/app/_layout.tsx) → estas abas → uma pilha (Stack) por aba.
 * Cada grupo "(1-painel)", "(2-calendario)", "(3-catalogo)" e "(4-alertas)" tem o seu _layout com a pilha; as telas
 * de detalhe são compartilhadas entre eles (pasta "(1-painel,2-calendario,3-catalogo,4-alertas)") e entram na pilha
 * da aba de onde foram abertas. O menu continua visível em todas.
 * Os números no nome dos grupos seguem a ordem das abas e não aparecem na URL. Eles existem porque um endereço de
 * detalhe aberto direto (recarga, link) cai no primeiro grupo em ordem alfabética: assim é a Visão geral.
 * backBehavior="history": ao trocar de aba, "voltar" retorna à aba anterior.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { unreadCount } = useHotelsData();
  const wide = width >= breakpoints.wide;

  const icon = (name: IconName) =>
    function TabIcon({ focused, size }: { focused: boolean; size: number }) {
      return <Ionicons name={name} size={size} color={focused ? colors.primary : colors.textMuted} />;
    };

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => (wide ? null : <BottomTabBar {...props} />)}
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium },
        sceneStyle: { backgroundColor: colors.background },
        // Some com o teclado aberto nos formulários (Android); no iPhone o teclado já cobre a barra.
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen name="(1-painel)" options={{ title: 'Visão geral', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="(2-calendario)" options={{ title: 'Calendário', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="(3-catalogo)" options={{ title: 'Catálogo', tabBarIcon: icon('search-outline') }} />
      <Tabs.Screen
        name="(4-alertas)"
        options={{
          title: 'Alertas',
          tabBarIcon: icon('notifications-outline'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.pricier, color: '#FFFFFF', fontFamily: fonts.semibold },
          tabBarAccessibilityLabel: `Alertas, ${unreadCount} não lidos`,
        }}
      />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}
