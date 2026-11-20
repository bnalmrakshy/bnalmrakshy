import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "المراكشي", short_name: "المراكشي", description: "نقاطك وفواتيرك ومنيو المراكشي", start_url: "/", display: "standalone", background_color: "#141414", theme_color: "#141414", lang: "ar",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
