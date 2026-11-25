export function signInHref(next: string) {
  return `/sign-in?${new URLSearchParams({ next })}`;
}

export function safeReturnPath(next: unknown) {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(next)
  )
    return "/more";
  const url = new URL(next, "https://pginfo.invalid");
  if (url.origin !== "https://pginfo.invalid") return "/more";
  if (
    !/^\/(?:explore|saved|more|list-property|meetups(?:\/[a-f0-9]{24})?|property\/[a-f0-9]{24})(?:\/)?$/i.test(
      url.pathname,
    ) &&
    url.pathname !== "/"
  )
    return "/more";
  return url.pathname + url.search + url.hash;
}
