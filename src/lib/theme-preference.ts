const THEME_ATTRIBUTE   = 'data-theme';
const THEME_STORAGE_KEY = 'nextjs-template-theme';
const THEMES            = ['light', 'dark'] as const;

type Theme = (typeof THEMES)[number];

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.includes(value as Theme);
}


export {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  THEMES,
  isTheme
};
export type { Theme };
