import type { Metadata }                              from 'next';
import type { ReactNode }                             from 'react';

import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, THEMES } from '@Lib/theme-preference';

import '@Styles/index.css';


const metadata: Metadata = {
  title      : 'Next.js Template',
  description: 'A greenfield Next.js application template.'
};

const themeBootstrap = `
  (() => {
    const attribute = ${JSON.stringify(THEME_ATTRIBUTE)};
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const themes = ${JSON.stringify(THEMES)};
    let savedTheme = null;

    try {
      savedTheme = window.localStorage.getItem(storageKey);
    } catch {}

    const systemTheme = window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
    const theme = themes.includes(savedTheme) ? savedTheme : systemTheme;

    document.documentElement.setAttribute(attribute, theme);
  })();
`;

function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrap
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}


export { metadata };
export default RootLayout;
