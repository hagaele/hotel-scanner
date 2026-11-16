import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { PageHeader } from '@/components/PageHeader';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { DiffChip } from '@/components/DiffChip';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useHotelsData } from '@/context/HotelsContext';
import { deleteSearch, saveSearch } from '@/data/catalogRepository';
import {
  catalogEntries,
  describeFilters,
  EMPTY_FILTERS,
  searchCatalog,
  MAX_SEARCH_NAME,
  validateFilters,
  validateSearchName,
  type CatalogEntry,
} from '@/lib/catalog';
import { confirmAction } from '@/lib/confirm';
import { formatFullDateTime, formatBRL, formatBRLShort } from '@/lib/format';
import { firestoreErrorMessage } from '@/lib/firestore';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { citiesOf, cityOf } from '@/lib/market';
import { diffPct } from '@/lib/pricing';
import { layout, radius, spacing } from '@/theme/tokens';
import { MAX_COMPETITORS } from '@/lib/hotelForm';
import { useLayout } from '@/theme/useLayout';
import { useTheme } from '@/theme/useTheme';
import type { CatalogFilters, CatalogRole, Hotel } from '@/types';

type Section = 'search' | 'own' | 'competitors' | 'saved';
type Feedback = { kind: 'success' | 'error'; message: string } | null;
const NONE = '__nenhuma__';
const ALL = '';

/**
 * Catálogo e pesquisa: encontra hotéis cadastrados (unidades e concorrentes) por nome, localização,
 * faixa de preço e tipo; compara com uma unidade de referência; salva pesquisas no Firestore.
 */
