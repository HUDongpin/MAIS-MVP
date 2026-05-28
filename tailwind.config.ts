const config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        glow: "0 12px 28px rgba(15, 23, 42, 0.08)",
        violetGlow: "0 14px 30px rgba(79, 70, 229, 0.14)"
      },
      backgroundImage: {
        "radial-glow": "radial-gradient(circle at top left, rgba(14,165,233,.10), transparent 36%), radial-gradient(circle at 80% 18%, rgba(99,102,241,.08), transparent 34%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(2deg)" }
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.48" },
          "50%": { opacity: "0.9" }
        },
        gridPan: {
          "0%": { backgroundPosition: "0px 0px" },
          "100%": { backgroundPosition: "72px 72px" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseGlow: "pulseGlow 4.5s ease-in-out infinite",
        gridPan: "gridPan 22s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
