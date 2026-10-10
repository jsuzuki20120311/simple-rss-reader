import React, { useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Modal, Pressable, SafeAreaView, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getReaderScript } from "../lib/reader";
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
  const [webLoading, setWebLoading] = useState(false);
  const [readerMode, setReaderMode] = useState(true);
  const [readerReady, setReaderReady] = useState(false);
  const [readerError, setReaderError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const readerScript = useMemo(() => getReaderScript(theme), [theme]);

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
          <WebView
            key={readerMode ? "reader" : "normal"}
            ref={webViewRef}
            source={{ uri: article.link }}
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
