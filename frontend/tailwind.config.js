/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#778198",
        line: "#e9edf3",
        brand: "#625bf6",
        "brand-dark": "#5148e5"
      },
      boxShadow: {
        card: "0 8px 30px rgba(27, 39, 68, 0.045)"
      }
    }
  },
  plugins: []
};
