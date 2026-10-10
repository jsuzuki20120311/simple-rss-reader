import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Modal, Pressable, SafeAreaView, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { requiresBrowserRedirect } from "../lib/articleNavigation";
import { getReaderDocument } from "../lib/reader";
import type { AppTheme, Article } from "../types";
import { styles } from "../styles";

type Props = {
  article: Article;
  theme: AppTheme;
  onClose: () => void;
};

export function ArticleReaderModal({
  article,
  theme,
  onClose,
}: Props) {
  const startsInNormalMode = requiresBrowserRedirect(article.link);
  const [webLoading, setWebLoading] = useState(false);
  const [readerMode, setReaderMode] = useState(!startsInNormalMode);
  const [readerReady, setReaderReady] = useState(false);
  const [readerError, setReaderError] = useState(false);
  const [readerDocument, setReaderDocument] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(article.link);
  const [normalStartUrl, setNormalStartUrl] = useState(article.link);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const readerRequestRef = useRef<AbortController | null>(null);
  const redirectToReaderRef = useRef(startsInNormalMode);
  const webViewRef = useRef<WebView>(null);

  const loadReaderPage = useCallback(
    async (url: string) => {
      readerRequestRef.current?.abort();
      const controller = new AbortController();
      readerRequestRef.current = controller;
      setWebLoading(true);
      setReaderReady(false);
      setReaderError(false);
      setReaderDocument(null);
      setCurrentUrl(url);

      try {
        const response = await fetch(url, {
          headers: { Accept: "text/html,application/xhtml+xml" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const sourceHtml = await response.text();
        const finalUrl = response.url || url;
        setCurrentUrl(finalUrl);
        setReaderDocument(getReaderDocument(sourceHtml, finalUrl, theme));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setReaderError(true);
        setWebLoading(false);
      }
    },
    [theme],
  );

  useEffect(() => {
    setCurrentUrl(article.link);
    setNormalStartUrl(article.link);
    redirectToReaderRef.current = startsInNormalMode;

    if (!startsInNormalMode) {
      loadReaderPage(article.link);
    }
    return () => readerRequestRef.current?.abort();
  }, [article.link, loadReaderPage, startsInNormalMode]);

  const toggleReaderMode = () => {
    setReaderReady(false);
    setReaderError(false);

    if (readerMode) {
      readerRequestRef.current?.abort();
      setWebLoading(false);
      setNormalStartUrl(currentUrl);
      setReaderMode(false);
    } else {
      redirectToReaderRef.current = false;
      setReaderMode(true);
      loadReaderPage(currentUrl);
    }
  };

  const handleNormalNavigation = (state: {
    url: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }) => {
    setCanGoBack(state.canGoBack);
    setCanGoForward(state.canGoForward);

    if (!/^https?:\/\//i.test(state.url)) return;
    setCurrentUrl(state.url);

    if (
      redirectToReaderRef.current &&
      !state.loading &&
      !requiresBrowserRedirect(state.url)
    ) {
      redirectToReaderRef.current = false;
      setReaderMode(true);
      loadReaderPage(state.url);
    }
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
      }
    } catch {
      setWebLoading(false);
      setReaderError(true);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.webSafe, { backgroundColor: theme.background }]}>
        <StatusBar style={theme.id === "monochrome" || theme.id === "sakura" || theme.id === "newspaper" || theme.id === "solarizedLight" || theme.id === "sepia" ? "dark" : "light"} />
        <View style={[styles.webHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable style={styles.webBack} onPress={onClose}>
            <Text style={[styles.webBackText, { color: theme.accent }]}>‹ 戻る</Text>
          </Pressable>
          <Text style={[styles.webTitle, { color: theme.text }]} numberOfLines={1}>
            {article.title}
          </Text>
          <Pressable
            style={styles.modeButton}
            onPress={toggleReaderMode}
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
          {readerMode ? (
            readerDocument && (
              <WebView
                key={currentUrl}
                source={{ html: readerDocument, baseUrl: currentUrl }}
                style={[
                  styles.webView,
                  !readerReady && { opacity: 0 },
                ]}
                originWhitelist={["*"]}
                onMessage={(event) =>
                  handleReaderMessage(event.nativeEvent.data)
                }
                onError={() => {
                  setWebLoading(false);
                  setReaderError(true);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  if (
                    request.navigationType === "click" &&
                    /^https?:\/\//i.test(request.url)
                  ) {
                    loadReaderPage(request.url);
                    return false;
                  }
                  return true;
                }}
              />
            )
          ) : (
            <WebView
              key="normal"
              ref={webViewRef}
              source={{ uri: normalStartUrl }}
              style={styles.webView}
              onLoadStart={() => setWebLoading(true)}
              onLoadEnd={() => setWebLoading(false)}
              onNavigationStateChange={handleNormalNavigation}
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
  );
}
