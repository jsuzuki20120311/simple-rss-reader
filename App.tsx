import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, SafeAreaView } from "react-native";
import { AppHeader } from "./src/components/AppHeader";
import { FeedTabs } from "./src/components/FeedTabs";
import { FeedList } from "./src/components/FeedList";
import { ArticleList } from "./src/components/ArticleList";
import { BottomTabs } from "./src/components/BottomTabs";
import { AddFeedModal } from "./src/components/AddFeedModal";
import { ThemePickerModal } from "./src/components/ThemePickerModal";
import { ArticleReaderModal } from "./src/components/ArticleReaderModal";
import { parseFeed } from "./src/lib/rss";
import { styles } from "./src/styles";
import { THEMES } from "./src/themes";
import type { Article, Feed, Screen, ThemeId } from "./src/types";

const FEEDS_KEY = "@simple-rss-reader/feeds";
const BOOKMARKS_KEY = "@simple-rss-reader/bookmarks";
const THEME_KEY = "@simple-rss-reader/theme";
const DEFAULT_FEEDS: Feed[] = [];

export default function App() {
  const [feeds, setFeeds] = useState<Feed[]>(DEFAULT_FEEDS);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [active, setActive] = useState<Screen>("articles");
  const [selectedFeedId, setSelectedFeedId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>("dark");
  const [webArticle, setWebArticle] = useState<Article | null>(null);
  const articleListRef = useRef<FlatList<Article>>(null);

  const theme = useMemo(
    () => THEMES.find((item) => item.id === themeId) ?? THEMES[3],
    [themeId],
  );

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

  const addFeed = async (feed: Feed) => {
    const next = [...feeds, feed];
    setFeeds(next);
    await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(next));
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
      <AppHeader
        active={active}
        theme={theme}
        onOpenThemes={() => setThemeModal(true)}
        onAddFeed={() => setModal(true)}
      />
      {active === "articles" && (
        <FeedTabs
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          theme={theme}
          onSelectFeed={setSelectedFeedId}
        />
      )}
      {active === "feeds" ? (
        <FeedList feeds={feeds} theme={theme} empty={empty} onRemoveFeed={removeFeed} />
      ) : (
        <ArticleList
          articles={visible}
          bookmarks={bookmarks}
          theme={theme}
          empty={empty}
          loading={loading}
          listRef={articleListRef}
          onRefresh={refresh}
          onOpenArticle={setWebArticle}
          onToggleBookmark={(article) =>
            saveBookmarks(
              bookmarks.some((bookmark) => bookmark.id === article.id)
                ? bookmarks.filter((bookmark) => bookmark.id !== article.id)
                : [...bookmarks, article],
            )
          }
        />
      )}
      <BottomTabs active={active} theme={theme} onSelectScreen={setActive} />
      <AddFeedModal
        visible={modal}
        theme={theme}
        onClose={() => setModal(false)}
        onAddFeed={addFeed}
      />
      <ThemePickerModal
        visible={themeModal}
        theme={theme}
        themeId={themeId}
        onClose={() => setThemeModal(false)}
        onSelectTheme={selectTheme}
      />
      {webArticle && (
        <ArticleReaderModal
          article={webArticle}
          theme={theme}
          onClose={() => setWebArticle(null)}
        />
      )}
    </SafeAreaView>
  );
}
