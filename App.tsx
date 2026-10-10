import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet as NativeStyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const StyleSheet = Object.assign(NativeStyleSheet, {
  absoluteFillObject: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
});

type Feed = { id: string; title: string; url: string };
type FeedSource = "google" | "bing" | "url";
type Article = {
  id: string;
  title: string;
  link: string;
  description: string;
  date: string;
  feedId?: string;
  feedTitle: string;
};
type ThemeId =
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
type AppTheme = {
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
const FEEDS_KEY = "@simple-rss-reader/feeds";
const BOOKMARKS_KEY = "@simple-rss-reader/bookmarks";
const THEME_KEY = "@simple-rss-reader/theme";
const DEFAULT_FEEDS: Feed[] = [];

const THEMES: AppTheme[] = [
  {
    id: "sakura",
    name: "サクラエディタ",
    background: "#eef4ff",
    surface: "#dbe8ff",
    card: "#ffffff",
    text: "#000080",
    muted: "#5c6580",
    accent: "#0000ff",
    border: "#9eb9e8",
    readerBackground: "#ffffff",
    readerText: "#000080",
    readerLink: "#0000ff",
  },
  {
    id: "newspaper",
    name: "新聞紙",
    background: "#ddd8ca",
    surface: "#ebe6d8",
    card: "#f5f1e6",
    text: "#1f1d19",
    muted: "#625e54",
    accent: "#8b1e1e",
    border: "#aaa394",
    readerBackground: "#f5f1e6",
    readerText: "#1f1d19",
    readerLink: "#8b1e1e",
  },
  {
    id: "monochrome",
    name: "白黒",
    background: "#ffffff",
    surface: "#f4f4f4",
    card: "#ffffff",
    text: "#000000",
    muted: "#666666",
    accent: "#000000",
    border: "#cccccc",
    readerBackground: "#ffffff",
    readerText: "#000000",
    readerLink: "#000000",
  },
  {
    id: "dark",
    name: "ダーク",
    background: "#0b1020",
    surface: "#11182b",
    card: "#151d31",
    text: "#f8fafc",
    muted: "#8d98b1",
    accent: "#a69cff",
    border: "#202b43",
    readerBackground: "#171b26",
    readerText: "#e8eaf0",
    readerLink: "#a69cff",
  },
  {
    id: "monokai",
    name: "Monokai",
    background: "#1e1f1c",
    surface: "#272822",
    card: "#30312b",
    text: "#f8f8f2",
    muted: "#a6a69c",
    accent: "#f92672",
    border: "#49483e",
    readerBackground: "#272822",
    readerText: "#f8f8f2",
    readerLink: "#a6e22e",
  },
  {
    id: "solarizedLight",
    name: "Solarized Light",
    background: "#eee8d5",
    surface: "#fdf6e3",
    card: "#fffaf0",
    text: "#586e75",
    muted: "#839496",
    accent: "#268bd2",
    border: "#d4cbb4",
    readerBackground: "#fdf6e3",
    readerText: "#586e75",
    readerLink: "#268bd2",
  },
  {
    id: "solarizedDark",
    name: "Solarized Dark",
    background: "#002b36",
    surface: "#073642",
    card: "#0b3c49",
    text: "#eee8d5",
    muted: "#93a1a1",
    accent: "#2aa198",
    border: "#15505d",
    readerBackground: "#002b36",
    readerText: "#eee8d5",
    readerLink: "#2aa198",
  },
  {
    id: "sepia",
    name: "セピア",
    background: "#cdbf9f",
    surface: "#dfd2b5",
    card: "#f2e7cc",
    text: "#493b2a",
    muted: "#7b6951",
    accent: "#9b5b35",
    border: "#b4a27e",
    readerBackground: "#f2e7cc",
    readerText: "#493b2a",
    readerLink: "#9b5b35",
  },
  {
    id: "ocean",
    name: "オーシャン",
    background: "#061b2c",
    surface: "#0b2942",
    card: "#103653",
    text: "#e8f6ff",
    muted: "#8db2c9",
    accent: "#38bdf8",
    border: "#174c70",
    readerBackground: "#e9f7fb",
    readerText: "#123447",
    readerLink: "#0077a8",
  },
  {
    id: "forest",
    name: "フォレスト",
    background: "#102019",
    surface: "#193027",
    card: "#223c31",
    text: "#edf7ef",
    muted: "#9ab5a2",
    accent: "#7ddc8b",
    border: "#315344",
    readerBackground: "#edf3e8",
    readerText: "#203126",
    readerLink: "#28733b",
  },
];

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
const parseFeed = (xml: string, feed: Feed): Article[] => {
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

const READER_SCRIPT = `
  setTimeout(function () {
    try {
      var candidates = Array.prototype.slice.call(document.querySelectorAll('article, main, [role="main"], .article-body, .article-content, .entry-content, .post-content'));
      if (!candidates.length) candidates = Array.prototype.slice.call(document.querySelectorAll('section, div'));
      var root = candidates.reduce(function (best, node) {
        var score = (node.innerText || '').trim().length + node.querySelectorAll('p').length * 180;
        return score > best.score ? { node: node, score: score } : best;
      }, { node: document.body, score: 0 }).node;
      var content = root.cloneNode(true);
      content.querySelectorAll('script, style, nav, header, footer, aside, form, button, iframe, noscript, amp-ad, amp-embed, ins.adsbygoogle, [data-ad], [data-ad-slot], [aria-label*="advert" i], .advertisement, .advert, .ads, .ad-container, .ad-wrapper, .ad-banner, .sponsored, .sponsor, .promotion, .social, .share, .related, .comments').forEach(function (node) { node.remove(); });
      content.querySelectorAll('[id], [class]').forEach(function (node) {
        var marker = ((node.id || '') + ' ' + (typeof node.className === 'string' ? node.className : '')).toLowerCase();
        if (/(^|[ _-])(ad|ads|advert|advertisement|sponsor|sponsored|pr)([ _-]|$)/.test(marker)) node.remove();
      });
      content.querySelectorAll('[src]').forEach(function (node) { try { node.src = new URL(node.getAttribute('src'), location.href).href; } catch (_) {} });
      content.querySelectorAll('a[href]').forEach(function (node) { try { node.href = new URL(node.getAttribute('href'), location.href).href; } catch (_) {} });
      var title = document.querySelector('h1') ? document.querySelector('h1').innerText : document.title;
      var style = 'html{background:__READER_BG__!important;color:__READER_TEXT__!important}body{display:block!important;margin:0 auto!important;padding:28px 22px 60px!important;max-width:760px!important;background:__READER_BG__!important;color:__READER_TEXT__!important;font-size:18px!important;line-height:1.9!important}#rss-reader-root{display:block!important;visibility:visible!important;opacity:1!important}#rss-reader-root h1{font-size:30px!important;line-height:1.35!important;margin:0 0 28px!important}#rss-reader-root h2,#rss-reader-root h3{line-height:1.45!important;margin-top:2em!important}#rss-reader-root p{margin:1.2em 0!important}#rss-reader-root img,#rss-reader-root video{max-width:100%!important;height:auto!important;border-radius:8px}#rss-reader-root a{color:__READER_LINK__!important}#rss-reader-root figure{margin:1.8em 0!important}#rss-reader-root figcaption{font-size:13px!important;opacity:.7}#rss-reader-root pre{overflow:auto!important;background:rgba(127,127,127,.14)!important;padding:14px!important;border-radius:8px}';
      document.documentElement.lang = 'ja';
      var readerStyle = document.createElement('style');
      readerStyle.id = 'rss-reader-style';
      readerStyle.textContent = style;
      document.head.appendChild(readerStyle);
      document.body.innerHTML = '<main id="rss-reader-root"><h1>' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h1>' + content.innerHTML + '</main>';
      window.scrollTo(0, 0);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader-ready' }));
    } catch (error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader-error' }));
    }
  }, 400);
  true;
`;

const getReaderScript = (theme: AppTheme) =>
  READER_SCRIPT.replaceAll("__READER_BG__", theme.readerBackground)
    .replaceAll("__READER_TEXT__", theme.readerText)
    .replaceAll("__READER_LINK__", theme.readerLink);

export default function App() {
  const [feeds, setFeeds] = useState<Feed[]>(DEFAULT_FEEDS);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [active, setActive] = useState<"articles" | "feeds" | "bookmarks">(
    "articles",
  );
  const [selectedFeedId, setSelectedFeedId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>("dark");
  const [webArticle, setWebArticle] = useState<Article | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [readerMode, setReaderMode] = useState(true);
  const [readerReady, setReaderReady] = useState(false);
  const [readerError, setReaderError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const articleListRef = useRef<FlatList<Article>>(null);
  const webViewRef = useRef<WebView>(null);
  const [feedSource, setFeedSource] = useState<FeedSource>("google");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [feedName, setFeedName] = useState("");

  const theme = useMemo(
    () => THEMES.find((item) => item.id === themeId) ?? THEMES[3],
    [themeId],
  );
  const readerScript = useMemo(() => getReaderScript(theme), [theme]);

  useEffect(() => {
    (async () => {
      const savedFeeds = await AsyncStorage.getItem(FEEDS_KEY);
      const savedBookmarks = await AsyncStorage.getItem(BOOKMARKS_KEY);
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedFeeds) setFeeds(JSON.parse(savedFeeds));
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
      if (savedTheme && THEMES.some((item) => item.id === savedTheme))
        setThemeId(savedTheme as ThemeId);
    })();
  }, []);

  const saveBookmarks = async (next: Article[]) => {
    setBookmarks(next);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  };

  const refresh = async () => {
    if (!feeds.length) {
      setArticles([]);
      return;
    }
    setLoading(true);
    try {
      const results = (
        await Promise.all(
          feeds.map(async (feed) => {
            const response = await fetch(feed.url);
            if (!response.ok) throw new Error(`${response.status}`);
            return parseFeed(await response.text(), feed);
          }),
        )
      ).flat();
      setArticles(
        results.sort(
          (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0),
        ),
      );
    } catch {
      Alert.alert(
        "読み込みエラー",
        "RSSを取得できませんでした。URLやネットワークを確認してください。",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [feeds]);

  useEffect(() => {
    if (
      selectedFeedId !== "all" &&
      !feeds.some((feed) => feed.id === selectedFeedId)
    ) {
      setSelectedFeedId("all");
    }
  }, [feeds, selectedFeedId]);

  useEffect(() => {
    if (active === "articles") {
      articleListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedFeedId]);

  const addFeed = async () => {
    const keyword = searchKeyword.trim();
    let value = url.trim();
    let defaultTitle = value;

    if (feedSource !== "url") {
      if (!keyword) {
        Alert.alert("検索ワードを入力してください");
        return;
      }

      const query = encodeURIComponent(keyword);
      if (feedSource === "google") {
        value = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
        defaultTitle = `Googleニュース: ${keyword}`;
      } else {
        value = `https://www.bing.com/news/search?q=${query}&format=rss&setlang=ja`;
        defaultTitle = `Bingニュース: ${keyword}`;
      }
    } else if (!/^https?:\/\//i.test(value)) {
      Alert.alert(
        "URLを確認してください",
        "http:// または https:// から始まるURLを入力してください。",
      );
      return;
    }
    const next = [
      ...feeds,
      { id: `${Date.now()}`, title: feedName.trim() || defaultTitle, url: value },
    ];
    setFeeds(next);
    await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(next));
    setUrl("");
    setSearchKeyword("");
    setFeedName("");
    setModal(false);
  };
  const removeFeed = async (id: string) => {
    const next = feeds.filter((feed) => feed.id !== id);
    setFeeds(next);
    await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(next));
  };
  const selectTheme = async (id: ThemeId) => {
    setThemeId(id);
    await AsyncStorage.setItem(THEME_KEY, id);
    setThemeModal(false);
  };
  const openArticle = (article: Article) => {
    setReaderMode(true);
    setReaderReady(false);
    setReaderError(false);
    setWebArticle(article);
  };
  const closeWebView = () => {
    setWebArticle(null);
    setWebLoading(false);
    setReaderReady(false);
    setReaderError(false);
    setCanGoBack(false);
    setCanGoForward(false);
  };
  const handleReaderMessage = (data: string) => {
    try {
      const message = JSON.parse(data);
      if (message.type === "reader-ready") {
        setWebLoading(false);
        setReaderReady(true);
        setReaderError(false);
      } else if (message.type === "reader-error") {
        setWebLoading(false);
        setReaderError(true);
        setReaderMode(false);
      }
    } catch {
      setWebLoading(false);
      setReaderError(true);
      setReaderMode(false);
    }
  };
  const visible =
    active === "bookmarks"
      ? bookmarks
      : selectedFeedId === "all"
        ? articles
        : articles.filter((article) => article.feedId === selectedFeedId);
  const empty =
    active === "feeds"
      ? "登録したRSSフィードはありません。"
      : active === "bookmarks"
        ? "保存した記事はありません。"
        : feeds.length
          ? "記事がありません。"
          : "まずRSSフィードを登録してください。";
  const feedList = useMemo(() => feeds, [feeds]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar
        style={
          theme.text === "#000000" ||
          theme.id === "sakura" ||
          theme.id === "newspaper" ||
          theme.id === "solarizedLight" ||
          theme.id === "sepia"
            ? "dark"
            : "light"
        }
      />
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>
            LOCAL READER
          </Text>
          <Text style={[styles.heading, { color: theme.text }]}>
            {active === "feeds"
              ? "フィード"
              : active === "bookmarks"
                ? "ブックマーク"
                : "タイムライン"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setThemeModal(true)}
          >
            <Text style={[styles.addText, { color: theme.accent }]}>◐</Text>
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.accent }]}
            onPress={() => setModal(true)}
          >
            <Text
              style={[
                styles.addText,
                {
                  color:
                    theme.id === "monochrome" ? "#ffffff" : theme.background,
                },
              ]}
            >
              ＋ RSS
            </Text>
          </Pressable>
        </View>
      </View>
      {active === "articles" && (
        <View
          style={[
            styles.feedTabsContainer,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedTabsContent}
          >
            {[{ id: "all", title: "すべて" }, ...feeds].map((feed) => {
              const selected = selectedFeedId === feed.id;
              return (
                <Pressable
                  key={feed.id}
                  style={[
                    styles.feedTab,
                    {
                      backgroundColor: selected
                        ? theme.accent
                        : theme.surface,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedFeedId(feed.id)}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.feedTabText,
                      {
                        color: selected
                          ? theme.id === "monochrome"
                            ? "#ffffff"
                            : theme.background
                          : theme.text,
                      },
                    ]}
                  >
                    {feed.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
      {active === "feeds" ? (
        <FlatList
          data={feedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{empty}</Text>}
          renderItem={({ item }) => (
            <View style={[styles.feedRow, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={[styles.feedIcon, { backgroundColor: theme.surface }]}>
                <Text style={[styles.feedIconText, { color: theme.accent }]}>RSS</Text>
              </View>
              <View style={styles.feedInfo}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.url, { color: theme.muted }]} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
              <Pressable onPress={() => removeFeed(item.id)}>
                <Text style={[styles.delete, { color: theme.accent }]}>削除</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <FlatList
          ref={articleListRef}
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={refresh}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{empty}</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => item.link && openArticle(item)}
            >
              <View style={styles.cardMeta}>
                <Text style={[styles.source, { color: theme.accent }]}>{item.feedTitle}</Text>
                <Pressable
                  onPress={() =>
                    saveBookmarks(
                      bookmarks.some((b) => b.id === item.id)
                        ? bookmarks.filter((b) => b.id !== item.id)
                        : [...bookmarks, item],
                    )
                  }
                >
                  <Text style={[styles.star, { color: theme.accent }]}>
                    {bookmarks.some((b) => b.id === item.id) ? "★" : "☆"}
                  </Text>
                </Pressable>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              {!!item.description && (
                <Text style={[styles.description, { color: theme.muted }]} numberOfLines={3}>
                  {item.description}
                </Text>
              )}
              <Text style={[styles.date, { color: theme.muted }]}>
                {item.date
                  ? new Date(item.date).toLocaleDateString("ja-JP")
                  : ""}
              </Text>
            </Pressable>
          )}
        />
      )}
      <View style={[styles.tabs, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {[
          ["articles", "記事"],
          ["feeds", "フィード"],
          ["bookmarks", "保存"],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => setActive(key as typeof active)}
          >
            <Text style={[styles.tabText, { color: active === key ? theme.accent : theme.muted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={modal}
        animationType="slide"
        transparent
        onRequestClose={() => setModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>RSSフィードを追加</Text>
            <View style={styles.feedSourceSelector}>
              {([
                ["google", "Google検索"],
                ["bing", "Bing検索"],
                ["url", "URL指定"],
              ] as const).map(([source, label]) => {
                const selected = feedSource === source;
                return (
                  <Pressable
                    key={source}
                    style={[
                      styles.feedSourceButton,
                      {
                        backgroundColor: selected ? theme.accent : theme.surface,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => setFeedSource(source)}
                  >
                    <Text
                      style={[
                        styles.feedSourceButtonText,
                        { color: selected ? "#fff" : theme.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, borderWidth: 1 }]}
              placeholder="フィード名（任意）"
              placeholderTextColor={theme.muted}
              value={feedName}
              onChangeText={setFeedName}
            />
            {feedSource === "url" ? (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, borderWidth: 1 }]}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                onChangeText={setUrl}
              />
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, borderWidth: 1 }]}
                placeholder="検索ワード（例: React Native）"
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                onSubmitEditing={addFeed}
              />
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModal(false)}>
                <Text style={[styles.cancel, { color: theme.muted }]}>キャンセル</Text>
              </Pressable>
              <Pressable style={[styles.save, { backgroundColor: theme.accent }]} onPress={addFeed}>
                <Text style={styles.saveText}>保存する</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={themeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setThemeModal(false)}
      >
        <View style={styles.modalRoot}>
          <View style={[styles.modal, { backgroundColor: theme.card, maxHeight: "82%" }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>テーマを選択</Text>
            <FlatList
              data={THEMES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 8, borderRadius: 12, borderWidth: item.id === themeId ? 2 : 1, borderColor: item.id === themeId ? item.accent : theme.border, backgroundColor: item.card }}
                  onPress={() => selectTheme(item.id)}
                >
                  <View style={{ flexDirection: "row", marginRight: 14 }}>
                    <View style={{ width: 22, height: 34, backgroundColor: item.background, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
                    <View style={{ width: 22, height: 34, backgroundColor: item.accent, borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
                  </View>
                  <Text style={{ flex: 1, color: item.text, fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
                  {item.id === themeId && <Text style={{ color: item.accent, fontWeight: "800" }}>✓</Text>}
                </Pressable>
              )}
            />
            <Pressable style={{ alignSelf: "flex-end", paddingTop: 10 }} onPress={() => setThemeModal(false)}>
              <Text style={{ color: theme.muted, fontWeight: "700" }}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!webArticle}
        animationType="slide"
        onRequestClose={closeWebView}
      >
        <SafeAreaView style={[styles.webSafe, { backgroundColor: theme.background }]}>
          <StatusBar style={theme.id === "monochrome" || theme.id === "sakura" || theme.id === "newspaper" || theme.id === "solarizedLight" || theme.id === "sepia" ? "dark" : "light"} />
          <View style={[styles.webHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Pressable style={styles.webBack} onPress={closeWebView}>
              <Text style={[styles.webBackText, { color: theme.accent }]}>‹ 戻る</Text>
            </Pressable>
            <Text style={[styles.webTitle, { color: theme.text }]} numberOfLines={1}>
              {webArticle?.title}
            </Text>
            <Pressable
              style={styles.modeButton}
              onPress={() => {
                setReaderReady(false);
                setReaderError(false);
                setReaderMode((value) => !value);
              }}
            >
              <Text style={[styles.modeButtonText, { color: theme.accent }]}>
                {readerMode ? "通常" : "リーダー"}
              </Text>
            </Pressable>
          </View>
          {webLoading && (
            <View style={styles.webLoading}>
              <ActivityIndicator color={theme.accent} />
            </View>
          )}
          <View style={styles.webContent}>
            {webArticle && (
              <WebView
                key={readerMode ? "reader" : "normal"}
                ref={webViewRef}
                source={{ uri: webArticle.link }}
                style={[
                  styles.webView,
                  readerMode && !readerReady && { opacity: 0 },
                ]}
                onMessage={(event) =>
                  handleReaderMessage(event.nativeEvent.data)
                }
                onLoadStart={() => {
                  setWebLoading(true);
                  if (readerMode) setReaderReady(false);
                }}
                onLoadEnd={() => {
                  setWebLoading(false);
                  if (readerMode) {
                    webViewRef.current?.injectJavaScript(readerScript);
                  }
                }}
                onNavigationStateChange={(state) => {
                  setCanGoBack(state.canGoBack);
                  setCanGoForward(state.canGoForward);
                }}
              />
            )}
            {readerMode && !readerReady && (
              <View style={[styles.readerWaiting, { backgroundColor: theme.readerBackground }]}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.readerWaitingText, { color: theme.muted }]}>
                  {readerError
                    ? "本文を抽出できませんでした"
                    : "読みやすい表示を準備しています"}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.webToolbar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <Pressable
              style={styles.webNavButton}
              disabled={readerMode || !canGoBack}
              onPress={() => webViewRef.current?.goBack()}
            >
              <Text
                style={[
                  styles.webNavText,
                  { color: readerMode || !canGoBack ? theme.border : theme.accent },
                ]}
              >
                ← 戻る
              </Text>
            </Pressable>
            <Pressable
              style={styles.webNavButton}
              disabled={readerMode || !canGoForward}
              onPress={() => webViewRef.current?.goForward()}
            >
              <Text
                style={[
                  styles.webNavText,
                  { color: readerMode || !canGoForward ? theme.border : theme.accent },
                ]}
              >
                進む →
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1020" },
  header: {
    padding: 24,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: { color: "#7480a0", fontSize: 11, letterSpacing: 2 },
  heading: { color: "#f8fafc", fontSize: 30, fontWeight: "800", marginTop: 5 },
  addButton: {
    backgroundColor: "#6d5dfc",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addText: { color: "#fff", fontWeight: "700" },
  feedTabsContainer: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  feedTabsContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  feedTab: {
    maxWidth: 180,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  feedTabText: { fontSize: 13, fontWeight: "800" },
  list: { padding: 16, paddingTop: 4, paddingBottom: 100, flexGrow: 1 },
  card: {
    backgroundColor: "#151d31",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  source: { color: "#8f82ff", fontSize: 12, fontWeight: "700" },
  star: { color: "#f8c84e", fontSize: 25 },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    marginTop: 7,
  },
  description: { color: "#aeb7ca", lineHeight: 20, marginTop: 8 },
  date: { color: "#6f7892", fontSize: 12, marginTop: 12 },
  empty: {
    color: "#8d98b1",
    textAlign: "center",
    marginTop: 100,
    lineHeight: 24,
  },
  tabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: "#11182b",
    borderTopWidth: 1,
    borderTopColor: "#202b43",
    flexDirection: "row",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { color: "#6f7892", fontWeight: "700" },
  tabActive: { color: "#a69cff" },
  feedRow: {
    backgroundColor: "#151d31",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  feedIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#29245e",
    justifyContent: "center",
    alignItems: "center",
  },
  feedIconText: { color: "#a69cff", fontSize: 11, fontWeight: "800" },
  feedInfo: { flex: 1, marginHorizontal: 12 },
  url: { color: "#7e89a5", marginTop: 4, fontSize: 12 },
  delete: { color: "#ff7f8a", fontSize: 12 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  modal: {
    backgroundColor: "#151d31",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#0b1020",
    color: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  feedSourceSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  feedSourceButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  feedSourceButtonText: { fontSize: 12, fontWeight: "800" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 20,
    marginTop: 8,
  },
  cancel: { color: "#aeb7ca", fontWeight: "700" },
  save: {
    backgroundColor: "#6d5dfc",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  saveText: { color: "#fff", fontWeight: "800" },
  webSafe: { flex: 1, backgroundColor: "#0b1020" },
  webHeader: {
    height: 54,
    backgroundColor: "#11182b",
    borderBottomWidth: 1,
    borderBottomColor: "#202b43",
    flexDirection: "row",
    alignItems: "center",
  },
  webBack: { width: 76, paddingHorizontal: 12, paddingVertical: 14 },
  webBackText: { color: "#a69cff", fontSize: 16, fontWeight: "700" },
  webTitle: {
    flex: 1,
    color: "#f8fafc",
    textAlign: "center",
    fontWeight: "700",
  },
  modeButton: { width: 76, alignItems: "center", paddingVertical: 9 },
  modeButtonText: { color: "#a69cff", fontSize: 12, fontWeight: "800" },
  webLoading: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingVertical: 8,
    backgroundColor: "#11182be6",
  },
  webContent: { flex: 1 },
  webView: { flex: 1, backgroundColor: "#fff" },
  readerView: { ...StyleSheet.absoluteFillObject, backgroundColor: "#f7f3ea" },
  readerWaiting: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f7f3ea",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  readerWaitingText: { color: "#706b63" },
  webToolbar: {
    height: 54,
    backgroundColor: "#11182b",
    borderTopWidth: 1,
    borderTopColor: "#202b43",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  webNavButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  webNavText: { color: "#a69cff", fontSize: 16, fontWeight: "700" },
  webNavDisabled: { color: "#46506a" },
});
