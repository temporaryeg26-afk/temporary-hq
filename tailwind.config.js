/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ash: "#1C1A19",
        soot: "#232120",
        rule: "#36322F",
        plaster: "#E7E2DA",
        concrete: "#9A938A",
        ultra: "#4A5BFF",
        moss: "#86A87F",
        ochre: "#D9A441",
        brick: "#E5574D",
      },
      borderRadius: { ctl: "6px", panel: "10px" },
    },
  },
  plugins: [],
};
