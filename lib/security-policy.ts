function startsWithRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPrivatePath(pathname: string) {
  return (
    startsWithRoute(pathname, '/vault') ||
    startsWithRoute(pathname, '/studio') ||
    startsWithRoute(pathname, '/api/auth') ||
    startsWithRoute(pathname, '/api/vault') ||
    startsWithRoute(pathname, '/api/studio')
  );
}

export function contentSecurityPolicy(privatePath: boolean) {
  const connectSources = privatePath
    ? "'self'"
    : "'self' https://v1.hitokoto.cn";
  const mediaSources = privatePath
    ? "'self'"
    : "'self' https://*.music.126.net";

  return `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; media-src ${mediaSources}; frame-src 'self'; font-src 'self'; connect-src ${connectSources}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
}
