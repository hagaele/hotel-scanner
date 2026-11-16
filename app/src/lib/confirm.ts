import type { ComponentProps } from 'react';
import { Alert, Platform } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

export type ConfirmDetail = { text: string; warning?: boolean };

export type ConfirmOptions = {
  /** 'danger' deixa o botão vermelho. Sem informar: vermelho para Remover, Excluir, Apagar e Sair. */
  tone?: 'danger' | 'default';
  /** Tópicos curtos abaixo da explicação (com ícone de ok ou de aviso). */
  details?: ConfirmDetail[];
  /** Ícone do topo da folha. */
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export type ConfirmRequest = ConfirmOptions & { title: string; message: string; confirmLabel: string };

type Handler = (request: ConfirmRequest) => Promise<boolean>;
let handler: Handler | null = null;

/** O ConfirmSheetProvider (no topo do app) se registra aqui para mostrar a folha inferior. */
export function registerConfirmHandler(next: Handler | null) {
  handler = next;
}

const DANGER_LABELS = /^(remover|excluir|apagar|sair)/i;

/**
 * Pede confirmação antes de uma ação importante (apagar, gravar dados que não podem ser desfeitos...).
 * Mostra a folha inferior do app (ConfirmSheet). Sem ela montada, cai no alerta do sistema.
 * Resolve true quando a pessoa confirma.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const tone = options.tone ?? (DANGER_LABELS.test(confirmLabel) ? 'danger' : 'default');
  if (handler) return handler({ ...options, tone, title, message, confirmLabel });

  const full = [message, ...(options.details ?? []).map((d) => `• ${d.text}`)].filter(Boolean).join('\n');
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${full}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      full,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: tone === 'danger' ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
