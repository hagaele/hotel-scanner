import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { foldText } from '@/lib/ufs';
import { radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { TextField } from './TextField';

export type SearchOption = {
  value: string;
  /** Texto mostrado na lista e no campo depois de escolhido. */
  label: string;
  /** Outros textos que também encontram a opção (ex.: a sigla da UF). */
  keywords?: string[];
};

type Props = {
  label: string;
  options: SearchOption[];
  /** Valor escolhido (vazio enquanto o usuário não escolhe uma opção da lista). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  editable?: boolean;
  /** Texto quando a busca não acha nada. */
  emptyText?: string;
};

const MAX_SUGGESTIONS = 6;

/**
 * Campo de busca que só aceita uma opção da lista: o usuário digita, escolhe uma sugestão,
 * e editar o texto depois desfaz a escolha. Usado na UF e na cidade da localização.
 * A busca ignora acentos e maiúsculas; primeiro vêm as opções que começam com o texto digitado.
 */
export function SearchSelect({ label, options, value, onChange, placeholder, error, editable = true, emptyText }: Props) {
  const { colors } = useTheme();
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);

  // O valor mudou por fora (opção escolhida sozinha, ou limpa ao trocar a UF): o texto acompanha.
  // Enquanto o usuário digita, o texto dele fica como está (ex.: "go" continua "go" mesmo já valendo Goiás).
  useEffect(() => {
    if (value && !open) setQuery(selectedLabel);
    else if (!value && !open) setQuery('');
  }, [value, selectedLabel, open]);

  const suggestions = useMemo(() => {
    const q = foldText(query);
    if (!q) return [];
    const texts = (o: SearchOption) => [o.label, ...(o.keywords ?? [])].map(foldText);
    const starts = options.filter((o) => texts(o).some((t) => t.startsWith(q)));
    const contains = options.filter((o) => !starts.includes(o) && texts(o).some((t) => t.includes(q)));
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [options, query]);

  const searching = open && !value && foldText(query).length > 0;

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
          // Texto igual a uma opção (sem contar acento e maiúsculas, ex.: "goiania" ou "GO"): já vale como escolhida.
          const q = foldText(text);
          const exact = q ? options.find((o) => [o.label, ...(o.keywords ?? [])].some((t) => foldText(t) === q)) : undefined;
          if (exact) {
            if (exact.value !== value) onChange(exact.value);
          } else if (value) onChange(''); // editou o texto: só volta a valer quando escolher na lista
        }}
        onFocus={() => setOpen(true)}
        // Fecha a lista ao sair do campo (com um respiro, para o toque numa sugestão ainda contar).
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        editable={editable}
        error={error}
      />

      {searching && suggestions.length > 0 && (
        <View style={[styles.list, { borderColor: colors.inputBorder, backgroundColor: colors.card }]}>
          {suggestions.map((option, i) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setQuery(option.label);
                setOpen(false);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.option,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}>
              <AppText variant="label">{option.label}</AppText>
            </Pressable>
          ))}
        </View>
      )}

      {searching && suggestions.length === 0 && emptyText && (
        <AppText variant="caption" muted>
          {emptyText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  list: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  option: { minHeight: touchTarget - 4, justifyContent: 'center', paddingHorizontal: spacing.md },
});
