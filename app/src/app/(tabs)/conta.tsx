import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useHotels } from '@/data/useHotels';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Conta: dados do cliente. O login e o botão "Sair" entram na feature/firebase-auth. */
export default function ContaScreen() {
  const { colors } = useTheme();
  const { client } = useHotels();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Cliente
        </AppText>
        <AppText variant="title">{client.name}</AppText>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Limite de destaque
        </AppText>
        <AppText variant="title">{client.alertThresholdPct}% de diferença para a média</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
});
