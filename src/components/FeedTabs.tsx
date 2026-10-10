import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { AppTheme, Feed } from "../types";
import { styles } from "../styles";

type Props = {
  feeds: Feed[];
  selectedFeedId: string;
  theme: AppTheme;
  onSelectFeed: (id: string) => void;
};

export function FeedTabs({
  feeds,
  selectedFeedId,
  theme,
  onSelectFeed,
}: Props) {

  return (
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
              onPress={() => onSelectFeed(feed.id)}
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
  );
}
