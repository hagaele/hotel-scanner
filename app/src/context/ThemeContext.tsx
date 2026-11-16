import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'hofix:tema';

type ThemeContextValue = {
  /** Escolha da pessoa: seguir o aparelho, claro ou escuro. */
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  /** Tema efetivo depois de aplicar a escolha. */
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Estado global do tema (claro, escuro ou o do aparelho).
 * A escolha fica salva no aparelho (AsyncStorage; no navegador, no armazenamento local),
 * então o app abre do mesmo jeito na próxima vez.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    // Se não der para salvar, o tema vale só até fechar o app: não atrapalha o uso.
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  };

  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';

  return <ThemeContext.Provider value={{ preference, setPreference, isDark }}>{children}</ThemeContext.Provider>;
}

/** Escolha de tema e o tema efetivo. Fora do provider, segue o aparelho. */
export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const system = useColorScheme();
  return context ?? { preference: 'system', setPreference: () => {}, isDark: system === 'dark' };
}
