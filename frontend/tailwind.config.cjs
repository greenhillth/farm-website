/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{svelte,ts,js}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1117",
        panel: "#0f1722",
        text: "#e6edf3",
        muted: "#9fb3c8",
        border: "#72e49c",
        accent: "#1f2a37",
      },
    },
  },
  plugins: [],
};
