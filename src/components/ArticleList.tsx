import React from "react";
import type { Ref } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { AppTheme, Article } from "../types";
import { styles } from "../styles";

type Props = {
  articles: Article[];
  bookmarks: Article[];
  theme: AppTheme;
  empty: string;
  loading: boolean;
  listRef: Ref<FlatList<Article>>;
  onRefresh: () => void;
  onOpenArticle: (article: Article) => void;
  onToggleBookmark: (article: Article) => void;
};

export function ArticleList({
  articles,
  bookmarks,
  theme,
  empty,
  loading,
  listRef,
  onRefresh,
  onOpenArticle,
  onToggleBookmark,
}: Props) {

  return (
    <FlatList
      ref={listRef}
      data={articles}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={loading}
      onRefresh={onRefresh}
      ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{empty}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
          onPress={() => item.link && onOpenArticle(item)}
        >
          <View style={styles.cardMeta}>
            <Text style={[styles.source, { color: theme.accent }]}>{item.feedTitle}</Text>
            <Pressable onPress={() => onToggleBookmark(item)}>
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
  );
}
