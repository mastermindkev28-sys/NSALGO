import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/login", "/signup/plan", "/reset-password", "/verify-email"] }],
    sitemap: `${SITE.url.replace(/\/$/, "")}/sitemap.xml`,
    host: SITE.url,
  };
}
