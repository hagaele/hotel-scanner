import { TabStack } from '@/components/TabStack';

/**
 * Pilha da aba Alertas. A tela "alertas" é a base (âncora): aberto direto pelo endereço,
 * um detalhe desta pilha ainda tem Alertas embaixo, e "Voltar" leva até ela.
 */
export const unstable_settings = { anchor: 'alertas' };

export default TabStack;
