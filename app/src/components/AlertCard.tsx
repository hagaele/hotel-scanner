import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { AlertItem, AlertSeverity } from '@/lib/alerts';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

const SEVERITY_LABEL: Record<AlertSeverity, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

type Props = {
  alert: AlertItem;
  unread: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
};

/**
 * Um alerta da central, no estilo do mockup: ícone num quadrado colorido, selo de prioridade,
 * unidade e data, título, explicação e as ações à direita (embaixo no celular).
 */
export function AlertCard({ alert, unread, onOpen, onMarkRead }: Props) {
  const { colors } = useTheme();
  const { compact } = useLayout();
  const tone =
    alert.severity === 'alta'
      ? { fg: colors.pricier, bg: colors.warningBg }
      : alert.severity === 'media'
        ? { fg: colors.infoText, bg: colors.infoBg }
        : { fg: colors.textMuted, bg: colors.surfaceMuted };

  return (
    <View
      style={[
        styles.card,
        !compact && styles.cardRow,
        { backgroundColor: unread ? colors.card : colors.surfaceMuted, borderColor: unread ? colors.inputBorder : colors.border },
      ]}>
      <View style={styles.main}>
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <Ionicons name="warning-outline" size={18} color={tone.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <AppText variant="caption" color={tone.fg} style={styles.pillText}>
              {SEVERITY_LABEL[alert.severity]}
            </AppText>
          </View>
          <AppText variant="caption" muted>
            {alert.place}
            {alert.stay ? ` · estadia ${alert.stay}` : ''}
          </AppText>
          {unread ? (
            <AppText variant="caption" color={colors.primary} style={styles.pillText}>
              Não lida
            </AppText>
          ) : null}
        </View>
        <AppText variant="strong">{alert.title}</AppText>
        <AppText variant="label" muted>
          {alert.body}
        </AppText>
      </View>
      </View>
      {/* No celular, os botões ficam numa linha própria abaixo do texto, dividindo a largura. */}
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <View style={compact && styles.actionCompact}>
          <Button title="Abrir" variant="ink" onPress={onOpen} />
        </View>
        {unread ? (
          <View style={compact && styles.actionCompact}>
            <Button title="Marcar como lida" variant="secondary" onPress={onMarkRead} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flexGrow: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md + 2 },
  icon: { width: 40, height: 40, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillText: { fontFamily: fonts.bold, fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionsCompact: { alignItems: 'stretch' },
  actionCompact: { flex: 1 },
});
