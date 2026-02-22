// src/context/ThemeContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  import { Appearance, type ColorSchemeName } from 'react-native';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  
  type ThemePreference = 'light' | 'dark' | 'system';
  
  type ThemeContextValue = {
    theme: ThemePreference;              // что выбрал пользователь
    resolvedTheme: 'light' | 'dark';     // фактическая тема (с учётом system)
    setTheme: (theme: ThemePreference) => void;
  };
  
  const STORAGE_KEY = 'app_theme_preference';
  
  const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
  
  export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<ThemePreference>('system');
    const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
      Appearance.getColorScheme()
    );
  
    // следим за системной темой
    useEffect(() => {
      const sub = Appearance.addChangeListener(({ colorScheme }) => {
        setSystemScheme(colorScheme);
      });
      return () => sub.remove();
    }, []);
  
    // загружаем сохранённое предпочтение
    useEffect(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored === 'light' || stored === 'dark' || stored === 'system') {
            setThemeState(stored);
          }
        } catch {
          // ignore
        }
      })();
    }, []);
  
    const setTheme = (next: ThemePreference) => {
      setThemeState(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    };
  
    const resolvedTheme: 'light' | 'dark' =
      theme === 'system'
        ? systemScheme === 'dark'
          ? 'dark'
          : 'light'
        : theme;
  
    return (
      <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  };
  
  export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
      throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
  };