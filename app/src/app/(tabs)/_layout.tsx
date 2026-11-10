import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Barra de navegação inferior: Painel, Destaques e Conta. */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ focused, size }) => <Ionicons name="grid-outline" size={size} color={focused ? colors.primary : colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="destaques"
        options={{
          title: 'Destaques',
          tabBarIcon: ({ focused, size }) => <Ionicons name="flag-outline" size={size} color={focused ? colors.primary : colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ focused, size }) => <Ionicons name="person-circle-outline" size={size} color={focused ? colors.primary : colors.textMuted} />,
        }}
      />
    </Tabs>
  );
}
