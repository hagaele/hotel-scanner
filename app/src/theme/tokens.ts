// Tokens de design do HOFIX.
// Toda cor, espaçamento e tamanho de fonte do app sai daqui.

export const palette = {
  // Paleta do mockup do dashboard: grafite, azul de ação e laranja para "mais caro".
  // "Mais barato" usa um azul-petróleo, diferente do azul dos botões, para seta de preço não parecer botão.
  // Todas as combinações de texto passam no contraste mínimo WCAG AA.
  light: {
    background: '#F5F6F8',
    card: '#FFFFFF',
    text: '#12161D',
    textMuted: '#5B6472',
    border: '#DDE1E7',
    brand: '#12161D',
    accent: '#7DA2FF',
    primary: '#1D4ED8',
    onPrimary: '#FFFFFF',
    cheaper: '#0E7490',
    pricier: '#C2410C',
    highlightBg: '#12161D',
    highlightText: '#FFFFFF',
    soldOut: '#5B21B6',
    stale: '#5B6472',
    error: '#B91C1C',
    // Linhas dos concorrentes no gráfico de 7 dias (o hotel próprio usa "primary").
    series1: '#0E7490',
    series2: '#C2410C',
    series3: '#5B21B6',
    // Calendário: nível de demanda (preço do mercado) de baixa a pico. Sempre com texto junto.
    level0: '#E3F6E8',
    level1: '#FEF3C7',
    level2: '#FFDDBF',
    level3: '#F7B8B8',
    levelText: '#12161D',
    // Preço dentro do dia do calendário, um tom forte de cada nível.
    levelInk0: '#166534',
    levelInk1: '#854D0E',
    levelInk2: '#9A3412',
    levelInk3: '#991B1B',
    event: '#5B21B6',
    // Elementos do mockup: barra superior escura, botões "tinta" (grafite), caixas internas e avisos.
    ink: '#12161D',
    onInk: '#FFFFFF',
    surfaceMuted: '#F5F6F8',
    inputBorder: '#CBD1DA',
    headerBg: '#12161D',
    headerText: '#FFFFFF',
    headerMuted: '#C9CFD9',
    headerActive: '#2A3242',
    warningBg: '#FFF4E5',
    warningBorder: '#F5C98E',
    warningText: '#8A3A00',
    infoBg: '#EAF0FF',
    infoText: '#1E3A8A',
    eventBg: '#F3E8FF',
    aligned: '#5B6472',
  },
  dark: {
    background: '#0B0E13',
    card: '#161B23',
    text: '#E6E9EF',
    textMuted: '#9AA3B2',
    border: '#2A313D',
    brand: '#232B38',
    accent: '#7DA2FF',
    primary: '#7DA2FF',
    onPrimary: '#0B0E13',
    cheaper: '#5EC8DD',
    pricier: '#FB923C',
    highlightBg: '#E6E9EF',
    highlightText: '#12161D',
    soldOut: '#C4B5FD',
    stale: '#9AA3B2',
    error: '#F87171',
    series1: '#5EC8DD',
    series2: '#FB923C',
    series3: '#C4B5FD',
    level0: '#14361F',
    level1: '#3A3112',
    level2: '#4A2A12',
    level3: '#4C1D1D',
    levelText: '#E6E9EF',
    levelInk0: '#86EFAC',
    levelInk1: '#FDE68A',
    levelInk2: '#FDBA74',
    levelInk3: '#FCA5A5',
    event: '#C4B5FD',
    ink: '#E6E9EF',
    onInk: '#12161D',
    surfaceMuted: '#1D232D',
    inputBorder: '#3A4250',
    headerBg: '#05070A',
    headerText: '#FFFFFF',
    headerMuted: '#A9B1BF',
    headerActive: '#232B38',
    warningBg: '#2E1F10',
    warningBorder: '#7A4A1C',
    warningText: '#FDBA74',
    infoBg: '#1A2340',
    infoText: '#A5BCFF',
    eventBg: '#261C3D',
    aligned: '#9AA3B2',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

// Grade de 4 px.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const;

// Alvo de toque mínimo.
export const touchTarget = 44;

// Tipografia do mockup: Inter no texto, Space Grotesk em títulos e números de destaque.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'SpaceGrotesk_700Bold',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
} as const;

export const fontSize = {
  priceLg: 34,
  priceMd: 28,
  priceSm: 20,
  titleLg: 28,
  title: 18,
  body: 15,
  label: 13,
  caption: 12,
  min: 12,
} as const;

// Telas de formulário (login): largura máxima no tablet/web e tamanho do símbolo da marca.
export const layout = { formMaxWidth: 480, logoSize: 64, chartHeight: 200, contentMaxWidth: 1440 } as const;

// Largura a partir da qual a lista vira grade (tablet e web).
export const breakpoints = { compact: 640, twoColumns: 700, threeColumns: 1100, wide: 1000 } as const;
