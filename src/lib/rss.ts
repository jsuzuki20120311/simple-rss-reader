import type { Article, Feed } from "../types";

const decode = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
const field = (block: string, name: string) =>
  decode(
    block.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
    )?.[1] ?? "",
  );
export const parseFeed = (xml: string, feed: Feed): Article[] => {
  const blocks = [
    ...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi),
  ].map((m) => m[2]);
  return blocks
    .map((block, index) => {
      const linkTag =
        block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ??
        field(block, "link");
      const title = field(block, "title") || "無題の記事";
      const link = linkTag.trim();
      const date =
        field(block, "pubDate") ||
        field(block, "published") ||
        field(block, "updated");
      return {
        id: link || `${feed.title}-${index}-${title}`,
        title,
        link,
        description: field(block, "description") || field(block, "summary"),
        date,
        feedId: feed.id,
        feedTitle: feed.title,
      };
    })
    .filter((article) => article.link);
};
