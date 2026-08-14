import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from "react";
import {
  Alert,
  View,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { syncedSetItem } from "@/lib/progress-sync";

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Aurora,
  NuraiAvatar,
  NuraiEmptyState,
  NuraiErrorState,
  NuraiGlass,
  NuraiSearchField,
} from "@/design-system";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest, ApiRequestError } from "@/lib/query-client";
import {
  blockCommunityMember,
  createCommunityClientMessageId,
  fetchCommunityConnections,
  fetchCommunityConversations,
  fetchCommunityMessages,
  getCommunityMessageMediaUrl,
  markCommunityConversationRead,
  openCommunityConversation,
  removeCommunityConnection,
  reportCommunityTarget,
  requestCommunityConnection,
  respondToCommunityConnection,
  searchCommunityPeople,
  sendCommunityMessage,
  type CommunityConnection,
  type CommunityConversation,
  type CommunityDirectMessage,
  type CommunityMessageImageInput,
  type CommunityPerson,
} from "@/services/communitySocialService";
import { CommunityIconSvg } from "@/components/premium/svg/PremiumSvgs";
import { AuthContext } from "@/context/AuthContext";
import { AppIcon, type AppIconName } from "@/components/icons";

const STORAGE_KEY_PROFILE = "community_profile";
const STORAGE_KEY_DEVICE = "community_device_id";
const STORAGE_KEY_ROOM_VISITS = "community_room_visits";

type Gender = "male" | "female";

interface Profile {
  id: number;
  deviceId: string;
  displayName: string;
  gender: Gender;
  bio?: string;
  discoverableByUsername?: boolean;
  discoverableByEmail?: boolean;
  allowConnectionRequests?: boolean;
}

interface Room {
  id: number;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  postCount: number;
  latestPostAt: string | null;
}

interface Post {
  id: number;
  roomId: number;
  profileId: number;
  content: string;
  displayName: string;
  gender: Gender;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  liked: boolean;
  reposted: boolean;
  createdAt: string;
  pinned: boolean;
}

