export type Feed = { id: string; title: string; url: string };
export type FeedSource = "google" | "bing" | "url";
export type Article = {
  id: string;
  title: string;
  link: string;
  description: string;
  date: string;
  feedId?: string;
  feedTitle: string;
};
export type ThemeId =
  | "sakura"
  | "newspaper"
  | "monochrome"
  | "dark"
  | "monokai"
  | "solarizedLight"
  | "solarizedDark"
  | "sepia"
  | "ocean"
  | "forest";
export type AppTheme = {
  id: ThemeId;
  name: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  readerBackground: string;
  readerText: string;
  readerLink: string;
};

export type Screen = "articles" | "feeds" | "bookmarks";
