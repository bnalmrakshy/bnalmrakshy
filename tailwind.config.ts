import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.tsx", "./components/**/*.tsx"],
  theme: { extend: {
    colors: { espresso:"#2A1912", roast:"#4A2E20", cream:"#F6EEDF", sand:"#E6D6BC", brass:"#B38A4A", caramel:"#C47A3D" },
    fontFamily: { sans: ["var(--font-cairo)", "system-ui", "sans-serif"] },
  } },
} satisfies Config;
