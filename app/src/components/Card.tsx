import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Tone = 'default' | 'primary' | 'warning' | 'event';

type Props = {
  title?: string;
  subtitle?: string;
  /** Rótulo pequeno em caixa alta acima do título (ex.: "SUGESTÃO DE PREÇO"). */
  eyebrow?: string;
  /** Destaca o cartão com a cor principal (ex.: sugestão de preço). Atalho para tone="primary". */
  emphasis?: boolean;
  /** Cor da borda: principal (azul, 2 px), aviso (laranja) ou evento (roxo). */
  tone?: Tone;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Bloco de conteúdo padrão, no estilo do mockup: fundo branco, borda fina, cantos de 12 px. */
export function Card({ title, subtitle, eyebrow, emphasis, tone = 'default', children, style, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const t: Tone = emphasis ? 'primary' : tone;
  const borderColor = { default: colors.border, primary: colors.primary, warning: colors.warningBorder, event: colors.event }[t];

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { backgroundColor: colors.card, borderColor, borderWidth: t === 'primary' ? 2 : 1 }, style]}>
      {eyebrow ? (
        <AppText variant="eyebrow" color={t === 'event' ? colors.event : colors.primary}>
          {eyebrow}
        </AppText>
      ) : null}
      {title ? <AppText variant="title">{title}</AppText> : null}
      {subtitle ? (
        <AppText variant="caption" muted>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg + 4, gap: spacing.md },
});