interface Reply {
  id: number;
  postId: number;
  profileId: number;
  content: string;
  displayName: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    await syncedSetItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

async function triggerHaptic() {
  if (Platform.OS === "web") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

const AVATAR_COLORS = ["#56B394", "#CFAE69", "#284A41", "#A8D9C8", "#77847E"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function communityActionError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function CommunityHubSwitcher({
  active,
  unreadCount,
  onChange,
}: {
  active: CommunityHubView;
  unreadCount: number;
  onChange: (view: CommunityHubView) => void;
}) {
  const { theme } = useTheme();
  const items: {
    id: CommunityHubView;
    label: string;
    icon: AppIconName;
  }[] = [
    { id: "boards", label: "Boards", icon: "grid" },
    { id: "connections", label: "People", icon: "user-plus" },
    { id: "messages", label: "Messages", icon: "message-circle" },
  ];

  return (
    <View
      style={[
        styles.hubSwitcher,
        {
          backgroundColor: theme.backgroundTertiary,
          borderColor: theme.borderSubtle,
        },
      ]}
      accessible={false}
    >
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <Pressable
            key={item.id}
            testID={`community-hub-${item.id}`}
            onPress={() => onChange(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, tab`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.hubSwitcherItem,
              selected && { backgroundColor: `${theme.primary}18` },
              pressed && { opacity: 0.72 },
            ]}
          >
            <View>
              <AppIcon
                name={item.icon}
                size={16}
                color={selected ? theme.primary : theme.textMuted}
              />
              {item.id === "messages" && unreadCount > 0 ? (
                <Pressable
                  style={[
                    styles.hubUnreadDot,
                    { backgroundColor: theme.primary },
                  ]}
                />
              ) : null}
            </View>
            <ThemedText
              type="caption"
              style={{
                color: selected ? theme.primary : theme.textSecondary,
                fontWeight: selected ? "700" : "600",
              }}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

type ScreenView =
  | "gate"
  | "rooms"
  | "room_detail"
  | "connections"
  | "inbox"
  | "conversation";

type CommunityHubView = "boards" | "connections" | "messages";

type PendingCommunityMessage = {
  clientMessageId: string;
  content: string;
  image?: CommunityMessageImageInput & { localUri: string };
};

export default function CommunityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  const profileStorageKey = user?.id
    ? `${STORAGE_KEY_PROFILE}:${user.id}`
    : null;

  const [currentView, setCurrentView] = useState<ScreenView>("gate");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [gateName, setGateName] = useState("");
  const [gateGender, setGateGender] = useState<Gender | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateError, setGateError] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsRefreshing, setRoomsRefreshing] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [roomVisits, setRoomVisits] = useState<Record<string, string>>({});

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [postsError, setPostsError] = useState("");

  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<number, boolean>>(
    {},
  );
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostSubmitting, setNewPostSubmitting] = useState(false);

  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<CommunityPerson[]>([]);
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [connections, setConnections] = useState<CommunityConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState("");
  const [conversations, setConversations] = useState<CommunityConversation[]>(
    [],
  );
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const [activeConversation, setActiveConversation] =
    useState<CommunityConversation | null>(null);
  const [directMessages, setDirectMessages] = useState<
    CommunityDirectMessage[]
  >([]);
  const [directMessagesLoading, setDirectMessagesLoading] = useState(false);
  const [directMessagesError, setDirectMessagesError] = useState("");
  const [conversationUnavailable, setConversationUnavailable] = useState(false);
  const [directMessageText, setDirectMessageText] = useState("");
  const [directMessageImage, setDirectMessageImage] = useState<
    (CommunityMessageImageInput & { localUri: string }) | null
  >(null);
  const [directMessageImagePreparing, setDirectMessageImagePreparing] =
    useState(false);
  const [directMessageSending, setDirectMessageSending] = useState(false);
  const [pendingDirectMessage, setPendingDirectMessage] =
    useState<PendingCommunityMessage | null>(null);
  const directMessageListRef = useRef<FlatList<CommunityDirectMessage>>(null);

  const showCommunityError = useCallback((message: string) => {
    Alert.alert("Community update not saved", message);
  }, []);

  const chooseDirectMessageImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access is off",
        "Allow photo access in iPhone Settings to share an image privately.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.82,
      base64: false,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setDirectMessageImagePreparing(true);
    try {
      const prepared = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1440 } }],
        { base64: true, compress: 0.7, format: SaveFormat.JPEG },
      );
      if (!prepared.base64) throw new Error("image_prepare_failed");
      const approximateBytes = Math.floor((prepared.base64.length * 3) / 4);
      if (approximateBytes > 768 * 1024) {
        throw new Error("image_too_large");
      }
      setDirectMessageImage({
        dataUrl: `data:image/jpeg;base64,${prepared.base64}`,
        width: prepared.width,
        height: prepared.height,
        altText: "Photo shared in a private NurAI conversation",
        localUri: prepared.uri,
      });
      triggerHaptic();
    } catch {
      showCommunityError(
        "We could not prepare that photo safely. Choose another image.",
      );
    } finally {
      setDirectMessageImagePreparing(false);
    }
  }, [showCommunityError]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    let cachedProfile: Profile | null = null;
    try {
      const stored = profileStorageKey
        ? await AsyncStorage.getItem(profileStorageKey)
        : null;
      if (stored) {
        cachedProfile = JSON.parse(stored) as Profile;
        setProfile(cachedProfile);
        setCurrentView("rooms");
      }
      const response = await apiRequest("GET", "/api/community/profile");
      const serverProfile = (await response.json()) as Profile;
      if (profileStorageKey) {
        await syncedSetItem(profileStorageKey, JSON.stringify(serverProfile));
      }
      setProfile(serverProfile);
      setCurrentView("rooms");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        if (profileStorageKey) {
          await AsyncStorage.removeItem(profileStorageKey).catch(() => {});
        }
        setProfile(null);
        setCurrentView("gate");
      } else if (!cachedProfile) {
        setCurrentView("gate");
      }
    } finally {
      setLoading(false);
    }
  }, [profileStorageKey]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile, user?.id]),
  );

  useEffect(() => {
    if (currentView === "rooms" && profile) {
      fetchRooms();
      loadRoomVisits();
    }
  }, [currentView, profile]);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    setRoomsError("");
    try {
      const url = new URL("/api/community/rooms", getApiUrl());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      } else {
        setRoomsError("We could not load community boards. Pull to try again.");
      }
    } catch {
      setRoomsError("We could not load community boards. Pull to try again.");
    } finally {
      setRoomsLoading(false);
      setRoomsRefreshing(false);
    }
  };

  const loadConnections = useCallback(async () => {
    setConnectionsLoading(true);
    setConnectionsError("");
    try {
      setConnections(await fetchCommunityConnections());
    } catch (error) {
      setConnectionsError(
        communityActionError(
          error,
          "We could not load your connections. Please try again.",
        ),
      );
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) {
      setConversationsLoading(true);
      setConversationsError("");
    }
    try {
      setConversations(await fetchCommunityConversations());
    } catch (error) {
      if (!silent) {
        setConversationsError(
          communityActionError(
            error,
            "We could not load your messages. Please try again.",
          ),
        );
      }
    } finally {
      if (!silent) setConversationsLoading(false);
    }
  }, []);

  const loadDirectMessages = useCallback(
    async (conversation: CommunityConversation, silent = false) => {
      if (!silent) {
        setDirectMessagesLoading(true);
        setDirectMessagesError("");
      }
      try {
        const loaded = await fetchCommunityMessages(conversation.id);
        setConversationUnavailable(false);
        setDirectMessages(loaded);
        await markCommunityConversationRead(conversation.id).catch(() => {});
        setConversations((current) =>
          current.map((item) =>
            item.id === conversation.id ? { ...item, unreadCount: 0 } : item,
          ),
        );
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          (error.status === 403 || error.status === 404)
        ) {
          setConversationUnavailable(true);
        }
        if (!silent) {
          setDirectMessagesError(
            communityActionError(
              error,
              "We could not load this conversation. Please try again.",
            ),
          );
        }
      } finally {
        if (!silent) setDirectMessagesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!profile) return;
    if (currentView === "rooms") void loadConversations(true);
    if (currentView === "connections") void loadConnections();
    if (currentView === "inbox") void loadConversations();
    if (currentView === "conversation" && activeConversation) {
      void loadDirectMessages(activeConversation);
    }
  }, [
    activeConversation,
    currentView,
    loadConnections,
    loadConversations,
    loadDirectMessages,
    profile,
  ]);

  useEffect(() => {
    if (!profile) return;

    if (currentView === "inbox") {
      const interval = setInterval(() => {
        void loadConversations(true);
      }, 20_000);
      return () => clearInterval(interval);
    }

    if (currentView === "conversation" && activeConversation) {
      const interval = setInterval(() => {
        void loadDirectMessages(activeConversation, true);
      }, 12_000);
      return () => clearInterval(interval);
    }
  }, [
    activeConversation,
    currentView,
    loadConversations,
    loadDirectMessages,
    profile,
  ]);

  const navigateCommunityHub = useCallback((view: CommunityHubView) => {
    setSelectedRoom(null);
    setExpandedPostId(null);
    setCurrentView(
      view === "boards"
        ? "rooms"
        : view === "connections"
          ? "connections"
          : "inbox",
    );
  }, []);

  const handlePeopleSearch = useCallback(async () => {
    const query = peopleQuery.trim();
    if (query.length < 3) {
      setPeopleResults([]);
      setConnectionsError("Enter at least three characters to find someone.");
      return;
    }
    setPeopleSearching(true);
    setConnectionsError("");
    try {
      setPeopleResults(await searchCommunityPeople(query));
    } catch (error) {
      setPeopleResults([]);
      setConnectionsError(
        communityActionError(
          error,
          "We could not search right now. Please try again.",
        ),
      );
    } finally {
      setPeopleSearching(false);
    }
  }, [peopleQuery]);

  const refreshPeopleSearch = useCallback(async () => {
    if (peopleQuery.trim().length < 3) return;
    try {
      setPeopleResults(await searchCommunityPeople(peopleQuery.trim()));
    } catch {}
  }, [peopleQuery]);

  const handleRequestConnection = useCallback(
    async (person: CommunityPerson) => {
      try {
        await requestCommunityConnection(person.id);
        await Promise.all([loadConnections(), refreshPeopleSearch()]);
        triggerHaptic();
      } catch (error) {
        showCommunityError(
          communityActionError(
            error,
            "We could not send this connection request.",
          ),
        );
      }
    },
    [loadConnections, refreshPeopleSearch, showCommunityError],
  );

  const handleRespondConnection = useCallback(
    async (connectionId: number, action: "accept" | "decline") => {
      try {
        await respondToCommunityConnection(connectionId, action);
        await Promise.all([loadConnections(), refreshPeopleSearch()]);
        triggerHaptic();
      } catch (error) {
        showCommunityError(
          communityActionError(
            error,
            "We could not update this connection request.",
          ),
        );
      }
    },
    [loadConnections, refreshPeopleSearch, showCommunityError],
  );

  const handleRemoveConnection = useCallback(
    async (connectionId: number) => {
      try {
        await removeCommunityConnection(connectionId);
        await Promise.all([loadConnections(), refreshPeopleSearch()]);
      } catch (error) {
        showCommunityError(
          communityActionError(error, "We could not remove this connection."),
        );
      }
    },
    [loadConnections, refreshPeopleSearch, showCommunityError],
  );

  const openDirectConversation = useCallback(
    async (
      person: Pick<CommunityPerson, "id" | "username" | "displayName">,
    ) => {
      try {
        const created = await openCommunityConversation(person.id);
        const conversation: CommunityConversation = {
          id: created.id,
          lastMessageAt: new Date().toISOString(),
          lastMessage: "",
          lastMessageCreatedAt: null,
          unreadCount: 0,
          profile: person,
        };
        setActiveConversation(conversation);
        setDirectMessages([]);
        setDirectMessagesError("");
        setDirectMessageText("");
        setDirectMessageImage(null);
        setPendingDirectMessage(null);
        setConversationUnavailable(false);
        setCurrentView("conversation");
      } catch (error) {
        showCommunityError(
          communityActionError(error, "We could not open this conversation."),
        );
      }
    },
    [showCommunityError],
  );

  const handleSendDirectMessage = useCallback(
    async (retry?: PendingCommunityMessage) => {
      if (!activeConversation) return;
      const content = (retry?.content ?? directMessageText).trim();
      const image = retry?.image ?? directMessageImage ?? undefined;
      if (!content && !image) return;
      const pending =
        retry ??
        ({
          clientMessageId: createCommunityClientMessageId(),
          content,
          image,
        } satisfies PendingCommunityMessage);
      if (!retry) {
        setDirectMessageText("");
        setDirectMessageImage(null);
      }
      setDirectMessagesError("");
      setDirectMessageSending(true);
      setPendingDirectMessage(pending);
      try {
        const sent = await sendCommunityMessage({
          conversationId: activeConversation.id,
          clientMessageId: pending.clientMessageId,
          content: pending.content,
          image: pending.image
            ? {
                dataUrl: pending.image.dataUrl,
                width: pending.image.width,
                height: pending.image.height,
                altText: pending.image.altText,
              }
            : undefined,
        });
        setConversationUnavailable(false);
        setDirectMessages((current) => {
          const withoutRetry = current.filter(
            (item) => item.clientMessageId !== sent.clientMessageId,
          );
          return [...withoutRetry, sent];
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  lastMessage: sent.content || (sent.media ? "Photo" : ""),
                  lastMessageAt: sent.createdAt,
                  lastMessageCreatedAt: sent.createdAt,
                }
              : conversation,
          ),
        );
        setPendingDirectMessage(null);
        setTimeout(
          () => directMessageListRef.current?.scrollToEnd({ animated: true }),
          80,
        );
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          (error.status === 403 || error.status === 404)
        ) {
          setConversationUnavailable(true);
        }
        setDirectMessageText((current) =>
          current.trim() ? current : pending.content,
        );
        if (pending.image) setDirectMessageImage(pending.image);
        setDirectMessagesError(
          communityActionError(
            error,
            "Message not sent. Your text is still here—tap retry.",
          ),
        );
      } finally {
        setDirectMessageSending(false);
      }
    },
    [activeConversation, directMessageImage, directMessageText],
  );

  const handleBlockMember = useCallback(
    async (profileId: number) => {
      try {
        await blockCommunityMember(profileId);
        setPeopleResults((current) =>
          current.filter((item) => item.id !== profileId),
        );
        setConnections((current) =>
          current.filter((item) => item.profile.id !== profileId),
        );
        setConversations((current) =>
          current.filter((item) => item.profile.id !== profileId),
        );
        setPosts((current) =>
          current.filter((item) => item.profileId !== profileId),
        );
        if (activeConversation?.profile.id === profileId) {
          setActiveConversation(null);
          setCurrentView("inbox");
          setConversationUnavailable(false);
        }
      } catch (error) {
        showCommunityError(
          communityActionError(error, "We could not block this member."),
        );
      }
    },
    [activeConversation, showCommunityError],
  );

  const handleReport = useCallback(
    async (
      targetType: "profile" | "post" | "reply" | "message",
      targetId: number,
      reason: "harassment" | "spam" | "other",
    ) => {
      try {
        await reportCommunityTarget({ targetType, targetId, reason });
        Alert.alert(
          "Report received",
          "Thank you. We will review this and take appropriate action.",
        );
      } catch (error) {
        showCommunityError(
          communityActionError(error, "We could not send this report."),
        );
      }
    },
    [showCommunityError],
  );

  const showMemberSafetyActions = useCallback(
    (person: Pick<CommunityPerson, "id" | "displayName">) => {
      Alert.alert(person.displayName, "Choose a safety action.", [
        {
          text: "Report",
          onPress: () => void handleReport("profile", person.id, "other"),
        },
        {
          text: "Block",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              `Block ${person.displayName}?`,
              "They will be removed from your connections and neither of you will be able to find or message the other.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => void handleBlockMember(person.id),
                },
              ],
            ),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [handleBlockMember, handleReport],
  );

  const showReplyActions = useCallback(
    (reply: Reply) => {
      Alert.alert(reply.displayName, "Choose an action.", [
        {
          text: "Report reply",
          onPress: () => void handleReport("reply", reply.id, "other"),
        },
        {
          text: "Block member",
          style: "destructive",
          onPress: () => void handleBlockMember(reply.profileId),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [handleBlockMember, handleReport],
  );

  const loadRoomVisits = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ROOM_VISITS);
      if (stored) setRoomVisits(JSON.parse(stored));
    } catch {}
  };

  const markRoomVisited = async (roomId: number) => {
    const updated = {
      ...roomVisits,
      [roomId.toString()]: new Date().toISOString(),
    };
    setRoomVisits(updated);
    try {
      await syncedSetItem(STORAGE_KEY_ROOM_VISITS, JSON.stringify(updated));
    } catch {}
  };

  const hasNewActivity = (room: Room): boolean => {
    if (!room.latestPostAt) return false;
    const lastVisit = roomVisits[room.id.toString()];
    if (!lastVisit) return room.postCount > 0;
    return new Date(room.latestPostAt) > new Date(lastVisit);
  };

  const fetchPosts = useCallback(
    async (roomId: number) => {
      if (!profile) return;
      setPostsLoading(true);
      setPostsError("");
      try {
        const url = new URL(
          `/api/community/rooms/${roomId}/posts`,
          getApiUrl(),
        );
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        } else {
          setPostsError(
            "We could not load posts for this board. Pull to retry.",
          );
        }
      } catch {
        setPostsError("We could not load posts for this board. Pull to retry.");
      } finally {
        setPostsLoading(false);
        setPostsRefreshing(false);
      }
    },
    [profile],
  );

  const fetchReplies = async (postId: number) => {
    setRepliesLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const url = new URL(
        `/api/community/posts/${postId}/replies`,
        getApiUrl(),
      );
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReplies((prev) => ({ ...prev, [postId]: data }));
      } else {
        showCommunityError(
          "We could not load these replies. Please try again.",
        );
      }
    } catch {
      showCommunityError("We could not load these replies. Please try again.");
    } finally {
      setRepliesLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleGateSubmit = async () => {
    if (!gateName.trim() || !gateGender) return;
    setGateError("");
    setGateSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      const res = await apiRequest("POST", "/api/community/profile", {
        deviceId,
        displayName: gateName.trim(),
        gender: gateGender,
      });
      const data = await res.json();
      const prof: Profile = {
        id: data.id,
        deviceId: data.deviceId || deviceId,
        displayName: data.displayName || gateName.trim(),
        gender: data.gender || gateGender,
      };
      if (profileStorageKey) {
        await syncedSetItem(profileStorageKey, JSON.stringify(prof));
      }
      setProfile(prof);
      triggerHaptic();
      setCurrentView("rooms");
    } catch (error) {
      setGateError(
        error instanceof ApiRequestError && error.status === 404
          ? "Community is temporarily unavailable. Your details were not saved. Please try again shortly."
          : communityActionError(
              error,
              "We could not create your community profile. Please try again.",
            ),
      );
    } finally {
      setGateSubmitting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() || !profile || !selectedRoom) return;
    setNewPostSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/community/posts", {
        roomId: selectedRoom.id,
        profileId: profile.id,
        content: newPostText.trim(),
      });
      const data = await res.json();
      setPosts((prev) => [data, ...prev]);
      setNewPostText("");
      setShowNewPost(false);
      triggerHaptic();
    } catch {
      showCommunityError("We could not publish this post. Please try again.");
    } finally {
      setNewPostSubmitting(false);
    }
  };

  const handleReply = async (postId: number) => {
    if (!replyText.trim() || !profile) return;
    setReplySubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/community/replies", {
        postId,
        profileId: profile.id,
        content: replyText.trim(),
      });
      const data = await res.json();
      setReplies((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p,
        ),
      );
      setReplyText("");
      triggerHaptic();
    } catch {
      showCommunityError("We could not send this reply. Please try again.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!profile) return;
    triggerHaptic();
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    );
    try {
      const res = await apiRequest(
        "POST",
        `/api/community/posts/${postId}/like`,
        {
          profileId: profile.id,
        },
      );
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: data.liked, likeCount: data.likeCount }
            : p,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: !p.liked,
                likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1,
              }
            : p,
        ),
      );
      showCommunityError(
        "We could not update the beneficial mark. Please try again shortly.",
      );
    }
  };

  const handleShowLess = async (postId: number) => {
    const previousPosts = posts;
    setPosts((current) => current.filter((post) => post.id !== postId));
    triggerHaptic();
    try {
      await apiRequest("POST", `/api/community/posts/${postId}/not-for-me`);
    } catch {
      setPosts(previousPosts);
      showCommunityError(
        "We could not save that preference. The post is visible again.",
      );
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!profile) return;
    try {
      await apiRequest("DELETE", `/api/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      triggerHaptic();
    } catch {
      showCommunityError("We could not delete this post. Please try again.");
    }
  };

  const showPostActions = (post: Post, isOwn: boolean) => {
    if (isOwn) {
      Alert.alert(
        "Remove post?",
        "This will remove the post and its replies.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => void handleDeletePost(post.id),
          },
        ],
      );
      return;
    }
    Alert.alert(post.displayName, "Choose an action.", [
      {
        text: "Report post",
        onPress: () => void handleReport("post", post.id, "other"),
      },
      {
        text: "Block member",
        style: "destructive",
        onPress: () => void handleBlockMember(post.profileId),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openRoom = (room: Room) => {
    setSelectedRoom(room);
    setExpandedPostId(null);
    setCurrentView("room_detail");
    fetchPosts(room.id);
    markRoomVisited(room.id);
  };

  const goBackToRooms = () => {
    setSelectedRoom(null);
    setPosts([]);
    setExpandedPostId(null);
    setCurrentView("rooms");
  };

  const togglePost = (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      setReplyText("");
      if (!replies[postId]) {
        fetchReplies(postId);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Aurora />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (currentView === "gate") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <Aurora />
        <ScrollView
          contentContainerStyle={[
            styles.gateContent,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + 112,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.gateHeader}
          >
            <View
              style={[
                styles.gateIconWrap,
                { backgroundColor: `${theme.primary}15` },
              ]}
            >
              <CommunityIconSvg
                size={48}
                color={theme.primary}
                accentColor={theme.primary}
              />
            </View>
            <ThemedText
              type="h2"
              style={styles.gateTitle}
              accessibilityRole="header"
            >
              Join your NurAI community
            </ThemedText>
            <View
              style={[
                styles.gateDivider,
                { backgroundColor: `${theme.primary}48` },
              ]}
            />
            <ThemedText
              type="body"
              style={[styles.gateSubtitle, { color: theme.textSecondary }]}
            >
              Connect with fellow Muslims in a respectful, gender-separated
              space that upholds Islamic values.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).duration(400)}
            style={[
              styles.safetyCard,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.xl}
              tint={`${theme.primary}08`}
              style={StyleSheet.absoluteFill}
            />
            {[
              "Brothers connect with brothers; sisters connect with sisters.",
              "Your community selection is protected after joining.",
              "Use a display name, not private contact details.",
              "Keep advice general and speak with adab.",
            ].map((item) => (
              <View key={item} style={styles.safetyRow}>
                <AppIcon name="shield" size={14} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {item}
                </ThemedText>
              </View>
            ))}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={[styles.gateForm, { borderColor: theme.borderSubtle }]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius["2xl"]}
              style={StyleSheet.absoluteFill}
            />
            {gateError ? (
              <NuraiErrorState
                title="Community unavailable"
                body={gateError}
                actionLabel="Try again"
                onAction={() => void handleGateSubmit()}
              />
            ) : null}
            <ThemedText type="h4" style={styles.gateLabel}>
              Display Name
            </ThemedText>
            <TextInput
              testID="input-display-name"
              style={[
                styles.gateInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={theme.textMuted}
              value={gateName}
              onChangeText={setGateName}
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel="Community display name"
              accessibilityHint="Use a public display name, not private contact details"
            />

            <ThemedText
              type="h4"
              style={[styles.gateLabel, { marginTop: Spacing.xl }]}
            >
              I am a
            </ThemedText>
            <View style={styles.gateGenderRow}>
              <Pressable
                testID="button-gender-male"
                style={[
                  styles.gateGenderCard,
                  {
                    backgroundColor: "transparent",
                    borderColor:
                      gateGender === "male"
                        ? theme.primary
                        : theme.borderSubtle,
                  },
                ]}
                onPress={() => {
                  setGateGender("male");
                  Keyboard.dismiss();
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Choose Brother community"
                accessibilityHint="Shows the brothers-only community feed"
                accessibilityState={{ selected: gateGender === "male" }}
              >
                <NuraiGlass
                  pointerEvents="none"
                  interactive
                  radius={BorderRadius["2xl"]}
                  tint={
                    gateGender === "male" ? `${theme.primary}14` : undefined
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.gateGenderIcon,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <AppIcon name="men-space" size={24} color={theme.primary} />
                </View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Brother
                </ThemedText>
              </Pressable>
              <Pressable
                testID="button-gender-female"
                style={[
                  styles.gateGenderCard,
                  {
                    backgroundColor: "transparent",
                    borderColor:
                      gateGender === "female"
                        ? theme.primary
                        : theme.borderSubtle,
                  },
                ]}
                onPress={() => {
                  setGateGender("female");
                  Keyboard.dismiss();
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Choose Sister community"
                accessibilityHint="Shows the sisters-only community feed"
                accessibilityState={{ selected: gateGender === "female" }}
              >
                <NuraiGlass
                  pointerEvents="none"
                  interactive
                  radius={BorderRadius["2xl"]}
                  tint={
                    gateGender === "female" ? `${theme.primary}14` : undefined
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.gateGenderIcon,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <AppIcon name="women-space" size={24} color={theme.primary} />
                </View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Sister
                </ThemedText>
              </Pressable>
            </View>

            <Pressable
              testID="button-gate-continue"
              style={[
                styles.gateContinueBtn,
                {
                  backgroundColor:
                    gateName.trim() && gateGender
                      ? theme.primary
                      : theme.disabled,
                },
              ]}
              onPress={handleGateSubmit}
              disabled={!gateName.trim() || !gateGender || gateSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Join community"
              accessibilityHint="Creates your community profile with the selected feed"
              accessibilityState={{
                disabled: !gateName.trim() || !gateGender || gateSubmitting,
                busy: gateSubmitting,
              }}
            >
              {gateSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={theme.primaryForeground}
                />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: theme.primaryForeground, fontWeight: "600" }}
                >
                  Continue
                </ThemedText>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  if (currentView === "rooms") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <Aurora />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={[styles.headerIconBtn, { opacity: 0 }]} />
          <View style={styles.headerCenter}>
            <ThemedText type="h3" style={{ color: theme.text }}>
              Community
            </ThemedText>
            {profile ? (
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {profile.gender === "male" ? "Brothers" : "Sisters"} space ·
                private by design
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            testID="button-community-circles"
            onPress={() => navigation.navigate("DailyCircles")}
            accessibilityRole="button"
            accessibilityLabel="Daily Circles"
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
                marginRight: Spacing.xs,
              },
              pressed && { opacity: 0.5 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="streak-garden" size={20} color={theme.scholar} />
          </Pressable>
          <Pressable
            testID="button-community-settings"
            onPress={() => navigation.navigate("CommunitySettings")}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
              pressed && { opacity: 0.5 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="settings" size={20} color={theme.primary} />
          </Pressable>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.roomsList,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={roomsRefreshing}
              onRefresh={() => {
                setRoomsRefreshing(true);
                fetchRooms();
              }}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <CommunityHubSwitcher
                active="boards"
                unreadCount={conversations.reduce(
                  (total, item) => total + item.unreadCount,
                  0,
                )}
                onChange={navigateCommunityHub}
              />
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: "transparent",
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={BorderRadius.xl}
                  tint={`${theme.primary}09`}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.summaryHeader}>
                  <View
                    style={[
                      styles.summaryIcon,
                      { backgroundColor: `${theme.primary}16` },
                    ]}
                  >
                    <CommunityIconSvg
                      size={26}
                      color={theme.primary}
                      accentColor={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4" style={{ color: theme.text }}>
                      Respectful community
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Share what is useful. Pause when you have what you need.
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.communityPillRail}>
                  {[
                    profile?.gender === "male"
                      ? "Brothers only"
                      : "Sisters only",
                    "Adab first",
                    "Private by design",
                  ].map((label) => (
                    <View
                      key={label}
                      style={[
                        styles.communityPill,
                        {
                          backgroundColor: `${theme.primary}10`,
                          borderColor: `${theme.primary}30`,
                        },
                      ]}
                    >
                      <AppIcon name="shield" size={11} color={theme.primary} />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: theme.primary,
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        {label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            roomsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : roomsError ? (
              <View style={styles.emptyState}>
                <AppIcon name="wifi-off" size={42} color={theme.textMuted} />
                <ThemedText type="body" style={styles.emptyStateText}>
                  {roomsError}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isNew = hasNewActivity(item);
            return (
              <Animated.View
                entering={FadeInDown.delay(index * 60).duration(300)}
              >
                <Pressable
                  testID={`button-room-${item.id}`}
                  style={({ pressed }) => [
                    styles.roomCard,
                    {
                      backgroundColor: "transparent",
                      borderColor: isNew
                        ? `${theme.primary}55`
                        : theme.borderSubtle,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => openRoom(item)}
                >
                  <NuraiGlass
                    pointerEvents="none"
                    interactive
                    radius={BorderRadius.xl}
                    tint={isNew ? `${theme.primary}0D` : undefined}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      styles.roomIconWrap,
                      { backgroundColor: `${theme.primary}15` },
                    ]}
                  >
                    <AppIcon
                      name={(item.icon || "message-circle") as AppIconName}
                      size={24}
                      color={theme.primary}
                    />
                    {isNew ? (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.roomInfo}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {item.name}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                      numberOfLines={1}
                    >
                      {item.description}
                    </ThemedText>
                  </View>
                  <View style={styles.roomMeta}>
                    {item.postCount > 0 ? (
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textMuted,
                          marginRight: Spacing.xs,
                        }}
                      >
                        {formatCount(item.postCount)}
                      </ThemedText>
                    ) : null}
                    <AppIcon
                      name="chevron-right"
                      size={18}
                      color={theme.textMuted}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      </View>
    );
  }

  if (currentView === "connections") {
    const incoming = connections.filter(
      (item) =>
        item.status === "pending" && item.requestDirection === "incoming",
    );
    const outgoing = connections.filter(
      (item) =>
        item.status === "pending" && item.requestDirection === "outgoing",
    );
    const accepted = connections.filter((item) => item.status === "accepted");

    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <Aurora />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View
            style={[styles.headerIconBtn, { opacity: 0 }]}
            accessibilityElementsHidden
          />
          <View style={styles.headerCenter}>
            <ThemedText type="h3" accessibilityRole="header">
              Community
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {profile?.gender === "male" ? "Brothers" : "Sisters"} only
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Community settings"
            onPress={() => navigation.navigate("CommunitySettings")}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { borderColor: theme.borderSubtle },
              pressed && { opacity: 0.6 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="settings" size={19} color={theme.primary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.socialContent,
              { paddingBottom: insets.bottom + 96 },
            ]}
          >
            <CommunityHubSwitcher
              active="connections"
              unreadCount={conversations.reduce(
                (total, item) => total + item.unreadCount,
                0,
              )}
              onChange={navigateCommunityHub}
            />

            <View style={styles.socialIntro}>
              <View
                style={[
                  styles.socialIntroIcon,
                  { backgroundColor: `${theme.primary}14` },
                ]}
              >
                <AppIcon name="shield" size={20} color={theme.primary} />
              </View>
              <View style={styles.socialIntroCopy}>
                <ThemedText type="h4">Find your people</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Search a username or exact email. Only members of your
                  {profile?.gender === "male" ? " brothers’" : " sisters’"}{" "}
                  space can appear.
                </ThemedText>
              </View>
            </View>

            <View style={styles.peopleSearchRow}>
              <View style={styles.peopleSearchInputWrap}>
                <NuraiSearchField
                  label="Find a community member"
                  testID="input-community-people-search"
                  placeholder="Username or exact email"
                  value={peopleQuery}
                  onChangeText={setPeopleQuery}
                  onSubmitEditing={() => void handlePeopleSearch()}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.peopleSearchInput}
                />
              </View>
              <Pressable
                testID="button-community-people-search"
                accessibilityRole="button"
                accessibilityLabel="Search members"
                disabled={peopleQuery.trim().length < 3 || peopleSearching}
                onPress={() => void handlePeopleSearch()}
                style={({ pressed }) => [
                  styles.peopleSearchButton,
                  {
                    backgroundColor:
                      peopleQuery.trim().length >= 3
                        ? theme.primary
                        : theme.disabled,
                  },
                  pressed && { opacity: 0.78 },
                ]}
              >
                {peopleSearching ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.primaryForeground}
                  />
                ) : (
                  <AppIcon
                    name="search"
                    size={18}
                    color={theme.primaryForeground}
                  />
                )}
              </Pressable>
            </View>

            {connectionsError ? (
              <View
                style={[
                  styles.inlineNotice,
                  { backgroundColor: `${theme.error}12` },
                ]}
                accessibilityRole="alert"
              >
                <AppIcon name="alert-circle" size={16} color={theme.error} />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {connectionsError}
                </ThemedText>
              </View>
            ) : null}

            {incoming.length > 0 ? (
              <View style={styles.socialSection}>
                <ThemedText type="h4">Requests</ThemedText>
                {incoming.map((connection) => (
                  <View
                    key={connection.id}
                    style={[
                      styles.socialPersonRow,
                      { borderBottomColor: theme.borderSubtle },
                    ]}
                  >
                    <NuraiAvatar
                      label={connection.profile.displayName}
                      size={44}
                    />
                    <View style={styles.socialPersonCopy}>
                      <ThemedText type="body" numberOfLines={1}>
                        {connection.profile.displayName}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        @{connection.profile.username}
                      </ThemedText>
                    </View>
                    <View style={styles.compactActionRow}>
                      <Pressable
                        testID={`button-decline-connection-${connection.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Decline ${connection.profile.displayName}`}
                        onPress={() =>
                          void handleRespondConnection(connection.id, "decline")
                        }
                        style={[
                          styles.compactIconAction,
                          { backgroundColor: theme.backgroundTertiary },
                        ]}
                      >
                        <AppIcon
                          name="x"
                          size={17}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                      <Pressable
                        testID={`button-accept-connection-${connection.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Accept ${connection.profile.displayName}`}
                        onPress={() =>
                          void handleRespondConnection(connection.id, "accept")
                        }
                        style={[
                          styles.compactIconAction,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <AppIcon
                          name="check"
                          size={17}
                          color={theme.primaryForeground}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {peopleResults.length > 0 ? (
              <View style={styles.socialSection}>
                <ThemedText type="h4">Search results</ThemedText>
                {peopleResults.map((person) => (
                  <View
                    key={person.id}
                    style={[
                      styles.socialPersonRow,
                      { borderBottomColor: theme.borderSubtle },
                    ]}
                  >
                    <NuraiAvatar label={person.displayName} size={44} />
                    <View style={styles.socialPersonCopy}>
                      <ThemedText type="body" numberOfLines={1}>
                        {person.displayName}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        @{person.username}
                      </ThemedText>
                      {person.bio ? (
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textSecondary }}
                          numberOfLines={1}
                        >
                          {person.bio}
                        </ThemedText>
                      ) : null}
                    </View>
                    {person.connectionStatus === "accepted" ? (
                      <Pressable
                        testID={`button-message-person-${person.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${person.displayName}`}
                        onPress={() => void openDirectConversation(person)}
                        style={[
                          styles.compactTextAction,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.primaryForeground,
                            fontWeight: "700",
                          }}
                        >
                          Message
                        </ThemedText>
                      </Pressable>
                    ) : person.connectionStatus === "pending" ? (
                      <View
                        style={[
                          styles.compactTextAction,
                          { backgroundColor: theme.backgroundTertiary },
                        ]}
                        accessible
                        accessibilityLabel={
                          person.requestDirection === "incoming"
                            ? "Connection request received"
                            : "Connection request sent"
                        }
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted }}
                        >
                          {person.requestDirection === "incoming"
                            ? "Requested you"
                            : "Requested"}
                        </ThemedText>
                      </View>
                    ) : (
                      <Pressable
                        testID={`button-connect-person-${person.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Connect with ${person.displayName}`}
                        onPress={() => void handleRequestConnection(person)}
                        style={[
                          styles.compactTextAction,
                          { backgroundColor: `${theme.primary}18` },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: "700" }}
                        >
                          Connect
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            ) : null}

            {connectionsLoading ? (
              <ActivityIndicator
                color={theme.primary}
                style={{ marginTop: Spacing.xl }}
              />
            ) : null}

            {accepted.length > 0 ? (
              <View style={styles.socialSection}>
                <ThemedText type="h4">Connections</ThemedText>
                {accepted.map((connection) => (
                  <Pressable
                    key={connection.id}
                    testID={`community-connection-${connection.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${connection.profile.displayName}`}
                    onPress={() =>
                      void openDirectConversation(connection.profile)
                    }
                    onLongPress={() =>
                      showMemberSafetyActions(connection.profile)
                    }
                    style={({ pressed }) => [
                      styles.socialPersonRow,
                      { borderBottomColor: theme.borderSubtle },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <NuraiAvatar
                      label={connection.profile.displayName}
                      size={44}
                    />
                    <View style={styles.socialPersonCopy}>
                      <ThemedText type="body" numberOfLines={1}>
                        {connection.profile.displayName}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        @{connection.profile.username}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${connection.profile.displayName}`}
                      onPress={() =>
                        showMemberSafetyActions(connection.profile)
                      }
                      style={styles.compactIconAction}
                    >
                      <AppIcon
                        name="more-horizontal"
                        size={18}
                        color={theme.textMuted}
                      />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : !connectionsLoading &&
              incoming.length === 0 &&
              outgoing.length === 0 ? (
              <NuraiEmptyState
                title="Your circle starts here"
                body="Find someone by username or exact email, then connect before messaging."
              />
            ) : null}

            {outgoing.length > 0 ? (
              <View style={styles.socialSection}>
                <ThemedText type="h4">Sent requests</ThemedText>
                {outgoing.map((connection) => (
                  <View
                    key={connection.id}
                    style={[
                      styles.socialPersonRow,
                      { borderBottomColor: theme.borderSubtle },
                    ]}
                  >
                    <NuraiAvatar
                      label={connection.profile.displayName}
                      size={40}
                    />
                    <View style={styles.socialPersonCopy}>
                      <ThemedText type="body">
                        {connection.profile.displayName}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        Awaiting response
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel request to ${connection.profile.displayName}`}
                      onPress={() => void handleRemoveConnection(connection.id)}
                      style={styles.compactTextAction}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        Cancel
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (currentView === "inbox") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <Aurora />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View
            style={[styles.headerIconBtn, { opacity: 0 }]}
            accessibilityElementsHidden
          />
          <View style={styles.headerCenter}>
            <ThemedText type="h3" accessibilityRole="header">
              Community
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Private messages ·{" "}
              {profile?.gender === "male" ? "brothers" : "sisters"} only
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh messages"
            onPress={() => void loadConversations()}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { borderColor: theme.borderSubtle },
              pressed && { opacity: 0.6 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="refresh-cw" size={18} color={theme.primary} />
          </Pressable>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          refreshing={conversationsLoading}
          onRefresh={() => void loadConversations()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.socialContent,
            { paddingBottom: insets.bottom + 96, flexGrow: 1 },
          ]}
          ListHeaderComponent={
            <View>
              <CommunityHubSwitcher
                active="messages"
                unreadCount={conversations.reduce(
                  (total, item) => total + item.unreadCount,
                  0,
                )}
                onChange={navigateCommunityHub}
              />
              <View style={styles.inboxSafetyRow}>
                <AppIcon name="lock" size={15} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  Only accepted connections from your community space can
                  message you.
                </ThemedText>
              </View>
              {conversationsError ? (
                <NuraiErrorState
                  title="Messages unavailable"
                  body={conversationsError}
                  actionLabel="Try again"
                  onAction={() => void loadConversations()}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            conversationsLoading ? (
              <ActivityIndicator
                color={theme.primary}
                style={{ marginTop: Spacing["2xl"] }}
              />
            ) : !conversationsError ? (
              <NuraiEmptyState
                title="No conversations yet"
                body="Connect with someone first, then begin a private conversation."
                actionLabel="Find people"
                onAction={() => navigateCommunityHub("connections")}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`community-conversation-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.profile.displayName}. ${item.unreadCount} unread messages`}
              onPress={() => {
                setActiveConversation(item);
                setDirectMessagesError("");
                setPendingDirectMessage(null);
                setConversationUnavailable(false);
                setCurrentView("conversation");
              }}
              style={({ pressed }) => [
                styles.conversationRow,
                { borderBottomColor: theme.borderSubtle },
                pressed && { opacity: 0.7 },
              ]}
            >
              <NuraiAvatar label={item.profile.displayName} size={48} />
              <View style={styles.conversationCopy}>
                <View style={styles.conversationTitleRow}>
                  <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                    {item.profile.displayName}
                  </ThemedText>
                  {item.unreadCount > 0 ? (
                    <View
                      style={[
                        styles.unreadCount,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.primaryForeground,
                          fontWeight: "800",
                        }}
                      >
                        {Math.min(item.unreadCount, 99)}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={{
                    color:
                      item.unreadCount > 0
                        ? theme.textSecondary
                        : theme.textMuted,
                  }}
                >
                  {item.lastMessage || "No messages yet"}
                </ThemedText>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (currentView === "conversation" && activeConversation && profile) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <Aurora />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            testID="button-back-community-inbox"
            accessibilityRole="button"
            accessibilityLabel="Back to messages"
            onPress={() => {
              setCurrentView("inbox");
              setActiveConversation(null);
              setDirectMessages([]);
              setPendingDirectMessage(null);
              setConversationUnavailable(false);
            }}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { borderColor: theme.borderSubtle },
              pressed && { opacity: 0.6 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="arrow-left" size={21} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="h4" numberOfLines={1} accessibilityRole="header">
              {activeConversation.profile.displayName}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              @{activeConversation.profile.username}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Safety options for ${activeConversation.profile.displayName}`}
            onPress={() => showMemberSafetyActions(activeConversation.profile)}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { borderColor: theme.borderSubtle },
              pressed && { opacity: 0.6 },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon
              name="more-horizontal"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={directMessageListRef}
            data={directMessages}
            keyExtractor={(item) => String(item.id)}
            refreshing={directMessagesLoading}
            onRefresh={() => void loadDirectMessages(activeConversation)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.directMessageList,
              { paddingBottom: Spacing.lg },
            ]}
            onContentSizeChange={() =>
              directMessageListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              directMessagesLoading ? (
                <ActivityIndicator
                  color={theme.primary}
                  style={{ marginTop: Spacing["2xl"] }}
                />
              ) : directMessagesError && !pendingDirectMessage ? (
                <NuraiErrorState
                  title="Conversation unavailable"
                  body={directMessagesError}
                  actionLabel="Try again"
                  onAction={() => void loadDirectMessages(activeConversation)}
                />
              ) : (
                <NuraiEmptyState
                  title="Begin with salaam"
                  body="This conversation is private to you and your accepted connection."
                />
              )
            }
            renderItem={({ item }) => {
              const mine = item.senderProfileId === profile.id;
              return (
                <Pressable
                  style={[
                    styles.directMessageBubble,
                    mine
                      ? styles.directMessageMine
                      : styles.directMessageTheirs,
                    {
                      backgroundColor: mine
                        ? `${theme.primary}24`
                        : theme.backgroundTertiary,
                      borderColor: mine
                        ? `${theme.primary}42`
                        : theme.borderSubtle,
                    },
                  ]}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${mine ? "You" : activeConversation.profile.displayName}: ${item.content || item.media?.altText || "Shared photo"}`}
                  accessibilityHint={
                    mine ? undefined : "Long press to report this message"
                  }
                  onLongPress={
                    mine
                      ? undefined
                      : () =>
                          Alert.alert("Message options", undefined, [
                            {
                              text: "Report message",
                              onPress: () =>
                                void handleReport("message", item.id, "other"),
                            },
                            { text: "Cancel", style: "cancel" },
                          ])
                  }
                >
                  {item.media ? (
                    <Image
                      source={{ uri: getCommunityMessageMediaUrl(item.id) }}
                      style={[
                        styles.directMessageImage,
                        {
                          aspectRatio: Math.max(
                            0.75,
                            Math.min(1.5, item.media.width / item.media.height),
                          ),
                        },
                      ]}
                      resizeMode="cover"
                      accessible
                      accessibilityLabel={item.media.altText}
                    />
                  ) : null}
                  {item.content ? (
                    <ThemedText type="body" style={{ lineHeight: 23 }}>
                      {item.content}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, alignSelf: "flex-end" }}
                  >
                    {timeAgo(item.createdAt)}
                  </ThemedText>
                </Pressable>
              );
            }}
          />

          {conversationUnavailable ? (
            <View
              style={[
                styles.messageRetryRow,
                {
                  backgroundColor: `${theme.error}12`,
                  borderColor: `${theme.error}30`,
                },
              ]}
              accessibilityRole="alert"
            >
              <AppIcon name="lock" size={17} color={theme.error} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                This conversation is no longer available. A current accepted
                connection is required to read or send messages.
              </ThemedText>
            </View>
          ) : pendingDirectMessage && directMessagesError ? (
            <View
              style={[
                styles.messageRetryRow,
                {
                  backgroundColor: `${theme.error}12`,
                  borderColor: `${theme.error}30`,
                },
              ]}
              accessibilityRole="alert"
            >
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.error, fontWeight: "700" }}
                >
                  Not sent
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                  numberOfLines={1}
                >
                  {pendingDirectMessage.content}
                </ThemedText>
              </View>
              <Pressable
                testID="button-retry-community-message"
                accessibilityRole="button"
                accessibilityLabel="Retry message"
                onPress={() =>
                  void handleSendDirectMessage(pendingDirectMessage)
                }
                style={[
                  styles.compactTextAction,
                  { backgroundColor: `${theme.primary}18` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "700" }}
                >
                  Retry
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View
            style={[
              styles.directComposer,
              {
                paddingBottom: insets.bottom + 66,
                borderTopColor: theme.borderSubtle,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          >
            {directMessageImage ? (
              <View
                style={[
                  styles.directMessageImagePreview,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
                accessibilityLabel="Photo ready to send"
              >
                <Image
                  source={{ uri: directMessageImage.localUri }}
                  style={styles.directMessageImagePreviewThumb}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "700" }}>
                    Photo ready
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Shared only in this private conversation
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected photo"
                  onPress={() => setDirectMessageImage(null)}
                  style={styles.directMessageImageRemove}
                >
                  <AppIcon name="x" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.directComposerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a photo"
                accessibilityState={{
                  disabled:
                    conversationUnavailable || directMessageImagePreparing,
                  busy: directMessageImagePreparing,
                }}
                disabled={
                  conversationUnavailable || directMessageImagePreparing
                }
                onPress={() => void chooseDirectMessageImage()}
                style={[
                  styles.directMediaButton,
                  {
                    backgroundColor: theme.backgroundTertiary,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                {directMessageImagePreparing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <AppIcon name="image" size={20} color={theme.primary} />
                )}
              </Pressable>
              <TextInput
                testID="input-community-message"
                accessibilityLabel={`Message ${activeConversation.profile.displayName}`}
                style={[
                  styles.directComposerInput,
                  {
                    backgroundColor: theme.backgroundTertiary,
                    borderColor: theme.borderSubtle,
                    color: theme.text,
                  },
                ]}
                placeholder={
                  conversationUnavailable
                    ? "Connection required"
                    : directMessageImage
                      ? "Add a caption"
                      : "Write a message"
                }
                placeholderTextColor={theme.textMuted}
                value={directMessageText}
                onChangeText={(text) => {
                  setDirectMessageText(text);
                  if (directMessagesError) setDirectMessagesError("");
                }}
                multiline
                editable={!conversationUnavailable}
                maxLength={1200}
                textAlignVertical="top"
              />
              <Pressable
                testID="button-send-community-message"
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{
                  disabled:
                    conversationUnavailable ||
                    (!directMessageText.trim() && !directMessageImage) ||
                    directMessageSending,
                  busy: directMessageSending,
                }}
                disabled={
                  conversationUnavailable ||
                  (!directMessageText.trim() && !directMessageImage) ||
                  directMessageSending
                }
                onPress={() => void handleSendDirectMessage()}
                style={({ pressed }) => [
                  styles.directSendButton,
                  {
                    backgroundColor:
                      directMessageText.trim() || directMessageImage
                        ? theme.primary
                        : theme.disabled,
                  },
                  pressed && { opacity: 0.78 },
                ]}
              >
                {directMessageSending ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.primaryForeground}
                  />
                ) : (
                  <AppIcon
                    name="send"
                    size={18}
                    color={theme.primaryForeground}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const postReplies = expandedPostId ? replies[expandedPostId] || [] : [];
  const loadingReplies = expandedPostId
    ? repliesLoading[expandedPostId] || false
    : false;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          testID="button-back-rooms"
          onPress={goBackToRooms}
          style={({ pressed }) => [
            styles.headerIconBtn,
            { borderColor: theme.borderSubtle },
            pressed && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to community boards"
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="h4" numberOfLines={1} accessibilityRole="header">
            {selectedRoom?.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </ThemedText>
        </View>
        <Pressable
          testID="button-community-settings-detail"
          onPress={() => navigation.navigate("CommunitySettings")}
          style={({ pressed }) => [
            styles.headerIconBtn,
            { borderColor: theme.borderSubtle },
            pressed && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Community controls"
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon
            name="more-horizontal"
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.postsList,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={postsRefreshing}
            onRefresh={() => {
              if (selectedRoom) {
                setPostsRefreshing(true);
                fetchPosts(selectedRoom.id);
              }
            }}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          postsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : postsError ? (
            <View style={styles.emptyState}>
              <AppIcon name="wifi-off" size={42} color={theme.textMuted} />
              <ThemedText type="body" style={styles.emptyStateText}>
                {postsError}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AppIcon
                name="message-square"
                size={48}
                color={theme.textMuted}
              />
              <ThemedText
                type="body"
                style={{ color: theme.textMuted, marginTop: Spacing.md }}
              >
                No posts yet. Share a useful question or reflection when ready.
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const isExpanded = expandedPostId === item.id;
          const isOwn = profile && item.profileId === profile.id;
          const avatarColor = getAvatarColor(item.displayName);

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 40).duration(300)}
            >
              <View
                style={[
                  styles.postCard,
                  {
                    backgroundColor: "transparent",
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={BorderRadius.xl}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.postHeader}>
                  <View
                    style={[
                      styles.postAvatar,
                      { backgroundColor: `${avatarColor}20` },
                    ]}
                  >
                    <ThemedText
                      type="body"
                      style={{
                        color: avatarColor,
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      {item.displayName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.postMeta}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ThemedText
                        type="body"
                        style={{ fontWeight: "600", fontSize: 14 }}
                      >
                        {item.displayName}
                      </ThemedText>
                      {item.pinned ? (
                        <AppIcon
                          name="bookmark"
                          size={12}
                          color={theme.warning}
                        />
                      ) : null}
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, fontSize: 12 }}
                    >
                      {timeAgo(item.createdAt)}
                    </ThemedText>
                  </View>
                  <Pressable
                    testID={`button-post-options-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isOwn
                        ? "Post options"
                        : `Safety options for ${item.displayName}'s post`
                    }
                    style={({ pressed }) => [
                      styles.moreBtn,
                      pressed && { opacity: 0.5 },
                    ]}
                    onPress={() => showPostActions(item, Boolean(isOwn))}
                  >
                    <AppIcon
                      name="more-horizontal"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                </View>

                <ThemedText
                  type="body"
                  style={[styles.postContent, { lineHeight: 22 }]}
                >
                  {item.content}
                </ThemedText>

                <View
                  style={[
                    styles.engagementBar,
                    { borderTopColor: `${theme.border}40` },
                  ]}
                >
                  <Pressable
                    testID={`button-reply-${item.id}`}
                    style={styles.engagementBtn}
                    onPress={() => togglePost(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.replyCount
                        ? `Open ${item.replyCount} replies`
                        : "Reply privately within this board"
                    }
                  >
                    <AppIcon
                      name="message-circle"
                      size={17}
                      color={isExpanded ? theme.primary : theme.textMuted}
                    />
                    {item.replyCount > 0 ? (
                      <ThemedText
                        type="caption"
                        style={{
                          color: isExpanded ? theme.primary : theme.textMuted,
                          fontSize: 12,
                        }}
                      >
                        {formatCount(item.replyCount)}
                      </ThemedText>
                    ) : null}
                  </Pressable>

                  <Pressable
                    testID={`button-like-${item.id}`}
                    style={styles.engagementBtn}
                    onPress={() => handleLike(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.liked
                        ? "Remove beneficial mark"
                        : "Mark as beneficial"
                    }
                    accessibilityState={{ selected: item.liked }}
                  >
                    <AppIcon
                      name="bookmark"
                      size={17}
                      color={item.liked ? theme.scholar : theme.textMuted}
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: item.liked ? theme.scholar : theme.textMuted,
                        fontSize: 12,
                      }}
                    >
                      Beneficial
                    </ThemedText>
                  </Pressable>

                  {!isOwn ? (
                    <Pressable
                      testID={`button-show-less-${item.id}`}
                      style={styles.engagementBtn}
                      onPress={() => void handleShowLess(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Show fewer posts like this"
                      accessibilityHint="This preference is private and does not create a public dislike count"
                    >
                      <AppIcon
                        name="eye-off"
                        size={17}
                        color={theme.textMuted}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontSize: 12 }}
                      >
                        Less
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>

                {isExpanded ? (
                  <View
                    style={[
                      styles.repliesSection,
                      { borderTopColor: `${theme.border}40` },
                    ]}
                  >
                    {loadingReplies ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.primary}
                        style={{ marginVertical: Spacing.md }}
                      />
                    ) : postReplies.length > 0 ? (
                      postReplies.map((reply) => {
                        const replyAvatarColor = getAvatarColor(
                          reply.displayName,
                        );
                        return (
                          <View key={reply.id} style={styles.replyItem}>
                            <View
                              style={[
                                styles.replyAvatar,
                                { backgroundColor: `${replyAvatarColor}20` },
                              ]}
                            >
                              <ThemedText
                                type="caption"
                                style={{
                                  color: replyAvatarColor,
                                  fontWeight: "700",
                                  fontSize: 11,
                                }}
                              >
                                {reply.displayName.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                            <View style={styles.replyBody}>
                              <View style={styles.replyHeader}>
                                <ThemedText
                                  type="caption"
                                  style={{ fontWeight: "600", fontSize: 13 }}
                                >
                                  {reply.displayName}
                                </ThemedText>
                                <View style={styles.replyMetaActions}>
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: theme.textMuted,
                                      fontSize: 11,
                                    }}
                                  >
                                    {timeAgo(reply.createdAt)}
                                  </ThemedText>
                                  {reply.profileId !== profile?.id ? (
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Safety options for ${reply.displayName}'s reply`}
                                      onPress={() => showReplyActions(reply)}
                                      hitSlop={8}
                                      style={styles.replyOptionsButton}
                                    >
                                      <AppIcon
                                        name="more-horizontal"
                                        size={15}
                                        color={theme.textMuted}
                                      />
                                    </Pressable>
                                  ) : null}
                                </View>
                              </View>
                              <ThemedText
                                type="small"
                                style={{ lineHeight: 18 }}
                              >
                                {reply.content}
                              </ThemedText>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textMuted,
                          marginVertical: Spacing.sm,
                          textAlign: "center",
                        }}
                      >
                        No replies yet
                      </ThemedText>
                    )}

                    <View style={styles.replyInputRow}>
                      <TextInput
                        testID={`input-reply-${item.id}`}
                        style={[
                          styles.replyInput,
                          {
                            backgroundColor: `${theme.textMuted}10`,
                            color: theme.text,
                          },
                        ]}
                        placeholder="Write a reply"
                        placeholderTextColor={theme.textMuted}
                        value={replyText}
                        onChangeText={setReplyText}
                        maxLength={500}
                      />
                      <Pressable
                        testID={`button-send-reply-${item.id}`}
                        style={[
                          styles.replySubmitBtn,
                          {
                            backgroundColor: replyText.trim()
                              ? theme.primary
                              : `${theme.textMuted}20`,
                          },
                        ]}
                        onPress={() => handleReply(item.id)}
                        disabled={!replyText.trim() || replySubmitting}
                      >
                        {replySubmitting ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.primaryForeground}
                          />
                        ) : (
                          <AppIcon
                            name="send"
                            size={14}
                            color={
                              replyText.trim()
                                ? theme.primaryForeground
                                : theme.textMuted
                            }
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          );
        }}
      />

      <Pressable
        testID="button-new-post"
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: insets.bottom + Spacing.xl,
          },
        ]}
        onPress={() => setShowNewPost(true)}
      >
        <AppIcon name="plus" size={24} color={theme.primaryForeground} />
      </Pressable>

      <Modal visible={showNewPost} transparent animationType="fade">
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowNewPost(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
            onPress={() => {}}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius["2xl"]}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: Spacing.lg,
              }}
            >
              <ThemedText type="h3">New Post</ThemedText>
              <Pressable
                onPress={() => setShowNewPost(false)}
                hitSlop={8}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close new post"
              >
                <AppIcon name="x" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <TextInput
              testID="input-new-post"
              style={[
                styles.newPostInput,
                {
                  backgroundColor: `${theme.textMuted}08`,
                  color: theme.text,
                },
              ]}
              placeholder="Share a respectful reminder, question, or reflection"
              placeholderTextColor={theme.textMuted}
              value={newPostText}
              onChangeText={setNewPostText}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: Spacing.sm,
              }}
            >
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {newPostText.length}/1000
              </ThemedText>
            </View>
            <Pressable
              testID="button-submit-post"
              style={[
                styles.postBtn,
                {
                  backgroundColor: newPostText.trim()
                    ? theme.primary
                    : theme.disabled,
                },
              ]}
              onPress={handleCreatePost}
              disabled={!newPostText.trim() || newPostSubmitting}
            >
              {newPostSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={theme.primaryForeground}
                />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: theme.primaryForeground, fontWeight: "600" }}
                >
                  Post
                </ThemedText>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hubSwitcher: {
    minHeight: 54,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  hubSwitcherItem: {
    minHeight: 46,
    flex: 1,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: Spacing.xs,
  },
  hubUnreadDot: {
    position: "absolute",
    top: -3,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  socialContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  socialIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  socialIntroIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIntroCopy: {
    flex: 1,
    gap: 4,
  },
  peopleSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  peopleSearchInputWrap: { flex: 1 },
  peopleSearchInput: { minWidth: 0 },
  peopleSearchButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineNotice: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  socialSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  socialPersonRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
  socialPersonCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  compactIconAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTextAction: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxSafetyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  conversationRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
  conversationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  conversationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  unreadCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  directMessageList: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  directMessageBubble: {
    maxWidth: "82%",
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  directMessageMine: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  directMessageTheirs: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  directMessageImage: {
    width: 236,
    maxWidth: "100%",
    minHeight: 148,
    maxHeight: 280,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  messageRetryRow: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  directComposer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexDirection: "column",
    alignItems: "stretch",
    gap: Spacing.sm,
  },
  directComposerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  directMediaButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  directMessageImagePreview: {
    minHeight: 64,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  directMessageImagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
  },
  directMessageImageRemove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  directComposerInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 128,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  directSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  gateContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  gateHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  gateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  gateTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  gateDivider: {
    width: 128,
    height: StyleSheet.hairlineWidth,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  gateSubtitle: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  safetyCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 0,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  gateForm: {
    width: "100%",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 0,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  gateLabel: {
    marginBottom: Spacing.sm,
  },
  gateInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  gateGenderRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  gateGenderCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1.5,
    gap: Spacing.xs,
    overflow: "hidden",
  },
  gateGenderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  gateContinueBtn: {
    height: 52,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },

  roomsList: {
    paddingHorizontal: Spacing.lg,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    minHeight: 72,
    overflow: "hidden",
  },
  roomIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  roomInfo: {
    flex: 1,
    gap: 2,
  },

  postsList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  postCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  postMeta: {
    flex: 1,
    gap: 1,
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  postContent: {
    marginBottom: Spacing.sm,
    fontSize: 15,
  },

  engagementBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  engagementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },

  repliesSection: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  replyItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  replyBody: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  replyMetaActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  replyOptionsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: Spacing.lg,
    fontSize: 14,
  },
  replySubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  communityPillRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  communityPill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  roomMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing.lg,
  },
  emptyStateText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    overflow: "hidden",
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  newPostInput: {
    height: 140,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: 16,
    lineHeight: 24,
  },
  postBtn: {
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
});
