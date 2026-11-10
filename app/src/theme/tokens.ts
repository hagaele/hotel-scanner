// Tokens de design do HOFIX (briefing de identidade visual, seção 9).
// Toda cor, espaçamento e tamanho de fonte do app sai daqui.

export const palette = {
  light: {
    background: '#F4F6F5',
    card: '#FFFFFF',
    text: '#0E1A18',
    textMuted: '#5F6B67',
    border: '#DDE3E0',
    brand: '#0F2E2A',
    accent: '#4FC7A2',
    primary: '#145C50',
    onPrimary: '#FFFFFF',
    cheaper: '#0B5F86',
    pricier: '#A0480A',
    highlightBg: '#0F2E2A',
    highlightText: '#FFFFFF',
    soldOut: '#5A4790',
    stale: '#5F6B67',
    error: '#B3261E',
  },
  dark: {
    background: '#0C1513',
    card: '#15201D',
    text: '#E8F0ED',
    textMuted: '#97A39F',
    border: '#24322E',
    brand: '#4FC7A2',
    accent: '#4FC7A2',
    primary: '#4FC7A2',
    onPrimary: '#0C1513',
    cheaper: '#6CC4EA',
    pricier: '#F3A35C',
    highlightBg: '#E8F0ED',
    highlightText: '#0F2E2A',
    soldOut: '#B9A9F2',
    stale: '#97A39F',
    error: '#FF8E84',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

// Grade de 4 px.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

// Alvo de toque mínimo.
export const touchTarget = 44;

export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
} as const;

export const fontSize = {
  priceLg: 40,
  priceMd: 32,
  priceSm: 20,
  titleLg: 24,
  title: 18,
  body: 16,
  label: 14,
  caption: 13,
  min: 12,
} as const;

// Largura a partir da qual a lista vira grade (tablet e web).
export const breakpoints = { twoColumns: 700, threeColumns: 1100 } as const;
