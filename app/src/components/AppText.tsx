import { Text, type TextProps } from 'react-native';

import { fonts, fontSize } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Variant = 'priceLg' | 'priceMd' | 'priceSm' | 'titleLg' | 'title' | 'body' | 'label' | 'caption' | 'strong' | 'eyebrow';

const variants: Record<Variant, { size: number; family: string; tabular?: boolean; upper?: boolean }> = {
  priceLg: { size: fontSize.priceLg, family: fonts.display, tabular: true },
  priceMd: { size: fontSize.priceMd, family: fonts.display, tabular: true },
  priceSm: { size: fontSize.priceSm, family: fonts.display, tabular: true },
  titleLg: { size: fontSize.titleLg, family: fonts.display },
  title: { size: fontSize.title, family: fonts.display },
  body: { size: fontSize.body, family: fonts.regular },
  label: { size: fontSize.label, family: fonts.medium },
  caption: { size: fontSize.caption, family: fonts.regular },
  /** Texto de corpo em negrito (nomes de hotel, títulos de alerta). */
  strong: { size: fontSize.body, family: fonts.bold },
  /** Rótulo pequeno em caixa alta, como "SUGESTÃO DE PREÇO". */
  eyebrow: { size: fontSize.caption, family: fonts.semibold, upper: true },
};

type Props = TextProps & { variant?: Variant; color?: string; muted?: boolean };

/** Texto padrão do app: aplica a fonte, a escala e os números tabulares nos preços. */
export function AppText({ variant = 'body', color, muted, style, ...rest }: Props) {
  const { colors } = useTheme();
  const v = variants[variant];
  return (
    <Text
      style={[
        {
          fontFamily: v.family,
          fontSize: v.size,
          color: color ?? (muted ? colors.textMuted : colors.text),
          fontVariant: v.tabular ? ['tabular-nums'] : undefined,
          ...(v.upper ? { textTransform: 'uppercase' as const, letterSpacing: 0.5 } : null),
          ...(variant === 'titleLg' ? { letterSpacing: -0.4 } : null),
        },
        style,
      ]}
      {...rest}
    />
  );
}
