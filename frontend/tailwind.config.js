/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#2563EB",
        "light-blue-bg": "#EFF6FF",
        "sidebar-bg": "#F8FAFC",
        border: "#E5E7EB",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        hover: "#F3F4F6",
      },
    },
  },
  plugins: [],
};
