import { useThemePreference } from '@/context/ThemeContext';

import { palette, type ThemeColors } from './tokens';

/** Cores do tema atual (claro ou escuro), conforme a escolha salva na aba Conta. */
export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const { isDark } = useThemePreference();
  return { colors: isDark ? palette.dark : palette.light, isDark };
}
