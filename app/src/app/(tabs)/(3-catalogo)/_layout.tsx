import { TabStack } from '@/components/TabStack';

/**
 * Pilha da aba Catálogo. A tela "catalogo" é a base (âncora): aberto direto pelo endereço,
 * um detalhe desta pilha ainda tem Catálogo embaixo, e "Voltar" leva até ela.
 */
export const unstable_settings = { anchor: 'catalogo' };

export default TabStack;
