export const siteConfig = {
  description: "A lightweight Vite, React, and Hono starter for Wafer apps.",
  name: "wafer-default",
} as const;

export function buildTitle(pageTitle?: string) {
  if (!pageTitle || pageTitle === siteConfig.name) {
    return siteConfig.name;
  }

  return `${pageTitle} | ${siteConfig.name}`;
}
