import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nudge",
    short_name: "Nudge",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F4F0",
    theme_color: "#534AB7",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
