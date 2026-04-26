export const siteConfig = {
  description: "A TanStack Start starter for Wafer apps that can grow past Wafer later.",
  name: "wafer-start",
} as const;

export function buildTitle(pageTitle?: string) {
  if (!pageTitle || pageTitle === siteConfig.name) {
    return siteConfig.name;
  }

  return `${pageTitle} | ${siteConfig.name}`;
}
