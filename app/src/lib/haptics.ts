import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Resposta tátil (vibração curta) do aparelho: recurso nativo do app.
 * No navegador não há motor de vibração confiável, então a chamada é ignorada.
 * Um erro aqui nunca pode atrapalhar a ação principal, por isso é silenciado.
 */
function run(effect: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

/** Ação concluída: leitura registrada, hotel salvo. */
export function hapticSuccess(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Atenção: hotel em destaque (preço muito acima ou abaixo da média). */
export function hapticWarning(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Algo deu errado: validação ou erro do servidor. */
export function hapticError(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Toque leve ao trocar uma opção (ex.: escolher data ou hora). */
export function hapticSelection(): void {
  run(() => Haptics.selectionAsync());
}