export default function CatalogoScreen() {
  const { wide } = useLayout();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { hotels, now, loading, error, savedSearches } = useHotelsData();

  const [section, setSection] = useState<Section>('search');
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [referenceId, setReferenceId] = useState<string>(NONE);
  const [searchName, setSearchName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const entries = useMemo(() => catalogEntries(hotels, now), [hotels, now]);
  const reference = hotels.find((h) => h.id === referenceId);
  const filterErrors = validateFilters(filters);
  const hasFilterErrors = Object.keys(filterErrors).length > 0;
  const results = useMemo(
    () => (hasFilterErrors ? [] : searchCatalog(entries, filters, reference)),
    [entries, filters, reference, hasFilterErrors],
  );

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;

  const competitorCount = hotels.reduce((sum, h) => sum + h.competitors.length, 0);
  const update = (patch: Partial<CatalogFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setFeedback(null);
  };

  async function handleSave() {
    setFeedback(null);
    const validation = validateSearchName(searchName, savedSearches);
    setNameError(validation);
    if (validation || hasFilterErrors) {
      if (!validation && hasFilterErrors)
        setFeedback({ kind: 'error', message: 'Corrija a faixa de preço nos filtros antes de salvar a pesquisa.' });
      hapticError();
      return;
    }
    setSaving(true);
    try {
      await saveSearch(searchName, filters, user?.email ?? undefined);
      hapticSuccess();
      setFeedback({ kind: 'success', message: `Pesquisa "${searchName.trim()}" salva.` });
      setSearchName('');
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirmAction(`Excluir "${name}"?`, 'A pesquisa salva sai da lista. Os hotéis não são alterados.', 'Excluir');
    if (!ok) return;
    try {
      await deleteSearch(id);
      hapticSuccess();
      setFeedback({ kind: 'success', message: `Pesquisa "${name}" excluída.` });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageHeader
        title="Catálogo e pesquisa"
        subtitle="Encontre hotéis, monte o grupo de concorrentes de cada unidade e salve pesquisas."
      />

      <UnderlineTabs
        label="Seções do catálogo"
        value={section}
        onChange={(s) => {
          setSection(s);
          setFeedback(null);
        }}
        options={[
          { value: 'search', label: 'Pesquisar' },
          { value: 'own', label: `Unidades (${hotels.length})` },
          { value: 'competitors', label: `Concorrentes (${competitorCount})` },
          { value: 'saved', label: `Pesquisas salvas (${savedSearches.length})` },
        ]}
      />

      {feedback && <Banner kind={feedback.kind} message={feedback.message} />}

      {section === 'search' && (
        <View style={[styles.columns, !wide && styles.stacked]}>
          <View style={[styles.main, !wide && styles.stackedItem]}>
          <Card title="Filtros">
            <TextField
              label="Nome do hotel"
              value={filters.text}
              maxLength={80}
              onChangeText={(text) => update({ text })}
              placeholder="Ex.: Plaza"
              autoCapitalize="none"
              returnKeyType="search"
            />
            <AppText variant="label">Localização</AppText>
            <Chips
              label="Localização"
              scroll
              value={filters.city}
              onChange={(city) => update({ city })}
              options={[{ value: ALL, label: 'Todas' }, ...citiesOf(hotels).map((c) => ({ value: c, label: c }))]}
            />
            <AppText variant="label">Tipo</AppText>
            <SegmentedFilter<CatalogRole>
              value={filters.role}
              onChange={(role) => update({ role })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'own', label: 'Unidades' },
                { value: 'competitor', label: 'Concorrentes' },
              ]}
            />
            <View style={styles.pair}>
              <View style={styles.half}>
                <TextField
                  label="Diária de (R$)"
                  value={filters.minPrice}
                  maxLength={12}
                  onChangeText={(minPrice) => update({ minPrice })}
                  error={filterErrors.minPrice}
                  placeholder="Ex.: 220"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.half}>
                <TextField
                  label="Diária até (R$)"
                  value={filters.maxPrice}
                  maxLength={12}
                  onChangeText={(maxPrice) => update({ maxPrice })}
                  error={filterErrors.maxPrice}
                  placeholder="Ex.: 420"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <AppText variant="label">Comparar com a unidade</AppText>
            <Chips
              label="Unidade de referência"
              scroll
              value={referenceId}
              onChange={setReferenceId}
              options={[{ value: NONE, label: 'Nenhuma' }, ...hotels.map((h) => ({ value: h.id, label: h.own.name }))]}
            />
            <Button
              title="Limpar filtros"
              variant="link"
              onPress={() => {
                setFilters(EMPTY_FILTERS);
                setReferenceId(NONE);
              }}
            />
          </Card>

          <View style={styles.block}>
            <AppText variant="title">
              {results.length} {results.length === 1 ? 'hotel encontrado' : 'hotéis encontrados'}
            </AppText>
            <AppText variant="caption" muted>
              {reference
                ? `Ordenado por semelhança com ${reference.own.name}: mesma localização primeiro, depois o preço de hoje mais próximo.`
                : 'Ordenado por nome. Preços de hoje, das leituras registradas.'}
            </AppText>
          </View>
          {results.length === 0 ? (
            <StateView kind="empty" message={hasFilterErrors ? 'Corrija a faixa de preço para pesquisar.' : 'Nenhum hotel com esses filtros.'} />
          ) : (
            results.map((entry) => <ResultCard key={`${entry.hotel.id}-${entry.property.id}`} entry={entry} reference={reference} />)
          )}
          </View>

          <View style={[styles.aside, !wide && styles.stackedItem]}>
          {reference && <ReferencePanel hotel={reference} />}
          <Card title="Salvar esta pesquisa">
            <TextField
              label="Nome da pesquisa"
              value={searchName}
              maxLength={MAX_SEARCH_NAME}
              onChangeText={(text) => {
                setSearchName(text);
                if (nameError) setNameError(null);
              }}
              error={nameError ?? undefined}
              placeholder="Ex.: Concorrentes até R$ 400 em Goiânia"
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <AppText variant="caption" muted>
              Filtros: {describeFilters(filters)}
            </AppText>
            <Button title="Salvar pesquisa" variant="secondary" onPress={handleSave} loading={saving} />
          </Card>

          </View>
        </View>
      )}

      {section === 'own' &&
        hotels.map((h) => (
          <Card key={h.id} title={h.own.name} subtitle={[cityOf(h), h.floorPrice ? `preço-piso ${formatBRL(h.floorPrice)}` : 'sem preço-piso'].join(' · ')}>
            <AppText variant="body">
              Concorrentes: {h.competitors.map((c) => c.name).join(', ')}
            </AppText>
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button title="Ver hotel" variant="secondary" onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: h.id } })} />
              </View>
              <View style={styles.action}>
                <Button title="Editar" variant="secondary" onPress={() => router.push({ pathname: '/hotel/editar/[id]', params: { id: h.id } })} />
              </View>
            </View>
          </Card>
        ))}

      {section === 'competitors' &&
        hotels.map((h) => (
          <Card key={h.id} title={`Concorrentes de ${h.own.name}`} subtitle={cityOf(h)}>
            {h.competitors.map((c) => (
              <View key={c.id} style={[styles.listRow, { borderColor: colors.border }]}>
                <AppText variant="body" style={styles.flex}>
                  {c.name}
                </AppText>
                <AppText variant="label" muted>
                  {c.latest.status === 'sold_out' ? 'Esgotado' : c.latest.price !== null ? formatBRLShort(c.latest.price) : 'Sem leitura'}
                </AppText>
              </View>
            ))}
            <Button title="Editar concorrentes" variant="link" onPress={() => router.push({ pathname: '/hotel/editar/[id]', params: { id: h.id } })} />
          </Card>
        ))}

      {section === 'saved' &&
        (savedSearches.length === 0 ? (
          <StateView kind="empty" message="Nenhuma pesquisa salva. Use a seção Pesquisar para salvar a primeira." />
        ) : (
          savedSearches.map((s) => (
            <Card key={s.id} title={s.name} subtitle={s.createdAt ? `Salva em ${formatFullDateTime(s.createdAt)}` : undefined}>
              <AppText variant="body">{describeFilters(s.filters)}</AppText>
              <View style={styles.actions}>
                <View style={styles.action}>
                  <Button
                    title="Abrir"
                    onPress={() => {
                      setFilters(s.filters);
                      setSection('search');
                      setFeedback({ kind: 'success', message: `Pesquisa "${s.name}" aplicada.` });
                    }}
                  />
                </View>
                <View style={styles.action}>
                  <Button title="Excluir" variant="danger" onPress={() => handleDelete(s.id, s.name)} />
                </View>
              </View>
            </Card>
          ))
        ))}
    </ScrollView>
  );
}

