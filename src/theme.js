// theme.js — Design tokens StoryPilot AI
// À importer dans tous les composants styled-components

export const theme = {
  colors: {
    // Backgrounds — "Pétrole & or" (échelle dérivée par interpolation HSL entre
    // les 2 ancrages validés : fond page #0d1917 et fond carte #16211f)
    background: "#0d1917",
    surface: "#0d1917",
    surfaceContainerLowest: "#0d1917",
    surfaceContainerLow: "#0f1b19",
    surfaceContainer: "#16211f",
    surfaceContainerHigh: "#1a2624",
    surfaceContainerHighest: "#1d2b28",
    surfaceBright: "#1e302d",

    // Primary (accent or)
    primary: "#d1a954",
    primaryContainer: "#d1a954",
    onPrimary: "#0d1917",
    onPrimaryContainer: "#0d1917",
    inversePrimary: "#d1a954",

    // Secondary (vert d'eau)
    secondary: "#7fae9d",
    secondaryContainer: "#7fae9d",
    onSecondary: "#0d1917",
    onSecondaryContainer: "#0d1917",

    // Tertiary (violet-mauve — non spécifié par la palette validée, dérivé pour le
    // 3e surlignage Gherkin "Et" ; à confirmer)
    tertiary: "#a881bb",

    // Surface text
    onSurface: "#eef2f0",
    // Gris-teal neutre et désaturé (H169° S8% L68%), distinct de l'accent
    // secondaire #7fae9d. onSurfaceVariant est utilisé ~150 fois dans le code
    // pour du texte muté générique (nav, hints, sous-titres, placeholders) —
    // réutiliser l'accent vert d'eau ici rendait quasiment tout le texte
    // secondaire de l'app vert sur un fond déjà pétrole/vert foncé ("vert sur
    // vert", signalé par l'utilisateur). #7fae9d reste réservé aux accents
    // volontaires (mots-clés Gherkin, badges RAG).
    onSurfaceVariant: "#a7b4b2",
    onBackground: "#eef2f0",

    // Borders (dérivés, non spécifiés par la palette validée ; à confirmer)
    outline: "#6e8782",
    outlineVariant: "#1c2926",

    // Semantic (inchangés — conventions universelles, indépendantes de l'accent de marque)
    error: "#ffb4ab",
    success: "#4ade80",
    amber: "#fbbf24",
  },

  gradients: {
    primary: "linear-gradient(135deg, #d1a954, #7fae9d)",
    primaryContainer: "linear-gradient(135deg, #d1a954, #7fae9d)",
    subtle: "linear-gradient(135deg, #d1a954, #7fae9d)",
  },

  fonts: {
    sans: "'Inter', sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },

  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "32px",
    "4xl": "48px",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },

  radii: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    full: "9999px",
  },

  shadows: {
    primary: "0 0 20px rgba(209, 169, 84, 0.15)",
    primaryStrong: "0 8px 32px rgba(209, 169, 84, 0.25)",
    card: "0 2px 12px rgba(0, 0, 0, 0.3)",
  },

  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    xs: "480px",
  },
};

// Helpers CSS réutilisables (non utilisés actuellement dans le code)
export const glassCard = `
  background: rgba(22, 33, 31, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid #1c2926;
`;

export const indigoGradient = `
  background: linear-gradient(135deg, #d1a954, #7fae9d);
`;

export const primaryGradient = `
  background: linear-gradient(135deg, #d1a954, #7fae9d);
`;
