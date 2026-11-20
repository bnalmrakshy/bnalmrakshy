export default function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-sand ${className}`} />;
}
