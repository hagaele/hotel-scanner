import { useWindowDimensions } from 'react-native';

import { breakpoints } from './tokens';

/**
 * Tamanho da tela para escolher o layout.
 * - wide: computador/tablet largo (colunas lado a lado, menu no topo).
 * - compact: celular. Cartões com texto e botões empilham os botões numa linha própria, em largura total.
 *
 * O layout é decidido aqui em vez de flexWrap + flexShrink: no iPhone (Yoga), um item que pode encolher
 * não quebra para a linha de baixo, e o texto ficava espremido ao lado dos botões.
 */
export function useLayout(): { wide: boolean; compact: boolean; width: number } {
  const { width } = useWindowDimensions();
  return { width, wide: width >= breakpoints.wide, compact: width < breakpoints.compact };
}