/** Um hotel encontrado: tipo, localização, preço de hoje e diferença para a unidade de referência. */
function ResultCard({ entry, reference }: { entry: CatalogEntry; reference?: Hotel }) {
  const { colors } = useTheme();
  const { compact } = useLayout();
  const refPrice = reference?.own.latest.price ?? null;
  return (
    <Card style={[styles.result, compact && styles.resultStacked]}>
      <View style={styles.resultMain}>
      <View style={[styles.resultIcon, compact && styles.resultIconSmall, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={entry.role === 'own' ? 'business' : 'business-outline'} size={28} color={entry.role === 'own' ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.resultInfo}>
        <AppText variant="strong">{entry.property.name}</AppText>
        <AppText variant="caption" muted>
          {entry.role === 'own' ? 'Unidade da rede' : `Concorrente de ${entry.hotel.own.name}`} · {entry.city}
        </AppText>
      </View>
      </View>
      <View style={styles.resultPrice}>
        <View>
          <AppText variant="caption" muted>
            Diária de hoje
          </AppText>
          <AppText variant="priceSm" color={entry.price === null ? colors.textMuted : colors.text}>
            {entry.price !== null
              ? formatBRLShort(entry.price)
              : entry.property.latest.status === 'sold_out'
                ? 'Esgotado'
                : 'Sem preço hoje'}
          </AppText>
        </View>
        {reference && entry.price !== null && refPrice !== null && (
          <View style={styles.vs}>
            <DiffChip pct={diffPct(entry.price, refPrice)} size="sm" />
            <AppText variant="caption" muted>
              vs. {reference.own.name}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.resultActions}>
        <View style={compact && styles.flex}>
          <Button title="Comparativo" variant="ink" onPress={() => router.push({ pathname: '/comparativo/[id]', params: { id: entry.hotel.id } })} />
        </View>
        <View style={compact && styles.flex}>
          <Button title="Ver hotel" variant="secondary" onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: entry.hotel.id } })} />
        </View>
      </View>
    </Card>
  );
}

/** Grupo de concorrentes da unidade de referência. A troca é feita no formulário do hotel. */
function ReferencePanel({ hotel }: { hotel: Hotel }) {
  const { colors } = useTheme();
  return (
    <Card title={`Concorrentes de ${hotel.own.name}`} subtitle={`${hotel.competitors.length} de ${MAX_COMPETITORS} vagas preenchidas`}>
      {hotel.competitors.map((c) => (
        <View key={c.id} style={[styles.pill, { backgroundColor: colors.surfaceMuted }]}>
          <AppText variant="label">{c.name}</AppText>
        </View>
      ))}
      <AppText variant="caption" muted>
        Cada unidade compara com até 5 concorrentes, cadastrados um por um. Unidades da sua rede não entram como concorrentes entre si.
      </AppText>
      <Button title="Trocar concorrentes" variant="secondary" onPress={() => router.push({ pathname: '/hotel/editar/[id]', params: { id: hotel.id } })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg + 4, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  // Celular/tela estreita: colunas uma embaixo da outra, em largura total (no iPhone o flexWrap espremia lado a lado).
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedItem: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, width: '100%' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.lg + 4 },
  main: { flexGrow: 999, flexShrink: 1, flexBasis: 640, minWidth: 0, gap: spacing.lg },
  aside: { flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 0, gap: spacing.lg },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  resultIcon: { width: 72, height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  resultMain: { flexGrow: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  resultStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  resultIconSmall: { width: 48, height: 48 },
  resultInfo: { flex: 1, gap: 2 },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  block: { gap: spacing.xs },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { flexGrow: 1, flexBasis: 140 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  action: { flexGrow: 1, flexBasis: 140 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm },
  resultPrice: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  vs: { alignItems: 'flex-end', gap: spacing.xs },
  pill: { borderRadius: radius.md, padding: spacing.md },
});
