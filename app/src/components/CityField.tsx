import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCities } from '@/data/useCities';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { SearchSelect } from './SearchSelect';

type Props = {
  uf: string;
  /** Cidade escolhida (vazia enquanto o usuário não escolhe uma da lista). */
  value: string;
  onChange: (city: string) => void;
  error?: string;
  editable?: boolean;
};

/**
 * Cidade da localização: busca na lista de municípios da UF escolhida (IBGE) e só aceita uma cidade da lista,
 * para a mesma localização não aparecer escrita de jeitos diferentes nos filtros e no calendário.
 */
export function CityField({ uf, value, onChange, error, editable = true }: Props) {
  const { colors } = useTheme();
  const { cities, loading, error: loadError, retry } = useCities(uf);
  const options = useMemo(() => cities.map((c) => ({ value: c, label: c })), [cities]);

  // UF com uma cidade só (DF): já vem escolhida.
  const only = uf && cities.length === 1 ? cities[0] : null;
  useEffect(() => {
    if (only && value !== only) onChange(only);
  }, [only, value, onChange]);

  return (
    <View style={styles.wrapper}>
      <SearchSelect
        key={uf}
        label={uf ? `Cidade (${uf})` : 'Cidade'}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={!uf ? 'Escolha a UF primeiro' : loading ? `Carregando cidades de ${uf}...` : 'Digite para buscar, ex.: Goiânia'}
        error={error}
        editable={editable && !!uf && !loading && cities.length > 1}
        emptyText={uf ? `Nenhuma cidade de ${uf} com esse nome.` : undefined}
      />
      {loading && <ActivityIndicator color={colors.primary} style={styles.loading} />}
      {loadError && (
        <View style={styles.loadError}>
          <AppText variant="caption" color={colors.error}>
            {loadError}
          </AppText>
          <Button title="Tentar de novo" variant="link" onPress={retry} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  loading: { alignSelf: 'flex-start' },
  loadError: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
