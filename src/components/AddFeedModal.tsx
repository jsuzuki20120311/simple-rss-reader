import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import type { AppTheme, Feed, FeedSource } from "../types";
import { styles } from "../styles";

type Props = {
  visible: boolean;
  theme: AppTheme;
  onClose: () => void;
  onAddFeed: (feed: Feed) => Promise<void>;
};

export function AddFeedModal({
  visible,
  theme,
  onClose,
  onAddFeed,
}: Props) {
  const [feedSource, setFeedSource] = useState<FeedSource>("google");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [feedName, setFeedName] = useState("");

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
    await onAddFeed({
      id: `${Date.now()}`,
      title: feedName.trim() || defaultTitle,
      url: value,
    });
    setUrl("");
    setSearchKeyword("");
    setFeedName("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
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
            <Pressable onPress={onClose}>
              <Text style={[styles.cancel, { color: theme.muted }]}>キャンセル</Text>
            </Pressable>
            <Pressable style={[styles.save, { backgroundColor: theme.accent }]} onPress={addFeed}>
              <Text style={styles.saveText}>保存する</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
