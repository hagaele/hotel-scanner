import { TabStack } from '@/components/TabStack';

/**
 * Pilha da aba Calendário. A tela "calendario" é a base (âncora): aberto direto pelo endereço,
 * um detalhe desta pilha ainda tem Calendário embaixo, e "Voltar" leva até ela.
 */
export const unstable_settings = { anchor: 'calendario' };

export default TabStack;
