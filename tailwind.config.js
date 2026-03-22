/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        masuki: {
          50: "#f8f3ef",
          100: "#eedfd2",
          200: "#dcc0a6",
          300: "#c79b73",
          500: "#8a5a3b",
          700: "#5a3320",
          900: "#2a170f"
        }
      }
    }
  },
  plugins: []
};
