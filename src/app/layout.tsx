import type { Metadata } from 'next';
import { interVariable, interDisplay } from '@Lib/fonts';

import '@Styles/index.css';


const metadata: Metadata = {
  title: 'MyWebSite',
  description: 'MyWebSite'
};

async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interVariable.variable} ${interDisplay.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="MyWebSite" />

        <link rel="manifest"          href="favicon/manifest.json" />
        <link rel="icon"              href="favicon/favicon.ico"    type="image/x-icon"   sizes="48x48"   />
        <link rel="icon"              href="favicon/icon.svg"       type="image/svg+xml"  sizes="any"     />
        <link rel="icon"              href="favicon/icon.png"       type="image/png"      sizes="96x96"   />
        <link rel="apple-touch-icon"  href="favicon/apple-icon.png" type="image/png"      sizes="180x180" />

        {/* Persist user-selected theme; fallback to system preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('pg-query-client-theme');
                  var theme = (saved === 'light' || saved === 'dark')
                    ? saved
                    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  var isLight = window.maπtchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
                  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
                }
              })();
            `,
          }}
        />
      </head>

      <body>
        {children}
      </body>

    </html>
  );
}


export { metadata };
export default RootLayout;
