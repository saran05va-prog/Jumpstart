/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1417",
          900: "#0A0F12",
          800: "#0E1417",
          700: "#161E22",
        },
        slate: {
          900: "#161E22",
          800: "#1C262B",
          700: "#243036",
          600: "#324047",
          500: "#46565D",
        },
        paper: {
          DEFAULT: "#ECEFE9",
          dim: "#E2E6DD",
        },
        moss: {
          50: "#EAF1EC",
          200: "#BCD6C5",
          400: "#6B9C7E",
          500: "#4C7A5E",
          600: "#3D6249",
          700: "#314E3A",
        },
        ember: {
          50: "#FCEEE6",
          200: "#F4BB97",
          400: "#F0935F",
          500: "#E8743B",
          600: "#C85A26",
          700: "#9C461D",
        },
        gold: {
          400: "#E2C481",
          500: "#D8B25C",
          600: "#B8923F",
        },
        mist: {
          100: "#D7DED9",
          300: "#A9B7AF",
          500: "#8A9A93",
          700: "#5F716A",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(232,116,59,0.4), 0 0 24px -4px rgba(232,116,59,0.5)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(232,116,59,0.55)" },
          "70%": { boxShadow: "0 0 0 10px rgba(232,116,59,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(232,116,59,0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        flicker: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.78" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        rise: "rise 0.45s ease-out both",
        flicker: "flicker 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
