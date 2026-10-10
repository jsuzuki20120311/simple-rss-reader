import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { THEMES } from "../themes";
import type { AppTheme, ThemeId } from "../types";
import { styles } from "../styles";

type Props = {
  visible: boolean;
  theme: AppTheme;
  themeId: ThemeId;
  onClose: () => void;
  onSelectTheme: (id: ThemeId) => void;
};

export function ThemePickerModal({
  visible,
  theme,
  themeId,
  onClose,
  onSelectTheme,
}: Props) {

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
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
                onPress={() => onSelectTheme(item.id)}
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
          <Pressable style={{ alignSelf: "flex-end", paddingTop: 10 }} onPress={onClose}>
            <Text style={{ color: theme.muted, fontWeight: "700" }}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
