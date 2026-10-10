export const requiresBrowserRedirect = (value: string) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    return (
      (hostname === "news.google.com" && pathname.startsWith("/rss")) ||
      ((hostname === "bing.com" || hostname === "www.bing.com") &&
        pathname.startsWith("/news"))
    );
  } catch {
    return false;
  }
};
