function loopbackOrigin(host: string | null) {
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$/i.test(host))
    return undefined;
  try {
    return new URL(`http://${host}`);
  } catch {
    return undefined;
  }
}

export function requestSiteOrigin(
  configured: URL | undefined,
  host: string | null,
  development: boolean,
) {
  // Match the actual loopback host and port in dev. Production uses the configured origin.
  if (configured && (!development || configured.host === host?.toLowerCase()))
    return configured;
  return loopbackOrigin(host) ?? configured;
}
