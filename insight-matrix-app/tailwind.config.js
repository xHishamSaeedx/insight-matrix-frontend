/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      container: {
        center: true,
        padding: "1rem",
      },
      colors: {
        primary: "#3B82F6",
        secondary: "#8B5CF6",
      },
    },
  },
  plugins: [],
};
