import { Text, type TextProps } from 'react-native';

import { fonts, fontSize } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Variant = 'priceLg' | 'priceMd' | 'priceSm' | 'titleLg' | 'title' | 'body' | 'label' | 'caption';

const variants: Record<Variant, { size: number; family: string; tabular?: boolean }> = {
  priceLg: { size: fontSize.priceLg, family: fonts.semibold, tabular: true },
  priceMd: { size: fontSize.priceMd, family: fonts.semibold, tabular: true },
  priceSm: { size: fontSize.priceSm, family: fonts.semibold, tabular: true },
  titleLg: { size: fontSize.titleLg, family: fonts.bold },
  title: { size: fontSize.title, family: fonts.semibold },
  body: { size: fontSize.body, family: fonts.regular },
  label: { size: fontSize.label, family: fonts.medium },
  caption: { size: fontSize.caption, family: fonts.regular },
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
        },
        style,
      ]}
      {...rest}
    />
  );
}
