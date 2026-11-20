export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#4A2F20" />
      <g transform="rotate(30 32 32)"><ellipse cx="32" cy="32" rx="13" ry="20" fill="#FFFFFF" /><path d="M32 12C25 24 39 40 32 52" stroke="#4A2F20" strokeWidth="3.4" fill="none" strokeLinecap="round" /></g>
    </svg>);
}
