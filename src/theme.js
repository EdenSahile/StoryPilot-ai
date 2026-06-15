// theme.js — Design tokens StoryForge AI
// À importer dans tous les composants styled-components

export const theme = {
  colors: {
    // Backgrounds
    background: "#031427",
    surface: "#031427",
    surfaceContainerLowest: "#000f21",
    surfaceContainerLow: "#0b1c30",
    surfaceContainer: "#102034",
    surfaceContainerHigh: "#1b2b3f",
    surfaceContainerHighest: "#26364a",
    surfaceBright: "#2a3a4f",

    // Primary (indigo)
    primary: "#c0c1ff",
    primaryContainer: "#8083ff",
    onPrimary: "#1000a9",
    onPrimaryContainer: "#0d0096",
    inversePrimary: "#494bd6",

    // Secondary (violet)
    secondary: "#d0bcff",
    secondaryContainer: "#571bc1",
    onSecondary: "#3c0091",
    onSecondaryContainer: "#c4abff",

    // Tertiary
    tertiary: "#bec6e0",

    // Surface text
    onSurface: "#d3e4fe",
    onSurfaceVariant: "#c7c4d7",
    onBackground: "#d3e4fe",

    // Borders
    outline: "#908fa0",
    outlineVariant: "#464554",

    // Semantic
    error: "#ffb4ab",
    success: "#4ade80",
    amber: "#fbbf24",
  },

  gradients: {
    primary: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    primaryContainer: "linear-gradient(135deg, #8083ff, #571bc1)",
    subtle: "linear-gradient(135deg, #494bd6, #571bc1)",
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
    primary: "0 0 20px rgba(99, 102, 241, 0.15)",
    primaryStrong: "0 8px 32px rgba(99, 102, 241, 0.25)",
    card: "0 2px 12px rgba(0, 0, 0, 0.3)",
  },

  breakpoints: {
    mobile: "768px",
  },
};

// Helpers CSS réutilisables
export const glassCard = `
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid #334155;
`;

export const indigoGradient = `
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
`;

export const primaryGradient = `
  background: linear-gradient(135deg, #8083ff, #571bc1);
`;
