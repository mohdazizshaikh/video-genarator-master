/** Compare parsed origins; string prefixes and protocol-relative URLs are unsafe. */
export function isApiOrigin(
  input: string | URL | Request,
  configuredBase = "",
): boolean {
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    const api = new URL(configuredBase || "/", origin);
    const target = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      api,
    );
    return (
      ["http:", "https:"].includes(target.protocol) &&
      !target.username &&
      !target.password &&
      target.origin === api.origin
    );
  } catch {
    return false;
  }
}
