'use client';

import type { Theme }                                   from '@Lib/theme-preference';

import { useEffect, useRef, useState }                  from 'react';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, isTheme }  from '@Lib/theme-preference';
import styles                                           from './styles.module.css';


function applyTheme(theme: Theme) {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    return true;
  } catch {
    return false;
  }
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const hasExplicitPreference = useRef(false);

  useEffect(() => {
    const storedTheme   = getStoredTheme();
    const documentTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const initialTheme  = isTheme(documentTheme) ? documentTheme : getSystemTheme();
    const colorScheme   = window.matchMedia('(prefers-color-scheme: light)');

    hasExplicitPreference.current = storedTheme !== null;
    applyTheme(initialTheme);
    setTheme(initialTheme);

    function handleSystemThemeChange() {
      if (hasExplicitPreference.current) return;

      const nextTheme = colorScheme.matches ? 'light' : 'dark';
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    colorScheme.addEventListener('change', handleSystemThemeChange);

    return () => {
      colorScheme.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  function toggleTheme() {
    const documentTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const currentTheme  = theme
      ?? (isTheme(documentTheme) ? documentTheme : getSystemTheme());
    const nextTheme     = currentTheme === 'light' ? 'dark' : 'light';

    if (!storeTheme(nextTheme)) {
      const systemTheme = getSystemTheme();

      hasExplicitPreference.current = false;
      applyTheme(systemTheme);
      setTheme(systemTheme);
      return;
    }

    hasExplicitPreference.current = true;
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      className={styles['toggle']}
      type="button"
      aria-label="Toggle color theme"
      aria-pressed={theme === null ? undefined : theme === 'dark'}
      onClick={toggleTheme}
    >
      {theme === null ? 'Theme' : `${theme === 'light' ? 'Light' : 'Dark'} theme`}
    </button>
  );
}


export default ThemeToggle;
