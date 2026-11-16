import { TabStack } from '@/components/TabStack';

/**
 * Pilha da aba Visão geral. A tela "index" é a base (âncora): aberto direto pelo endereço,
 * um detalhe desta pilha ainda tem Visão geral embaixo, e "Voltar" leva até ela.
 */
export const unstable_settings = { anchor: 'index' };

export default TabStack;
