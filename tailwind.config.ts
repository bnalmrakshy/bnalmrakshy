import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.tsx", "./components/**/*.tsx"],
  theme: { extend: {
    colors: { espresso:"#141414", roast:"#4A2F20", cream:"#FFFFFF", sand:"#EDE6E0", brass:"#B07B52", caramel:"#9C6B45" },
    fontFamily: { sans: ["var(--font-cairo)", "system-ui", "sans-serif"] },
  } },
} satisfies Config;
