import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'tasktock_theme';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  border: string;
  inputBg: string;
  danger: string;
  success: string;
  warning: string;
  warningBg: string;
  overlay: string;
  accent: string;
  cyan: string;
  pink: string;
}

interface ThemeDef {
  id: string;
  name: string;
  colors: ThemeColors;
}

const themes: ThemeDef[] = [
  {
    id: 'deep-space',
    name: 'Deep Space',
    colors: {
      background: '#0a0a1a',
      surface: 'rgba(255,255,255,0.05)',
      surfaceAlt: 'rgba(255,255,255,0.08)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.35)',
      primary: '#6C5CE7',
      primaryText: '#ffffff',
      border: 'rgba(255,255,255,0.08)',
      inputBg: 'rgba(255,255,255,0.05)',
      danger: '#ff6b6b',
      success: '#4ade80',
      warning: '#FFD93D',
      warningBg: 'rgba(255,217,61,0.1)',
      overlay: 'rgba(0,0,0,0.7)',
      accent: '#00D2FF',
      cyan: '#00D2FF',
      pink: '#FF6B9D',
    },
  },
  {
    id: 'neon-focus',
    name: 'Neon Focus',
    colors: {
      background: '#0d0d2b',
      surface: 'rgba(0,210,255,0.06)',
      surfaceAlt: 'rgba(0,210,255,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.35)',
      primary: '#00D2FF',
      primaryText: '#ffffff',
      border: 'rgba(0,210,255,0.12)',
      inputBg: 'rgba(0,210,255,0.06)',
      danger: '#ff6b6b',
      success: '#4ade80',
      warning: '#FFD93D',
      warningBg: 'rgba(255,217,61,0.1)',
      overlay: 'rgba(0,0,0,0.7)',
      accent: '#6C5CE7',
      cyan: '#00D2FF',
      pink: '#FF6B9D',
    },
  },
  {
    id: 'calm-study',
    name: 'Calm Study',
    colors: {
      background: '#0f1a1a',
      surface: 'rgba(74,222,128,0.06)',
      surfaceAlt: 'rgba(74,222,128,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.35)',
      primary: '#4ade80',
      primaryText: '#ffffff',
      border: 'rgba(74,222,128,0.12)',
      inputBg: 'rgba(74,222,128,0.06)',
      danger: '#ff6b6b',
      success: '#4ade80',
      warning: '#FFD93D',
      warningBg: 'rgba(255,217,61,0.1)',
      overlay: 'rgba(0,0,0,0.7)',
      accent: '#00D2FF',
      cyan: '#00D2FF',
      pink: '#FF6B9D',
    },
  },
  {
    id: 'cyber-night',
    name: 'Cyber Night',
    colors: {
      background: '#0a0a20',
      surface: 'rgba(255,107,157,0.06)',
      surfaceAlt: 'rgba(255,107,157,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.35)',
      primary: '#FF6B9D',
      primaryText: '#ffffff',
      border: 'rgba(255,107,157,0.12)',
      inputBg: 'rgba(255,107,157,0.06)',
      danger: '#ff6b6b',
      success: '#4ade80',
      warning: '#FFD93D',
      warningBg: 'rgba(255,217,61,0.1)',
      overlay: 'rgba(0,0,0,0.7)',
      accent: '#6C5CE7',
      cyan: '#00D2FF',
      pink: '#FF6B9D',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    colors: {
      background: '#0a1a1a',
      surface: 'rgba(255,217,61,0.06)',
      surfaceAlt: 'rgba(255,217,61,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.35)',
      primary: '#FFD93D',
      primaryText: '#000000',
      border: 'rgba(255,217,61,0.12)',
      inputBg: 'rgba(255,217,61,0.06)',
      danger: '#ff6b6b',
      success: '#4ade80',
      warning: '#FFD93D',
      warningBg: 'rgba(255,217,61,0.1)',
      overlay: 'rgba(0,0,0,0.7)',
      accent: '#6C5CE7',
      cyan: '#00D2FF',
      pink: '#FF6B9D',
    },
  },
];

export const THEME_LIST = themes.map((t) => ({ id: t.id, name: t.name }));

interface ThemeContextType {
  themeId: string;
  colors: ThemeColors;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'deep-space',
  colors: themes[0].colors,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState('deep-space');

  useEffect(() => {
    (async () => {
      const val = await AsyncStorage.getItem(THEME_KEY);
      if (val && themes.find((t) => t.id === val)) setThemeId(val);
    })();
  }, []);

  const setTheme = async (id: string) => {
    setThemeId(id);
    await AsyncStorage.setItem(THEME_KEY, id);
  };

  const colors = themes.find((t) => t.id === themeId)?.colors || themes[0].colors;

  return (
    <ThemeContext.Provider value={{ themeId, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
