/* eslint-disable @next/next/no-img-element */
export default function Avatar({ url, size = 64 }: { url?: string | null; size?: number }) {
  const st = { width: size, height: size };
  return url ? <img src={url} alt="" style={st} className="rounded-full object-cover bg-sand" />
    : <span style={st} className="rounded-full bg-roast grid place-items-center overflow-hidden" aria-hidden>
      <svg viewBox="0 0 24 24" width={size * .62} height={size * .62} fill="#FFFFFF"><circle cx="12" cy="8" r="4.2" /><path d="M3.5 21c0-4.7 3.8-7.5 8.5-7.5s8.5 2.8 8.5 7.5z" /></svg></span>;
}
