import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { AppTheme, Feed } from "../types";
import { styles } from "../styles";

type Props = {
  feeds: Feed[];
  theme: AppTheme;
  empty: string;
  onRemoveFeed: (id: string) => void;
};

export function FeedList({
  feeds,
  theme,
  empty,
  onRemoveFeed,
}: Props) {

  return (
    <FlatList
      data={feeds}
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
          <Pressable onPress={() => onRemoveFeed(item.id)}>
            <Text style={[styles.delete, { color: theme.accent }]}>削除</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
