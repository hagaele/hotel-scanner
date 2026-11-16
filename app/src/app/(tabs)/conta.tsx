import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { highlightPct } from '@/lib/alerts';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { useThemePreference, type ThemePreference } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { seedExampleData } from '@/data/seed';
import { simulatePrices, simulationRange } from '@/data/simulation';
import { useHotelsData } from '@/context/HotelsContext';
import { formatKey } from '@/lib/dates';
import { useHotels } from '@/data/useHotels';
import { authErrorMessage } from '@/lib/authErrors';
import { confirmAction } from '@/lib/confirm';
import { firestoreErrorMessage } from '@/lib/firestore';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Pede confirmação antes de sair. No navegador o Alert com botões não funciona, então usa o confirm da web. */
function confirmSignOut(onConfirm: () => void) {
  const message = 'Você precisará entrar de novo com e-mail e senha.';
  if (Platform.OS === 'web') {
    if (window.confirm(`Sair da conta?\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert('Sair da conta?', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: onConfirm },
  ]);
}

/** Conta: usuário logado, dados do cliente, tema do app, carga de dados de exemplo e botão "Sair". */
export default function ContaScreen() {
  const { colors } = useTheme();
  const { client } = useHotels();
  const { hotels, events, today } = useHotelsData();
  const range = simulationRange(today);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function handleSeed() {
    const confirmed = await confirmAction(
      'Carregar dados de exemplo?',
      '9 hotéis da Rede Cerrado em Brasília, Goiânia e Caldas Novas, com concorrentes e tarifas.',
      'Carregar dados',
      {
        icon: 'cloud-download-outline',
        details: [
          { text: 'Histórico, tarifas das próximas 30 noites e um evento de exemplo' },
          { text: 'Nada que já existe é sobrescrito' },
          { text: 'As leituras gravadas não podem ser apagadas depois', warning: true },
        ],
      },
    );
    if (!confirmed) return;
    setSeedResult(null);
    setSeeding(true);
    try {
      const { created, skipped, rates, migrated } = await seedExampleData();
      const migratedText = migrated > 0 ? ` ${migrated} ${migrated === 1 ? 'hotel cadastrado' : 'hotéis cadastrados'} na rede anterior ${migrated === 1 ? 'foi trazido' : 'foram trazidos'} com o histórico.` : '';
      setSeedResult({
        kind: 'success',
        message:
          created > 0 || rates > 0 || migrated > 0
            ? `${created} hotéis carregados${skipped ? ` (${skipped} já existiam)` : ''} e ${rates} tarifas por data.${migratedText} Confira a Visão geral e o Calendário.`
            : 'Os dados de exemplo já estavam completos no banco. Nada foi alterado.',
      });
    } catch (e) {
      setSeedResult({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSeeding(false);
    }
  }

  async function handleSimulate() {
    const confirmed = await confirmAction(
      'Simular preços?',
      `De ${formatKey(range.from)} a ${formatKey(range.to)}, para toda a rede e os concorrentes.`,
      'Simular preços',
      {
        icon: 'analytics-outline',
        details: [
          { text: 'Fins de semana, feriados, eventos e esgotados' },
          { text: 'Noites que já têm leitura ficam como estão' },
          { text: 'A coleta de agora deixa o painel atualizado por 90 minutos' },
          { text: 'Preços fictícios; não podem ser apagados depois', warning: true },
        ],
      },
    );
    if (!confirmed) return;
    setSimResult(null);
    setSimulating(true);
    try {
      const result = await simulatePrices(hotels, events);
      setSimResult({
        kind: 'success',
        message:
          result.rates > 0
            ? `${result.rates.toLocaleString('pt-BR')} preços simulados em ${result.hotels} ${result.hotels === 1 ? 'hotel' : 'hotéis'}, de ${formatKey(result.from)} a ${formatKey(result.to)}. Confira o Calendário e o Comparativo.`
            : 'Todas as noites já tinham preço. Nada foi alterado.',
      });
    } catch (e) {
      setSimResult({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSimulating(false);
    }
  }

  function handleSignOut() {
    confirmSignOut(async () => {
      setError(null);
      setSigningOut(true);
      try {
        // Ao sair, a proteção de rotas (src/app/_layout.tsx) leva para o login sozinha.
        await signOut();
      } catch (e) {
        setError(authErrorMessage(e));
        setSigningOut(false);
      }
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PageHeader title="Conta" subtitle="Usuário, rede, aparência e administração." />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Conectado como
        </AppText>
        <AppText variant="title">{user?.email ?? '—'}</AppText>
      </View>
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
        <AppText variant="title">{highlightPct(client)}% de diferença para a média</AppText>
        <AppText variant="caption" muted>
          Ajuste em Alertas → Regras de alerta → "Unidade fora da média".
        </AppText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Aparência
        </AppText>
        <SegmentedFilter<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'Do sistema' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
          ]}
        />
        <AppText variant="caption" muted>
          A escolha fica salva neste aparelho.
        </AppText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" muted>
          Administração
        </AppText>
        <AppText variant="body">
          Carrega os dados de exemplo da Rede Cerrado no Firestore, com tarifas para os próximos 30 dias. Use ao configurar um projeto novo.
        </AppText>
        <Button title="Carregar dados de exemplo" variant="secondary" onPress={handleSeed} loading={seeding} />
        {seedResult && <Banner kind={seedResult.kind} message={seedResult.message} />}
        <AppText variant="body">
          Simula preços de todos os hotéis da rede e dos concorrentes, de {formatKey(range.from)} a {formatKey(range.to)}, para demonstrar o histórico, o calendário e as sugestões. Rode de novo antes de usar ou gravar: ele registra a coleta de agora, e os preços ficam atualizados no painel por 90 minutos.
        </AppText>
        <Button
          title="Simular preços"
          variant="secondary"
          onPress={handleSimulate}
          loading={simulating}
          disabled={seeding || hotels.length === 0}
        />
        {simResult && <Banner kind={simResult.kind} message={simResult.message} />}
      </View>

      {error && (
        <AppText variant="label" color={colors.error} accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Button title="Sair" variant="danger" onPress={handleSignOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg + 4, gap: spacing.sm },
});
