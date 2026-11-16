import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

import { AppText } from './AppText';

type Props = { title: string; subtitle?: string; /** Controles à direita (quebram para baixo no celular). */ right?: ReactNode };

/** Título da página (Space Grotesk 28) com subtítulo, como no topo de cada tela do mockup. */
export function PageHeader({ title, subtitle, right }: Props) {
  const { compact } = useLayout();
  return (
    <View style={[styles.row, compact && styles.stacked]}>
      <View style={[styles.texts, compact && styles.textsStacked]}>
        <AppText variant="titleLg" accessibilityRole="header" style={compact && styles.titleCompact}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  texts: { flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: spacing.xs },
  // Celular: título em cima, controles embaixo (sem disputar a mesma linha).
  // Em coluna, flexBasis viraria altura: volta ao tamanho do conteúdo.
  // Celular: título um pouco menor, para nomes longos caberem em uma ou duas linhas.
  titleCompact: { fontSize: 23, lineHeight: 29 },
  textsStacked: { flexBasis: 'auto', flexGrow: 0, alignSelf: 'stretch' },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' },
});
