import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AppTheme, Screen } from "../types";
import { styles } from "../styles";

type Props = {
  active: Screen;
  theme: AppTheme;
  onSelectScreen: (screen: Screen) => void;
};

export function BottomTabs({
  active,
  theme,
  onSelectScreen,
}: Props) {

  return (
    <View style={[styles.tabs, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {[
        ["articles", "記事"],
        ["feeds", "フィード"],
        ["bookmarks", "保存"],
      ].map(([key, label]) => (
        <Pressable
          key={key}
          style={styles.tab}
          onPress={() => onSelectScreen(key as Screen)}
        >
          <Text style={[styles.tabText, { color: active === key ? theme.accent : theme.muted }]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
