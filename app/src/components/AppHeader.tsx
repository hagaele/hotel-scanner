import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/context/AuthContext';
import { useHotelsData } from '@/context/HotelsContext';
import { formatFullDateTime } from '@/lib/format';
import { breakpoints, fonts, radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** Seções principais (as mesmas abas da barra inferior) e o grupo de rotas (pilha) de cada uma. */
export const MAIN_SECTIONS = [
  { href: '/', group: '(1-painel)', label: 'Visão geral', icon: 'grid-outline' },
  { href: '/calendario', group: '(2-calendario)', label: 'Calendário', icon: 'calendar-outline' },
  { href: '/catalogo', group: '(3-catalogo)', label: 'Catálogo', icon: 'search-outline' },
  { href: '/alertas', group: '(4-alertas)', label: 'Alertas', icon: 'notifications-outline' },
] as const;

/** Endereços das abas principais; qualquer outro é uma tela de detalhe (mostra "Voltar"). */
const MAIN_PATHS = ['/', '/calendario', '/catalogo', '/alertas', '/conta'];

/** Símbolo do HOFIX: um prédio estilizado, desenhado em vetor. */
export function LogoMark({ size = 28, color }: { size?: number; color: string }) {
  return (
    // Decorativo: o nome "HOFIX" ao lado já identifica a marca, então o desenho fica oculto para leitores de tela.
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 21V8l9-5 9 5v13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 21v-6h6v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/**
 * Barra superior escura do mockup: marca, horário da última leitura, sino com os alertas não lidos e a conta.
 * Em telas largas também mostra a navegação entre as seções (no celular ela fica na barra de abas inferior).
 */
export function AppHeader() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  // Ex.: ["(tabs)", "(2-calendario)", "comparativo", "[id]"]: o 2º trecho diz em qual aba (pilha) a tela está.
  const segments = useSegments() as string[];
  const currentSection = MAIN_SECTIONS.find((s) => s.group === segments[1]);
  const { user } = useAuth();
  const { hotels, unreadCount } = useHotelsData();
  const wide = width >= breakpoints.wide;
  const isDetail = !MAIN_PATHS.includes(pathname);
  const { id: strayId } = useGlobalSearchParams<{ id?: string }>();

  // Detalhe aberto pelo endereço direto: a base da pilha herda o "id" do detalhe e, ao voltar, a URL ficaria
  // "/alertas?id=...". As telas principais não usam "id", então ele é removido.
  useEffect(() => {
    if (!isDetail && strayId) router.setParams({ id: undefined });
  }, [isDetail, strayId]);

  // Desempilha a tela atual. Sem nada embaixo (aberta pelo endereço direto), vai para a base da aba.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(currentSection?.href ?? '/');
  };

  const lastCheck = hotels
    .map((h) => h.own.latest.checkedAt)
    .filter((c): c is string => c !== null)
    .sort()
    .at(-1);
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.bar, { backgroundColor: colors.headerBg, paddingTop: insets.top + spacing.md }]}>
      {isDetail && (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.back, { backgroundColor: colors.headerActive, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="chevron-back" size={20} color={colors.headerText} />
          {width >= breakpoints.compact && (
            <AppText variant="label" color={colors.headerText} style={styles.navActive}>
              Voltar
            </AppText>
          )}
        </Pressable>
      )}
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="HOFIX, ir para a visão geral" style={styles.brand}>
        <LogoMark color={colors.accent} />
        <AppText variant="title" color={colors.headerText} style={styles.brandText}>
          HOFIX
        </AppText>
      </Pressable>

      {wide && (
        <View style={styles.nav} accessibilityRole="tablist">
          {MAIN_SECTIONS.map((s) => {
            // A aba fica marcada também nas telas de detalhe abertas a partir dela.
            const active = currentSection?.group === s.group;
            return (
              <Pressable
                key={s.href}
                onPress={() => router.navigate(s.href)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                aria-selected={active}
                style={({ pressed }) => [
                  styles.navItem,
                  { backgroundColor: active ? colors.headerActive : 'transparent', opacity: pressed ? 0.8 : 1 },
                ]}>
                <AppText variant="label" color={active ? colors.headerText : colors.headerMuted} style={active ? styles.navActive : styles.navText}>
                  {s.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.right}>
        {lastCheck && width >= breakpoints.twoColumns && (
          <View style={styles.updated}>
            <Ionicons name="time-outline" size={16} color={colors.headerMuted} />
            <AppText variant="caption" color={colors.headerMuted}>
              Atualizado em{' '}
              <AppText variant="caption" color={colors.headerText} style={styles.navActive}>
                {formatFullDateTime(lastCheck)}
              </AppText>
            </AppText>
          </View>
        )}
        <Pressable
          onPress={() => router.navigate('/alertas')}
          accessibilityRole="button"
          accessibilityLabel={`Notificações: ${unreadCount} não lidas`}
          style={[styles.iconButton, { backgroundColor: colors.headerActive }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.headerText} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.pricier }]}>
              <AppText variant="caption" color="#FFFFFF" style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </AppText>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/conta')}
          accessibilityRole="button"
          accessibilityLabel="Conta"
          // Sem o texto "Conta" (celular), o fundo fica com a mesma folga dos dois lados do avatar.
          style={[styles.account, !wide && styles.accountCompact, { backgroundColor: colors.headerActive }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <AppText variant="label" color="#12161D" style={styles.navActive}>
              {initials}
            </AppText>
          </View>
          {wide && (
            <AppText variant="caption" color={colors.headerText}>
              Conta
            </AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: touchTarget, minWidth: touchTarget, justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget },
  brandText: { fontSize: 19 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flexGrow: 1, marginLeft: spacing.lg },
  navItem: { paddingHorizontal: spacing.md + 2, minHeight: 40, justifyContent: 'center', borderRadius: radius.md },
  navText: { fontFamily: fonts.medium },
  navActive: { fontFamily: fonts.semibold },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginLeft: 'auto' },
  updated: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconButton: { width: touchTarget, height: touchTarget, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, borderRadius: radius.pill, paddingHorizontal: 5, alignItems: 'center' },
  badgeText: { fontSize: 11, fontFamily: fonts.bold, lineHeight: 16 },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget, borderRadius: radius.pill, paddingLeft: 4, paddingRight: spacing.md },
  accountCompact: { paddingRight: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
