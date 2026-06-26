/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f19",
        cardBg: "rgba(17, 24, 39, 0.7)",
        borderBg: "rgba(255, 255, 255, 0.08)",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        secondary: "#6b7280",
        brandPurple: "#8b5cf6",
        brandTeal: "#14b8a6"
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
