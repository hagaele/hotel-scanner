import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props =
  | { kind: 'loading'; message?: string }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string };

/** Feedback visual padrão para carregando, lista vazia e erro. */
export function StateView(props: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {props.kind === 'loading' && <ActivityIndicator size="large" color={colors.primary} />}
      {props.kind === 'empty' && <Ionicons name="checkmark-circle-outline" size={40} color={colors.textMuted} />}
      {props.kind === 'error' && <Ionicons name="warning-outline" size={40} color={colors.error} />}
      <AppText muted style={styles.text}>
        {props.kind === 'loading' ? (props.message ?? 'Carregando preços...') : props.message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  text: { textAlign: 'center' },
});
