import { plural } from '@/lib/format';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { FilterBar } from '@/components/FilterBar';
import { ThemedSwitch } from '@/components/SwitchRow';
import { useAuth } from '@/context/AuthContext';
import { useHotelsData } from '@/context/HotelsContext';
import { markAlertsRead, saveAlertRules } from '@/data/alertsRepository';
import {
  COMPETITOR_CHANGE_OPTIONS,
  filterAlerts,
  OUT_OF_RANGE_OPTIONS,
  type AlertFilter,
  type AlertItem,
} from '@/lib/alerts';
import { firestoreErrorMessage } from '@/lib/firestore';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { layout, spacing } from '@/theme/tokens';
import type { AlertRules } from '@/types';

type Feedback = { kind: 'success' | 'error'; message: string } | null;

/**
 * Central de notificações: alertas calculados a partir dos preços, agrupados por unidade,
 * com marcação de lidos por usuário (Firestore) e regras de alerta configuráveis.
 */
export default function AlertasScreen() {
  const { user } = useAuth();
  const { client, alerts, readAlerts, unreadCount, loading, error, ratesLoading, applyAlertRules } = useHotelsData();
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [rules, setRules] = useState<AlertRules>(client.alertRules);
  const [rulesDirty, setRulesDirty] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesFeedback, setRulesFeedback] = useState<Feedback>(null);

  // Quando as regras salvas mudam (outro usuário, primeira carga), o formulário acompanha se não houver edição em curso.
  // Só reage a uma mudança real das regras do servidor: terminar de salvar (rulesDirty → false) não pode
  // devolver o formulário ao valor antigo enquanto o Firestore ainda não confirmou o novo.
  const serverRulesKey = JSON.stringify(client.alertRules);
  const lastServerRules = useRef(serverRulesKey);
  useEffect(() => {
    if (lastServerRules.current === serverRulesKey) return;
    lastServerRules.current = serverRulesKey;
    if (!rulesDirty) setRules(JSON.parse(serverRulesKey) as AlertRules);
  }, [serverRulesKey, rulesDirty]);

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;

  const visible = filterAlerts(alerts, filter, readAlerts);

  async function markRead(ids: string[], message?: string) {
    if (!user) return;
    try {
      await markAlertsRead(user.uid, ids);
      if (message) setFeedback({ kind: 'success', message });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    }
  }

  function open(alert: AlertItem) {
    void markRead([alert.id]);
    const t = alert.target;
    if (t.kind === 'hotel') router.push({ pathname: '/hotel/[id]', params: { id: t.hotelId } });
    else if (t.kind === 'comparativo') router.push({ pathname: '/comparativo/[id]', params: { id: t.hotelId, data: t.date } });
    else router.push({ pathname: '/calendario', params: { data: t.date, praca: t.city } });
  }

  const changeRules = (patch: Partial<AlertRules>) => {
    setRules((r) => ({ ...r, ...patch }));
    setRulesDirty(true);
    setRulesFeedback(null);
  };

  async function handleSaveRules() {
    setSavingRules(true);
    setRulesFeedback(null);
    try {
      await saveAlertRules(rules);
      applyAlertRules(rules);
      lastServerRules.current = JSON.stringify(rules);
      hapticSuccess();
      setRulesDirty(false);
      setRulesFeedback({ kind: 'success', message: 'Regras salvas. A lista de alertas já foi atualizada.' });
    } catch (e) {
      hapticError();
      setRulesFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSavingRules(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader
        title="Central de notificações"
        subtitle={`${plural(unreadCount, 'não lido', 'não lidos')} · alertas agrupados por unidade · ${rules.farDates ? 'próximos 60 dias' : 'próximos 30 dias'}`}
      />

      <Card title="Regras de alerta" subtitle="Valem para todas as unidades da rede.">
        <FilterBar
          stackOnNarrow
          items={[
            {
              key: 'mudanca',
              title: 'Concorrente mudou o preço',
              hint: 'Avisa acima dessa variação no preço de hoje.',
              weight: 1.5,
              control: (
                <SegmentedFilter
                  value={String(rules.competitorChangePct)}
                  onChange={(v) => changeRules({ competitorChangePct: Number(v) })}
                  compact
                  options={COMPETITOR_CHANGE_OPTIONS.map((n) => ({ value: String(n), label: `${n}%` }))}
                />
              ),
            },
            {
              key: 'fora',
              title: 'Unidade fora da média',
              hint: 'Destaca no painel e avisa acima disso; prioridade alta a partir de 1,5×.',
              weight: 1.3,
              control: (
                <SegmentedFilter
                  value={String(rules.outOfRangePct)}
                  onChange={(v) => changeRules({ outOfRangePct: Number(v) })}
                  compact
                  options={OUT_OF_RANGE_OPTIONS.map((n) => ({ value: String(n), label: `${n}%` }))}
                />
              ),
            },
            {
              key: 'esgotados',
              title: 'Esgotados',
              hint: 'Metade ou mais dos concorrentes esgotados numa data.',
              control: <SwitchControl label="Concorrentes esgotados" value={rules.soldOut} onChange={(soldOut) => changeRules({ soldOut })} />,
            },
            {
              key: 'evento',
              title: 'Possível evento',
              hint: 'Alta de preços sem feriado cadastrado.',
              control: <SwitchControl label="Possível evento" value={rules.events} onChange={(events) => changeRules({ events })} />,
            },
            {
              key: 'horizonte',
              title: '60 dias à frente',
              hint: 'Desligado: próximos 30 dias.',
              control: <SwitchControl label="Olhar 60 dias à frente" value={rules.farDates} onChange={(farDates) => changeRules({ farDates })} />,
            },
          ]}
        />
        {rulesFeedback && <Banner kind={rulesFeedback.kind} message={rulesFeedback.message} />}
        <View style={styles.saveRow}>
          <AppText variant="caption" muted style={styles.flex}>
            Os alertas aparecem nesta central e no número da aba Alertas.
          </AppText>
          <Button title="Salvar regras" onPress={handleSaveRules} loading={savingRules} disabled={!rulesDirty} />
        </View>
      </Card>

      <View style={styles.toolbar}>
        <Chips
          label="Filtrar alertas"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'unread', label: 'Não lidos' },
            { value: 'high', label: 'Prioridade alta' },
          ]}
        />
        <Button
          title="Marcar todos como lidos"
          variant="secondary"
          disabled={unreadCount === 0}
          onPress={() => markRead(alerts.filter((a) => !readAlerts[a.id]).map((a) => a.id), 'Todos os alertas foram marcados como lidos.')}
        />
      </View>

      {feedback && <Banner kind={feedback.kind} message={feedback.message} />}

      {ratesLoading ? (
        <StateView kind="loading" message="Calculando alertas..." />
      ) : visible.length === 0 ? (
        <StateView
          kind="empty"
          message={filter === 'unread' ? 'Nenhum alerta não lido.' : filter === 'high' ? 'Nenhum alerta de prioridade alta.' : 'Nenhum alerta agora.'}
        />
      ) : (
        visible.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            unread={!readAlerts[alert.id]}
            onOpen={() => open(alert)}
            onMarkRead={() => markRead([alert.id])}
          />
        ))
      )}

    </ScrollView>
  );
}

/** Chave liga/desliga com o estado escrito ao lado (não depende só da cor). */
function SwitchControl({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <ThemedSwitch value={value} onChange={onChange} accessibilityLabel={label} />
      <AppText variant="body">{value ? 'Ligado' : 'Desligado'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  block: { gap: spacing.xs },
  flex: { flex: 1 },
  saveRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
