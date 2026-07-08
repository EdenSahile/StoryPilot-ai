// theme.js — Design tokens StoryForge AI
// À importer dans tous les composants styled-components

export const theme = {
  colors: {
    // Backgrounds — "Forge à braises" (charbon chaud)
    background: "#171310",
    surface: "#171310",
    surfaceContainerLowest: "#171310",
    surfaceContainerLow: "#1c1712",
    surfaceContainer: "#2c241d",
    surfaceContainerHigh: "#362d24",
    surfaceContainerHighest: "#423628",
    surfaceBright: "#4a3d2d",

    // Primary (braise orange)
    primary: "#e2793d",
    primaryContainer: "#e2793d",
    onPrimary: "#171310",
    onPrimaryContainer: "#171310",
    inversePrimary: "#e2793d",

    // Secondary (kaki / laiton)
    secondary: "#b8a072",
    secondaryContainer: "#b8a072",
    onSecondary: "#171310",
    onSecondaryContainer: "#171310",

    // Tertiary (sable chaud — non spécifié par la palette validée, dérivé pour le
    // 3e surlignage Gherkin "Et" ; à confirmer)
    tertiary: "#c9a97e",

    // Surface text
    onSurface: "#f0e6d8",
    onSurfaceVariant: "#a89a85",
    onBackground: "#f0e6d8",

    // Borders
    outline: "#9c8a72",
    outlineVariant: "#332a20",

    // Semantic (inchangés — conventions universelles, indépendantes de l'accent de marque)
    error: "#ffb4ab",
    success: "#4ade80",
    amber: "#fbbf24",
  },

  gradients: {
    primary: "linear-gradient(135deg, #e2793d, #b8a072)",
    primaryContainer: "linear-gradient(135deg, #e2793d, #b8a072)",
    subtle: "linear-gradient(135deg, #e2793d, #b8a072)",
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
    primary: "0 0 20px rgba(226, 121, 61, 0.15)",
    primaryStrong: "0 8px 32px rgba(226, 121, 61, 0.25)",
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
  background: rgba(44, 36, 29, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid #332a20;
`;

export const indigoGradient = `
  background: linear-gradient(135deg, #e2793d, #b8a072);
`;

export const primaryGradient = `
  background: linear-gradient(135deg, #e2793d, #b8a072);
`;
