export const Colors = {
  light: {
    text: '#1c1b1a',
    textSecondary: '#6b6762',
    background: '#faf8f5',
    backgroundElement: '#f0ece6',
    backgroundSelected: '#e4ded5',
    card: '#ffffff',
    border: '#e4ded5',
    accent: '#d9552b',
    onAccent: '#ffffff',
    danger: '#c0392b',
  },
  dark: {
    text: '#f4f1ec',
    textSecondary: '#a39e97',
    background: '#141312',
    backgroundElement: '#232120',
    backgroundSelected: '#34312f',
    card: '#1d1b1a',
    border: '#34312f',
    accent: '#ff7a4d',
    onAccent: '#1a0c06',
    danger: '#ff6b5a',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = { one: 4, two: 8, three: 16, four: 24, five: 32 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
