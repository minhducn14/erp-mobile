/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F38820",
          dark: "#D97010",
          light: "#FFF7ED",
          border: "#FDCB9E",
        },
        surface: "#FFFFFF",
        background: "#F8FAFC",
        text: {
          primary: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        border: "#E2E8F0",
        success: {
          DEFAULT: "#10B981",
          light: "#ECFDF5",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FFFBEB",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#EFF6FF",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEF2F2",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
    },
  },
  plugins: [],
};
