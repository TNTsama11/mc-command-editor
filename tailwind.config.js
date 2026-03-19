/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Minecraft theme colors
        mc: {
          grass: "#5D8C3D",
          dirt: "#8B5A2B",
          stone: "#7F7F7F",
          stoneDark: "#555555",
          stoneLight: "#C6C6C6",
          diamond: "#4AEDD9",
          gold: "#FCEE4B",
          redstone: "#FF0000",
          emerald: "#17DD62",
          nether: "#8B0000",
          end: "#DDDB00",
          command: "#1A8C7C",
          commandLight: "#2AC4B0",
          commandDark: "#0F564C",
          repeating: "#8C1A6C",
          repeatingLight: "#C42AA0",
          repeatingDark: "#560F44",
          chain: "#6C6C1A",
          chainLight: "#A0A02A",
          chainDark: "#44440F",
          panel: "#C6C6C6",
          panelDark: "#1A1A1A",
          panelWood: "#8B6914",
        },
        // Node pin colors
        pin: {
          execute: "#FFFFFF",
          position: "#22C55E",
          entity: "#EF4444",
          number: "#3B82F6",
          string: "#EAB308",
          boolean: "#A855F7",
          nbt: "#F97316",
          resource: "#06B6D4",
          any: "#6B7280",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
