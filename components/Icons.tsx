const P: Record<string, string> = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  cup: "M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.5-6 8-6s8 2 8 6",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  ig: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01",
  chat: "M4 5h16v11H9l-5 4z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeoff: "M3 3l18 18M10.6 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  chart: "M4 20h16M7 20V11M12 20V5M17 20v-7",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  cart: "M3 4h2l2 11h11l2-8H6M9 20h.01M17 20h.01",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M17 11a2.5 2.5 0 1 0 0-5M18 15c2.5.3 4 1.6 4 4",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h3",
  doc: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  flame: "M12 3c.5 3 4 4.5 4 9a4 4 0 0 1-8 0c0-2 1-3.2 2-4.2.1 1.6 1 2 2 1.4-.8-2-1-4 0-6.2z",
  arrowup: "M12 19V5M6 11l6-6 6 6",
  arrowdown: "M12 5v14M6 13l6 6 6-6",
  fb: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z",
};
export default function Icon({ name, size = 24 }: { name: keyof typeof P; size?: number }) {
  const solid = name === "fb";
  return <svg viewBox="0 0 24 24" width={size} height={size} fill={solid ? "currentColor" : "none"} stroke={solid ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[name]} /></svg>;
}
