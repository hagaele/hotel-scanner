import { Alert, Platform } from 'react-native';

/**
 * Pede confirmação antes de uma ação importante (apagar, sobrescrever...).
 * No navegador o Alert com botões não funciona, então usa o confirm da web.
 * Resolve true quando a pessoa confirma.
 */
export function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
