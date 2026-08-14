import React, { useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { AppIcon } from "@/components/icons";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function ConversationCard({
  conversation,
  index,
  onPress,
  onDelete,
  theme,
}: {
  conversation: Conversation;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  theme: any;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.conversationCard,
          { backgroundColor: theme.backgroundDefault },
          pressed && { opacity: 0.8 },
        ]}
        onPress={onPress}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardIcon}>
            <AppIcon name="message-circle" size={20} color={theme.primary} />
          </View>
          <View style={styles.cardText}>
            <ThemedText type="body" numberOfLines={1} style={styles.cardTitle}>
              {conversation.title}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDate(conversation.createdAt)}
            </ThemedText>
          </View>
          <Pressable
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={12}
          >
            <AppIcon name="trash-2" size={18} color={theme.error} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({ theme }: { theme: any }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.emptyContainer}
    >
      <Image
        source={require("../../assets/images/empty-history.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No conversations yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        Start your first conversation and it will appear here
      </ThemedText>
    </Animated.View>
  );
}

function LoadingSkeleton({ theme }: { theme: any }) {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 100)}
          style={[
            styles.skeletonCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View
            style={[
              styles.skeletonIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          />
          <View style={styles.skeletonText}>
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: theme.backgroundSecondary, width: "70%" },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: theme.backgroundSecondary, width: "40%" },
              ]}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading,
    refetch,
  } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleDelete = (conversation: Conversation) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete "${conversation.title}"?`)) {
        deleteMutation.mutate(conversation.id);
      }
    } else {
      Alert.alert(
        "Delete Conversation",
        `Are you sure you want to delete "${conversation.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(conversation.id),
          },
        ],
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Conversations</ThemedText>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <LoadingSkeleton theme={theme} />
      ) : conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <ConversationCard
              conversation={item}
              index={index}
              onPress={() => navigation.navigate("GlobalSearch")}
              onDelete={() => handleDelete(item)}
              theme={theme}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState theme={theme} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  conversationCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107, 142, 127, 0.1)",
  },
  cardText: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontWeight: "500",
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonText: {
    flex: 1,
    gap: Spacing.sm,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
});
