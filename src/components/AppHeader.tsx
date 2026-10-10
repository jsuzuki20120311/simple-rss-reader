import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AppTheme, Screen } from "../types";
import { styles } from "../styles";

type Props = {
  active: Screen;
  theme: AppTheme;
  onOpenThemes: () => void;
  onAddFeed: () => void;
};

export function AppHeader({
  active,
  theme,
  onOpenThemes,
  onAddFeed,
}: Props) {

  return (
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
          onPress={onOpenThemes}
        >
          <Text style={[styles.addText, { color: theme.accent }]}>◐</Text>
        </Pressable>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={onAddFeed}
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
  );
}
