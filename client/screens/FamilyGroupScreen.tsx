import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  AppState,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { ApiRequestError, apiRequest, getApiUrl } from "@/lib/query-client";
import { useSubscription } from "@/context/SubscriptionContext";
import { hasAccess } from "@/config/entitlements";
import { PremiumBadge } from "@/components/PremiumGate";
import {
  FamilyIconSvg,
  GoldDivider,
} from "@/components/premium/svg/PremiumSvgs";
import { NuraiGlass, NuraiSegmentedControl } from "@/design-system";
import { AppIcon, type AppIconName } from "@/components/icons";
import { FamilyLiveView } from "@/components/FamilyLiveView";
import type { FamilyLiveMapPoint } from "@/components/FamilyLiveMap";

const DUAS_KEY = "family_shared_duas";
const CHALLENGES_KEY = "family_challenges";
const FAMILY_MESSAGE_OUTBOX_KEY = "family_message_outbox_v1";
const FAMILY_MESSAGE_SEND_ERROR =
  "Message saved locally. Try sending again when your connection is back.";
const FAMILY_MESSAGE_QUEUED_COPY =
  "Waiting to send. NurAI will retry automatically when the connection returns.";
const ENABLE_QA_FAMILY_BYPASS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";
const QA_FAMILY_USER: AuthUser = {
  id: "preview-local-user",
  username: "preview",
  displayName: "Guest",
};
const QA_FAMILY_GROUP: FamilyGroup = {
  id: -101,
  name: "Family Circle",
  creatorId: QA_FAMILY_USER.id,
  inviteCode: "PREVIEW",
  members: [
    {
      id: -1,
      userId: QA_FAMILY_USER.id,
      role: "owner",
      joinedAt: new Date(0).toISOString(),
      displayName: QA_FAMILY_USER.displayName,
      username: QA_FAMILY_USER.username,
    },
  ],
};
const QA_FAMILY_MESSAGES: FamilyMessage[] = [
  {
    id: -201,
    groupId: QA_FAMILY_GROUP.id,
    senderId: QA_FAMILY_USER.id,
    senderName: QA_FAMILY_USER.displayName,
    senderUsername: QA_FAMILY_USER.username,
    kind: "message",
    content: "Assalamu alaykum. This is a private family check-in.",
    createdAt: new Date().toISOString(),
  },
];
const QA_FAMILY_ACTIVITY: FamilyProgressEvent[] = [
  {
    id: -301,
    userId: QA_FAMILY_USER.id,
    displayName: QA_FAMILY_USER.displayName,
    username: QA_FAMILY_USER.username,
    category: "family",
    title: "a calm family update",
    value: 1,
    unit: "message",
    createdAt: new Date().toISOString(),
  },
];

function seedQAFamilyData({
  setGroups,
  setInvitations,
  setFamilyMessages,
  setFamilyActivity,
  setFamilyProgressMembers,
  setFamilySyncIssue,
}: {
  setGroups: React.Dispatch<React.SetStateAction<FamilyGroup[]>>;
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  setFamilyMessages: React.Dispatch<React.SetStateAction<FamilyMessage[]>>;
  setFamilyActivity: React.Dispatch<
    React.SetStateAction<FamilyProgressEvent[]>
  >;
  setFamilyProgressMembers: React.Dispatch<React.SetStateAction<any[]>>;
  setFamilySyncIssue: React.Dispatch<React.SetStateAction<string>>;
}) {
  setGroups([QA_FAMILY_GROUP]);
  setInvitations([]);
  setFamilyMessages(QA_FAMILY_MESSAGES);
  setFamilyActivity(QA_FAMILY_ACTIVITY);
  setFamilyProgressMembers([]);
  setFamilySyncIssue("");
}

function getFamilySendErrorCopy(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) return fallback;
  const responseBody = error.responseBody as
    | { message?: unknown; error?: unknown }
    | undefined;
  if (
    responseBody &&
    typeof responseBody.message === "string" &&
    responseBody.message.trim()
  ) {
    return responseBody.message.trim();
  }
  if (error.status === 401) return "Please sign in again to continue.";
  if (error.status === 402) {
    return "Family Circle messages require Premium or Scholar.";
  }
  if (error.status === 403) {
    return "We could not confirm this family circle membership. Refresh Family Circle and try again.";
  }
  if (error.status === 429) {
    return "Too many family updates. Please slow down and try again shortly.";
  }
  return fallback;
}

function isQueueableFamilySendError(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

const AVATAR_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#56B394",
];

interface GroupMember {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  displayName: string | null;
  username: string;
}

interface FamilyGroup {
  id: number;
  name: string;
  creatorId: string;
  inviteCode: string;
  members: GroupMember[];
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatar: string;
}

interface Invitation {
  id: number;
  groupId: number;
  groupName: string;
  inviterName: string | null;
  status: string;
  createdAt: string;
}

interface GroupChallenge {
  id: string;
  title: string;
  description: string;
  icon: AppIconName;
  target: number;
  current: number;
  unit: string;
  daysLeft: number;
  category?: "quran" | "prayer" | "dhikr" | "family" | string;
  reference?: string;
  actionPrompt?: string;
  nextAction?: string;
  quranIdentityTitle?: string;
  quranIdentityId?: string;
  journeyStage?: string;
  rewardLabel?: string;
  familyMilestones?: string[];
  createdFrom?: string;
}

interface SharedDua {
  id: string;
  from: string;
  text: string;
  timestamp: string;
  liked?: boolean;
  ameenCount?: number;
}

interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
}

interface FamilyMessage {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string | null;
  senderUsername: string;
  kind: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
  queued?: boolean;
}

interface PendingFamilyRetry {
  optimisticId: number;
  clientMessageId: string;
}

interface FamilyProgressEvent {
  id: number;
  userId: string;
  displayName: string | null;
  username: string;
  category: string;
  title: string;
  value: number;
  unit: string;
  createdAt: string;
}

interface FamilyProgressMember {
  userId: string;
  role: string;
  displayName: string | null;
  username: string;
  actionCount: number;
  totalValue: number;
  categories: string[];
  lastActivityAt: string | null;
}

type FamilyPlaceKind = "home" | "school" | "work" | "mosque" | "custom";

interface FamilyPlace {
  id: number;
  groupId: number;
  name: string;
  kind: FamilyPlaceKind | string;
  address: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FamilyCheckIn {
  id: number;
  groupId: number;
  userId: string;
  displayName: string | null;
  username: string;
  placeId: number | null;
  placeName: string | null;
  status: "safe" | "at_place" | "shared_location" | "expired" | string;
  locationLabel: string;
  hasSharedLocation: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STARTER_CHALLENGES: GroupChallenge[] = [
  {
    id: "family_quran",
    title: "Family Ayah Journey",
    description:
      "Listen to one ayah, learn one word, and share one action together.",
    icon: "book-open",
    target: 3,
    current: 0,
    unit: "steps",
    daysLeft: 3,
    category: "quran",
    reference: "Quran study",
    actionPrompt:
      "Each person shares one meaning, one question, or one action from the ayah.",
    nextAction: "Open Quran, hold any ayah, then create a family challenge.",
    quranIdentityTitle: "Family Quran Circle",
    quranIdentityId: "quran_journey",
    journeyStage: "listen_reflect_apply",
    rewardLabel: "Shared Quran light",
    familyMilestones: ["Listen", "Word", "Action"],
    createdFrom: "starter_quran_intelligence",
  },
  {
    id: "prayer_streak",
    title: "Prayer Streak Challenge",
    description: "Everyone prays 5 daily for 7 days",
    icon: "clock",
    target: 7,
    current: 0,
    unit: "days",
    daysLeft: 4,
  },
  {
    id: "dhikr_goal",
    title: "1000 Dhikr Together",
    description: "Collective dhikr count goal",
    icon: "disc",
    target: 1000,
    current: 0,
    unit: "dhikr",
    daysLeft: 7,
  },
];

type TabType = "members" | "challenges" | "duas" | "messages";
type FamilySection = "home" | "people" | "together" | "chat";
type PeopleSubsection = "members" | "live" | "places";

function isConflictError(err: unknown): boolean {
  const error = err as { status?: number; message?: string; code?: string };
  return (
    error?.status === 409 ||
    error?.code === "CONFLICT" ||
    String(error?.message || "").includes("409")
  );
}

function parseQuranChallengeReference(reference?: string | null) {
  const match = String(reference || "").match(
    /(?:quran\s*)?(\d{1,3})\s*:\s*(\d{1,3})/i,
  );
  if (!match) return null;
  return {
    surahNumber: Number(match[1]),
    initialVerse: Number(match[2]),
  };
}

function createFamilyClientMessageId(): string {
  return `family-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFamilyMessageClientId(message: FamilyMessage): string {
  return typeof message.metadata?.clientMessageId === "string"
    ? message.metadata.clientMessageId
    : "";
}

function mergeFamilyMessages(
  serverMessages: FamilyMessage[],
  localOutbox: FamilyMessage[],
): FamilyMessage[] {
  const serverIds = new Set(serverMessages.map((message) => message.id));
  const serverClientIds = new Set(
    serverMessages.map(getFamilyMessageClientId).filter(Boolean),
  );
  const localOnly = localOutbox.filter((message) => {
    const clientId = getFamilyMessageClientId(message);
    return (
      !serverIds.has(message.id) &&
      (!clientId || !serverClientIds.has(clientId))
    );
  });
  return [...serverMessages, ...localOnly];
}

function reconcileFamilyMessageDelivery(
  current: FamilyMessage[],
  sent: FamilyMessage[],
  remainingOutbox: FamilyMessage[],
): FamilyMessage[] {
  const replacedClientIds = new Set(
    [...sent, ...remainingOutbox].map(getFamilyMessageClientId).filter(Boolean),
  );
  const stable = current.filter((message) => {
    const clientId = getFamilyMessageClientId(message);
    if (clientId && replacedClientIds.has(clientId)) return false;
    return !message.queued;
  });
  return mergeFamilyMessages([...stable, ...sent], remainingOutbox).sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

async function loadFamilyMessageOutbox(
  groupId: number,
): Promise<FamilyMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(FAMILY_MESSAGE_OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const messages = Array.isArray(parsed?.[String(groupId)])
      ? parsed[String(groupId)]
      : [];
    return messages.filter(
      (message: FamilyMessage) =>
        message &&
        typeof message.id === "number" &&
        typeof message.content === "string" &&
        message.failed,
    );
  } catch {
    return [];
  }
}

async function saveFamilyMessageOutbox(
  groupId: number,
  messages: FamilyMessage[],
): Promise<void> {
  const raw = await AsyncStorage.getItem(FAMILY_MESSAGE_OUTBOX_KEY);
  const parsed = raw ? JSON.parse(raw) : {};
  parsed[String(groupId)] = messages.slice(-12);
  await AsyncStorage.setItem(FAMILY_MESSAGE_OUTBOX_KEY, JSON.stringify(parsed));
}

async function upsertFamilyMessageOutbox(
  groupId: number,
  failedMessage: FamilyMessage,
): Promise<void> {
  const current = await loadFamilyMessageOutbox(groupId);
  const clientId = getFamilyMessageClientId(failedMessage);
  const next = [
    ...current.filter((message) => {
      const existingClientId = getFamilyMessageClientId(message);
      return clientId
        ? existingClientId !== clientId
        : message.id !== failedMessage.id;
    }),
    failedMessage,
  ];
  await saveFamilyMessageOutbox(groupId, next);
}

async function removeFamilyMessageOutboxItem(
  groupId: number,
  clientMessageId: string,
): Promise<void> {
  if (!clientMessageId) return;
  const current = await loadFamilyMessageOutbox(groupId);
  await saveFamilyMessageOutbox(
    groupId,
    current.filter(
      (message) => getFamilyMessageClientId(message) !== clientMessageId,
    ),
  );
}

export default function FamilyGroupScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { currentPlan } = useSubscription();
  const canUseFamilyTools =
    ENABLE_QA_FAMILY_BYPASS || hasAccess(currentPlan, "premium");

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [familySection, setFamilySection] = useState<FamilySection>("home");
  const [peopleSubsection, setPeopleSubsection] =
    useState<PeopleSubsection>("members");
  const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
  const [duas, setDuas] = useState<SharedDua[]>([]);
  const [newDua, setNewDua] = useState("");
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([]);
  const [familyProgressMembers, setFamilyProgressMembers] = useState<
    FamilyProgressMember[]
  >([]);
  const [familyActivity, setFamilyActivity] = useState<FamilyProgressEvent[]>(
    [],
  );
  const [newFamilyMessage, setNewFamilyMessage] = useState("");
  const [sendingFamilyMessage, setSendingFamilyMessage] = useState(false);
  const [queuedSendLoading, setQueuedSendLoading] = useState(false);
  const [messageComposerFocused, setMessageComposerFocused] = useState(false);
  const [pendingFamilyRetry, setPendingFamilyRetry] =
    useState<PendingFamilyRetry | null>(null);
  const [familySyncLoading, setFamilySyncLoading] = useState(false);
  const [familySyncIssue, setFamilySyncIssue] = useState("");
  const [familyPlaces, setFamilyPlaces] = useState<FamilyPlace[]>([]);
  const [familyCheckIns, setFamilyCheckIns] = useState<FamilyCheckIn[]>([]);
  const [familyPlacesLoading, setFamilyPlacesLoading] = useState(false);
  const [familyPlacesRefreshedAt, setFamilyPlacesRefreshedAt] = useState<
    string | null
  >(null);
  const [familyPlaceSaving, setFamilyPlaceSaving] = useState(false);
  const [familyCheckInSaving, setFamilyCheckInSaving] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  const [newPlaceKind, setNewPlaceKind] = useState<FamilyPlaceKind>("custom");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);

  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [goalDays, setGoalDays] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);

  const requestedGroupId = useMemo(() => {
    const rawGroupId = route.params?.groupId;
    const parsedGroupId = Number(rawGroupId);
    return Number.isInteger(parsedGroupId) && parsedGroupId !== 0
      ? parsedGroupId
      : null;
  }, [route.params?.groupId]);
  const currentGroup = useMemo(() => {
    if (requestedGroupId !== null) {
      return groups.find((group) => group.id === requestedGroupId) || null;
    }
    return groups.length > 0 ? groups[0] : null;
  }, [groups, requestedGroupId]);
  const queuedFamilyMessageCount = useMemo(
    () => familyMessages.filter((message) => message.queued).length,
    [familyMessages],
  );
  const isCreator = currentGroup
    ? currentGroup.creatorId === authUser?.id
    : false;
  const familyKeyboardOffset = 0;
  const scrollBottomPadding = familySection === "chat" ? Spacing.sm : 48;

  const navigateFamilySection = useCallback((section: FamilySection) => {
    setFamilySection(section);
    if (section === "home" || section === "people") {
      setActiveTab("members");
    } else if (section === "together") {
      setActiveTab("challenges");
    } else {
      setActiveTab("messages");
    }
  }, []);

  const openFamilyPlaces = useCallback(() => {
    setFamilySection("people");
    setActiveTab("members");
    setPeopleSubsection("places");
  }, []);

  const openFamilyLiveView = useCallback(() => {
    setFamilySection("people");
    setActiveTab("members");
    setPeopleSubsection("live");
  }, []);

  const scrollMessagesIntoView = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 260);
  }, []);

  const scrollMessagesIntoViewAfterKeyboard = useCallback(() => {
    setTimeout(
      () => {
        scrollRef.current?.scrollToEnd({ animated: true });
      },
      Platform.OS === "ios" ? 360 : 180,
    );
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      if (familySection === "chat") scrollMessagesIntoViewAfterKeyboard();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setMessageComposerFocused(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [familySection, scrollMessagesIntoViewAfterKeyboard]);

  const requireFamilyTools = useCallback(() => {
    if (canUseFamilyTools) return true;
    setErrorMessage("Family Circle sharing is included with Premium.");
    navigation.navigate("Subscription", {
      initialTab: "premium",
      sourceFeature: "family",
    });
    return false;
  }, [canUseFamilyTools, navigation]);

  useEffect(() => {
    const initialTab = String(route.params?.initialTab || "").toLowerCase();
    if (!initialTab) return;
    if (initialTab === "goals") {
      setActiveTab("challenges");
      setFamilySection("together");
      return;
    }
    if (initialTab === "members") {
      setActiveTab(initialTab);
      setFamilySection("people");
      return;
    }
    if (initialTab === "challenges" || initialTab === "duas") {
      setActiveTab(initialTab);
      setFamilySection("together");
      return;
    }
    if (initialTab === "messages") {
      setActiveTab("messages");
      setFamilySection("chat");
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (familySection === "chat") {
      scrollMessagesIntoView();
    }
  }, [familySection, familyMessages.length, scrollMessagesIntoView]);

  const performSearch = useCallback(
    async (query: string) => {
      if (!canUseFamilyTools) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/users/search", baseUrl);
        url.searchParams.set("q", query);
        url.searchParams.set("userTier", currentPlan);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [canUseFamilyTools, currentPlan],
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchGroups();
      fetchInvitations();
      loadLocalData();
    }
  }, [authUser]);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [performSearch, searchQuery]);

  const checkAuth = async () => {
    if (ENABLE_QA_FAMILY_BYPASS) {
      setAuthUser(QA_FAMILY_USER);
      setAuthLoading(false);
      setAuthChecked(true);
      return;
    }
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/me", baseUrl).toString(), {
        credentials: "include",
      });
      if (res.ok) {
        const user = await res.json();
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    } catch {
      setAuthUser(null);
    } finally {
      setAuthLoading(false);
      setAuthChecked(true);
    }
  };

  const fetchGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await apiRequest("GET", "/api/family/groups");
      const data = await res.json();
      setGroups(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.groups)
            ? data.groups
            : [],
      );
    } catch {
      if (ENABLE_QA_FAMILY_BYPASS) {
        seedQAFamilyData({
          setGroups,
          setInvitations,
          setFamilyMessages,
          setFamilyActivity,
          setFamilyProgressMembers,
          setFamilySyncIssue,
        });
      } else {
        setGroups([]);
      }
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (ENABLE_QA_FAMILY_BYPASS) {
      setInvitations([]);
      return;
    }
    try {
      const res = await apiRequest("GET", "/api/family/invitations");
      const data = await res.json();
      setInvitations(data);
    } catch {
      setInvitations([]);
    }
  };

  const retryQueuedFamilyMessages = useCallback(
    async (groupId: number, queuedMessages: FamilyMessage[]) => {
      if (!canUseFamilyTools || queuedMessages.length === 0) return [];
      const sentMessages: FamilyMessage[] = [];

      for (const queuedMessage of queuedMessages) {
        const clientMessageId =
          getFamilyMessageClientId(queuedMessage) ||
          createFamilyClientMessageId();
        try {
          const response = await apiRequest(
            "POST",
            `/api/family/groups/${groupId}/messages`,
            {
              content: queuedMessage.content,
              kind: queuedMessage.kind || "message",
              metadata: {
                ...(queuedMessage.metadata || {}),
                clientMessageId,
              },
              userTier: currentPlan,
            },
          );
          const sentMessage = (await response.json()) as FamilyMessage;
          await removeFamilyMessageOutboxItem(groupId, clientMessageId);
          sentMessages.push(sentMessage);
        } catch {
          // Keep queued messages local; the user can still tap Retry manually.
        }
      }

      return sentMessages;
    },
    [canUseFamilyTools, currentPlan],
  );

  const flushQueuedFamilyMessages = useCallback(
    async (groupId: number) => {
      if (!canUseFamilyTools || queuedSendLoading) return 0;
      setQueuedSendLoading(true);
      try {
        const queuedMessages = await loadFamilyMessageOutbox(groupId);
        if (queuedMessages.length === 0) {
          setFamilySyncIssue("");
          return 0;
        }
        const sentMessages = await retryQueuedFamilyMessages(
          groupId,
          queuedMessages,
        );
        const remainingOutbox = await loadFamilyMessageOutbox(groupId);
        setFamilyMessages((current) =>
          reconcileFamilyMessageDelivery(
            current,
            sentMessages,
            remainingOutbox,
          ),
        );
        setFamilySyncIssue(
          remainingOutbox.length > 0 ? FAMILY_MESSAGE_QUEUED_COPY : "",
        );
        if (sentMessages.length > 0) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          scrollMessagesIntoView();
        }
        return sentMessages.length;
      } finally {
        setQueuedSendLoading(false);
      }
    },
    [
      canUseFamilyTools,
      queuedSendLoading,
      retryQueuedFamilyMessages,
      scrollMessagesIntoView,
    ],
  );

  const fetchFamilyCollaboration = useCallback(
    async (groupId: number) => {
      if (!canUseFamilyTools) return false;
      if (ENABLE_QA_FAMILY_BYPASS && groupId === QA_FAMILY_GROUP.id) {
        seedQAFamilyData({
          setGroups,
          setInvitations,
          setFamilyMessages,
          setFamilyActivity,
          setFamilyProgressMembers,
          setFamilySyncIssue,
        });
        setFamilySyncLoading(false);
        return true;
      }
      setFamilySyncLoading(true);
      let messagesLoaded = false;
      let progressLoaded = false;
      try {
        const messagesRes = await apiRequest(
          "GET",
          `/api/family/groups/${groupId}/messages?limit=60`,
        );
        const messagesData = await messagesRes.json();
        const serverMessages = Array.isArray(messagesData) ? messagesData : [];
        const localOutbox = await loadFamilyMessageOutbox(groupId);
        const retriedMessages = await retryQueuedFamilyMessages(
          groupId,
          localOutbox,
        );
        const remainingOutbox = await loadFamilyMessageOutbox(groupId);
        setFamilyMessages(
          mergeFamilyMessages(
            [...serverMessages, ...retriedMessages],
            remainingOutbox,
          ),
        );
        messagesLoaded = true;
      } catch {
        const localOutbox = await loadFamilyMessageOutbox(groupId);
        if (localOutbox.length) {
          setFamilyMessages((current) =>
            mergeFamilyMessages(current, localOutbox),
          );
        }
        setFamilySyncIssue(
          "Latest family messages could not refresh. Your saved messages stay visible.",
        );
      }

      try {
        const progressRes = await apiRequest(
          "GET",
          `/api/family/groups/${groupId}/progress`,
        );
        const progressData = await progressRes.json();
        setFamilyProgressMembers(
          Array.isArray(progressData?.members) ? progressData.members : [],
        );
        setFamilyActivity(
          Array.isArray(progressData?.recentEvents)
            ? progressData.recentEvents
            : [],
        );
        progressLoaded = true;
      } catch {
        setFamilySyncIssue(
          messagesLoaded
            ? "Family progress could not refresh. Messages are still available."
            : "Latest family updates could not refresh. Your saved messages stay visible.",
        );
      } finally {
        setFamilySyncLoading(false);
      }

      if (messagesLoaded && progressLoaded) {
        setFamilySyncIssue("");
      }
      return messagesLoaded || progressLoaded;
    },
    [canUseFamilyTools, retryQueuedFamilyMessages],
  );

  const fetchFamilyPlaces = useCallback(
    async (groupId: number) => {
      if (!canUseFamilyTools) return false;
      if (ENABLE_QA_FAMILY_BYPASS && groupId === QA_FAMILY_GROUP.id) {
        setFamilyPlaces([]);
        setFamilyCheckIns([]);
        setFamilyPlacesRefreshedAt(new Date().toISOString());
        setFamilyPlacesLoading(false);
        return true;
      }
      setFamilyPlacesLoading(true);
      try {
        const response = await apiRequest(
          "GET",
          `/api/family/groups/${groupId}/places`,
        );
        const payload = await response.json();
        setFamilyPlaces(Array.isArray(payload?.places) ? payload.places : []);
        setFamilyCheckIns(
          Array.isArray(payload?.checkIns) ? payload.checkIns : [],
        );
        setFamilyPlacesRefreshedAt(new Date().toISOString());
        return true;
      } catch {
        setFamilySyncIssue(
          "Places and check-ins could not refresh. Your family messages are still available.",
        );
        return false;
      } finally {
        setFamilyPlacesLoading(false);
      }
    },
    [canUseFamilyTools],
  );

  useEffect(() => {
    if (!currentGroup || !canUseFamilyTools) return;
    fetchFamilyCollaboration(currentGroup.id);
  }, [canUseFamilyTools, currentGroup, fetchFamilyCollaboration]);

  useEffect(() => {
    if (!currentGroup || !canUseFamilyTools) return;
    fetchFamilyPlaces(currentGroup.id);
  }, [canUseFamilyTools, currentGroup, fetchFamilyPlaces]);

  useEffect(() => {
    if (
      familySection !== "people" ||
      peopleSubsection !== "live" ||
      !currentGroup ||
      !canUseFamilyTools
    ) {
      return;
    }

    const refreshLiveView = () => {
      void fetchFamilyPlaces(currentGroup.id);
    };
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshLiveView();
      },
    );
    const interval = setInterval(refreshLiveView, 20_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [
    canUseFamilyTools,
    currentGroup,
    familySection,
    fetchFamilyPlaces,
    peopleSubsection,
  ]);

  useEffect(() => {
    if (
      familySection !== "chat" ||
      !currentGroup ||
      queuedFamilyMessageCount === 0
    ) {
      return;
    }
    const tryDelivery = () => {
      void flushQueuedFamilyMessages(currentGroup.id);
    };
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") tryDelivery();
      },
    );
    const interval = setInterval(tryDelivery, 20_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [
    familySection,
    currentGroup,
    flushQueuedFamilyMessages,
    queuedFamilyMessageCount,
  ]);

  const loadLocalData = async () => {
    try {
      const [storedDuas, storedChallenges] = await Promise.all([
        AsyncStorage.getItem(DUAS_KEY),
        AsyncStorage.getItem(CHALLENGES_KEY),
      ]);
      if (storedDuas) setDuas(JSON.parse(storedDuas));
      if (storedChallenges) {
        setChallenges(JSON.parse(storedChallenges));
      } else {
        setChallenges(STARTER_CHALLENGES);
        await syncedSetItem(CHALLENGES_KEY, JSON.stringify(STARTER_CHALLENGES));
      }
    } catch {}
  };

  const handleCreateGroup = async () => {
    if (!requireFamilyTools()) return;
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setCreatingGroup(true);
    setErrorMessage("");
    try {
      await apiRequest("POST", "/api/family/groups", {
        name: trimmed,
        userTier: currentPlan,
      });
      setNewGroupName("");
      await fetchGroups();
    } catch {
      setErrorMessage("Could not create the family group. Please try again.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    if (!currentGroup) return;
    if (!requireFamilyTools()) return;
    setInviteSending(true);
    setInviteMessage("");
    setInviteError("");
    try {
      await apiRequest("POST", `/api/family/groups/${currentGroup.id}/invite`, {
        inviteeId: userId,
        userTier: currentPlan,
      });
      setInviteMessage("Invitation sent successfully");
      await fetchGroups();
    } catch (err: any) {
      if (isConflictError(err)) {
        setInviteError("User is already a member or has a pending invitation");
      } else {
        setInviteError("Could not send the invitation. Please try again.");
      }
    } finally {
      setInviteSending(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentGroup) return;
    if (!requireFamilyTools()) return;
    setRemovingMember(true);
    try {
      await apiRequest(
        "DELETE",
        `/api/family/groups/${currentGroup.id}/members/${userId}`,
      );
      setMemberMenuId(null);
      await fetchGroups();
    } catch {
      setErrorMessage("Could not remove this member. Please try again.");
    } finally {
      setRemovingMember(false);
    }
  };

  const handleSaveGroupName = async () => {
    const trimmed = editGroupName.trim();
    if (!trimmed || !currentGroup) return;
    if (!requireFamilyTools()) return;
    setSavingGroupName(true);
    try {
      await apiRequest("PUT", `/api/family/groups/${currentGroup.id}`, {
        name: trimmed,
        userTier: currentPlan,
      });
      setShowSettings(false);
      await fetchGroups();
    } catch {
      setErrorMessage("Could not update the family name. Please try again.");
    } finally {
      setSavingGroupName(false);
    }
  };

  const handleRespondInvitation = async (
    invitationId: number,
    action: "accept" | "decline",
  ) => {
    try {
      await apiRequest(
        "POST",
        `/api/family/invitations/${invitationId}/respond`,
        { action },
      );
      await Promise.all([fetchInvitations(), fetchGroups()]);
    } catch {
      setErrorMessage("Could not update this invitation. Please try again.");
    }
  };

  const saveDuas = useCallback(async (updated: SharedDua[]) => {
    setDuas(updated);
    await syncedSetItem(DUAS_KEY, JSON.stringify(updated));
  }, []);

  const saveChallenges = useCallback(async (updated: GroupChallenge[]) => {
    setChallenges(updated);
    await syncedSetItem(CHALLENGES_KEY, JSON.stringify(updated));
  }, []);

  const recordFamilyProgress = useCallback(
    async ({
      category,
      title,
      value = 1,
      unit = "action",
      metadata = {},
    }: {
      category: string;
      title: string;
      value?: number;
      unit?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!currentGroup || !canUseFamilyTools) return;
      try {
        await apiRequest(
          "POST",
          `/api/family/groups/${currentGroup.id}/progress`,
          {
            category,
            title,
            value,
            unit,
            metadata,
          },
        );
        await fetchFamilyCollaboration(currentGroup.id);
      } catch {
        setFamilySyncIssue(
          "Family progress could not sync yet. We will keep your local view intact.",
        );
      }
    },
    [canUseFamilyTools, currentGroup, fetchFamilyCollaboration],
  );

  const handleSendDua = useCallback(async () => {
    const trimmed = newDua.trim();
    if (!trimmed) return;
    if (!requireFamilyTools()) return;
    const dua: SharedDua = {
      id: Date.now().toString(),
      from: authUser?.displayName || authUser?.username || "You",
      text: trimmed,
      timestamp: "Just now",
      liked: false,
      ameenCount: 0,
    };
    await saveDuas([dua, ...duas]);
    setNewDua("");
    await recordFamilyProgress({
      category: "dua",
      title: "Shared a family dua",
      value: 1,
      unit: "dua",
      metadata: { source: "family_dua" },
    });
  }, [
    newDua,
    requireFamilyTools,
    authUser,
    saveDuas,
    duas,
    recordFamilyProgress,
  ]);

  const handleSendFamilyMessage = useCallback(async () => {
    const trimmed = newFamilyMessage.trim();
    if (!trimmed || !currentGroup) return;
    if (!requireFamilyTools()) return;
    const retryDraft = pendingFamilyRetry;
    const optimisticId = retryDraft?.optimisticId ?? -Date.now();
    const clientMessageId =
      retryDraft?.clientMessageId ?? createFamilyClientMessageId();
    const optimisticMessage: FamilyMessage = {
      id: optimisticId,
      groupId: currentGroup.id,
      senderId: authUser?.id || "me",
      senderName: authUser?.displayName || null,
      senderUsername: authUser?.username || "You",
      kind: "message",
      content: trimmed,
      metadata: { clientMessageId },
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setSendingFamilyMessage(true);
    setErrorMessage("");
    setFamilyMessages((current) => {
      if (retryDraft) {
        return current.map((message) =>
          message.id === retryDraft.optimisticId ? optimisticMessage : message,
        );
      }
      return [...current, optimisticMessage];
    });
    setNewFamilyMessage("");
    scrollMessagesIntoView();
    if (ENABLE_QA_FAMILY_BYPASS && currentGroup.id === QA_FAMILY_GROUP.id) {
      setFamilyMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? {
                ...optimisticMessage,
                pending: false,
                createdAt: new Date().toISOString(),
              }
            : message,
        ),
      );
      setPendingFamilyRetry(null);
      setSendingFamilyMessage(false);
      setFamilySyncIssue("");
      scrollMessagesIntoView();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      return;
    }
    try {
      const response = await apiRequest(
        "POST",
        `/api/family/groups/${currentGroup.id}/messages`,
        {
          content: trimmed,
          kind: "message",
          metadata: { clientMessageId },
          userTier: currentPlan,
        },
      );
      const sentMessage = (await response.json()) as FamilyMessage;
      setFamilyMessages((current) =>
        current.map((message) =>
          message.id === optimisticId ? sentMessage : message,
        ),
      );
      await removeFamilyMessageOutboxItem(currentGroup.id, clientMessageId);
      setPendingFamilyRetry(null);
      void fetchFamilyCollaboration(currentGroup.id);
      scrollMessagesIntoView();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (error) {
      const queueable = isQueueableFamilySendError(error);
      const failedMessage = {
        ...optimisticMessage,
        pending: false,
        failed: true,
        queued: queueable,
      };
      setFamilyMessages((current) =>
        current.map((message) =>
          message.id === optimisticId ? failedMessage : message,
        ),
      );
      if (queueable) {
        await upsertFamilyMessageOutbox(currentGroup.id, failedMessage);
        setFamilySyncIssue(FAMILY_MESSAGE_QUEUED_COPY);
        setErrorMessage("");
      } else {
        setErrorMessage(
          getFamilySendErrorCopy(error, FAMILY_MESSAGE_SEND_ERROR),
        );
      }
      setPendingFamilyRetry(null);
    } finally {
      setSendingFamilyMessage(false);
    }
  }, [
    currentGroup,
    authUser?.displayName,
    authUser?.id,
    authUser?.username,
    currentPlan,
    fetchFamilyCollaboration,
    newFamilyMessage,
    pendingFamilyRetry,
    requireFamilyTools,
    scrollMessagesIntoView,
  ]);

  const prepareFamilyMessageRetry = useCallback(
    (message: FamilyMessage) => {
      const clientMessageId =
        typeof message.metadata?.clientMessageId === "string"
          ? message.metadata.clientMessageId
          : createFamilyClientMessageId();
      setFamilyMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, metadata: { ...item.metadata, clientMessageId } }
            : item,
        ),
      );
      setPendingFamilyRetry({
        optimisticId: message.id,
        clientMessageId,
      });
      setNewFamilyMessage(message.content);
      setErrorMessage("");
      setFamilySyncIssue(
        "Saved message ready. Edit it if needed, then send again.",
      );
      setActiveTab("messages");
      setFamilySection("chat");
      requestAnimationFrame(() => {
        messageInputRef.current?.focus();
        scrollMessagesIntoViewAfterKeyboard();
      });
    },
    [scrollMessagesIntoViewAfterKeyboard],
  );

  const handleMessageMember = useCallback(
    async (member: GroupMember) => {
      if (!requireFamilyTools()) return;
      const firstName = (
        member.displayName ||
        member.username ||
        "family"
      ).split(" ")[0];
      setActiveTab("messages");
      setFamilySection("chat");
      setMemberMenuId(null);
      setNewFamilyMessage((current) =>
        current.trim().length > 0 ? current : `Assalamu alaykum ${firstName}, `,
      );
      scrollMessagesIntoView();
      setTimeout(() => messageInputRef.current?.focus(), 300);
      try {
        await Haptics.selectionAsync();
      } catch {}
    },
    [requireFamilyTools, scrollMessagesIntoView],
  );

  const handleToggleLike = useCallback(
    (id: string) => {
      const updated = duas.map((d) =>
        d.id === id ? { ...d, liked: !d.liked } : d,
      );
      if (!requireFamilyTools()) return;
      saveDuas(updated);
    },
    [duas, requireFamilyTools, saveDuas],
  );

  const handleAmeen = useCallback(
    (id: string) => {
      const updated = duas.map((d) =>
        d.id === id ? { ...d, ameenCount: (d.ameenCount || 0) + 1 } : d,
      );
      if (!requireFamilyTools()) return;
      saveDuas(updated);
    },
    [duas, requireFamilyTools, saveDuas],
  );

  const handleCreateGoal = useCallback(() => {
    const trimmedTitle = goalTitle.trim();
    const trimmedDesc = goalDescription.trim();
    const targetNum = parseInt(goalTarget, 10);
    const daysNum = parseInt(goalDays, 10);
    const trimmedUnit = goalUnit.trim();
    if (!trimmedTitle || !targetNum || !daysNum || !trimmedUnit) return;
    if (!requireFamilyTools()) return;
    const newGoal: GroupChallenge = {
      id: Date.now().toString(),
      title: trimmedTitle,
      description: trimmedDesc || trimmedTitle,
      icon: "target",
      target: targetNum,
      current: 0,
      unit: trimmedUnit,
      daysLeft: daysNum,
    };
    saveChallenges([...challenges, newGoal]);
    setGoalTitle("");
    setGoalDescription("");
    setGoalTarget("");
    setGoalUnit("");
    setGoalDays("");
    setShowCreateGoal(false);
  }, [
    goalTitle,
    goalDescription,
    goalTarget,
    goalUnit,
    goalDays,
    challenges,
    requireFamilyTools,
    saveChallenges,
  ]);

  const handleIncrementProgress = useCallback(
    async (id: string) => {
      if (!requireFamilyTools()) return;
      const challenge = challenges.find((item) => item.id === id);
      const updated = challenges.map((c) =>
        c.id === id ? { ...c, current: Math.min(c.current + 1, c.target) } : c,
      );
      await saveChallenges(updated);
      if (challenge) {
        await recordFamilyProgress({
          category: "goal",
          title: challenge.title,
          value: 1,
          unit: challenge.unit,
          metadata: { challengeId: challenge.id },
        });
      }
    },
    [challenges, requireFamilyTools, saveChallenges, recordFamilyProgress],
  );

  const handleOpenQuranChallenge = useCallback(
    (challenge: GroupChallenge) => {
      const parsed = parseQuranChallengeReference(challenge.reference);
      Haptics.selectionAsync().catch(() => {});
      if (parsed) {
        navigation.navigate("QuranReader", parsed);
        return;
      }
      navigation.navigate("Main", { screen: "Quran" });
    },
    [navigation],
  );

  const handleQuickFamilyProgress = useCallback(
    async (
      category: "salah" | "quran" | "dhikr" | "charity" | "learning",
      title: string,
      unit = "action",
    ) => {
      if (!requireFamilyTools()) return;
      await recordFamilyProgress({
        category,
        title,
        value: 1,
        unit,
        metadata: { source: "family_quick_action" },
      });
      Haptics.selectionAsync().catch(() => {});
    },
    [recordFamilyProgress, requireFamilyTools],
  );

  const openInviteModal = () => {
    if (!requireFamilyTools()) return;
    setSearchQuery("");
    setSearchResults([]);
    setInviteMessage("");
    setInviteError("");
    setShowInviteModal(true);
  };

  const openAddPlaceModal = useCallback(() => {
    if (!requireFamilyTools()) return;
    setNewPlaceName("");
    setNewPlaceAddress("");
    setNewPlaceKind("custom");
    setShowAddPlaceModal(true);
  }, [requireFamilyTools]);

  const handleCreateFamilyPlace = useCallback(async () => {
    const name = newPlaceName.trim();
    if (!name || !currentGroup) return;
    if (!requireFamilyTools()) return;
    setFamilyPlaceSaving(true);
    setErrorMessage("");
    try {
      if (ENABLE_QA_FAMILY_BYPASS && currentGroup.id === QA_FAMILY_GROUP.id) {
        const now = new Date().toISOString();
        setFamilyPlaces((current) => [
          ...current,
          {
            id: -Date.now(),
            groupId: currentGroup.id,
            name,
            kind: newPlaceKind,
            address: newPlaceAddress.trim() || null,
            createdBy: authUser?.id || QA_FAMILY_USER.id,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      } else {
        const response = await apiRequest(
          "POST",
          `/api/family/groups/${currentGroup.id}/places`,
          {
            name,
            kind: newPlaceKind,
            address: newPlaceAddress.trim() || undefined,
          },
        );
        const place = (await response.json()) as FamilyPlace;
        setFamilyPlaces((current) => [...current, place]);
      }
      setShowAddPlaceModal(false);
      setPeopleSubsection("places");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (error) {
      setErrorMessage(
        getFamilySendErrorCopy(error, "Could not save this place."),
      );
    } finally {
      setFamilyPlaceSaving(false);
    }
  }, [
    authUser?.id,
    currentGroup,
    newPlaceAddress,
    newPlaceKind,
    newPlaceName,
    requireFamilyTools,
  ]);

  const handleSaveFamilyCheckIn = useCallback(
    async ({
      status,
      placeId = null,
      locationLabel,
      shareLocation = false,
      latitude = null,
      longitude = null,
      accuracyMeters = null,
    }: {
      status: "safe" | "at_place" | "shared_location";
      placeId?: number | null;
      locationLabel?: string;
      shareLocation?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      accuracyMeters?: number | null;
    }) => {
      if (!currentGroup || !requireFamilyTools()) return;
      setFamilyCheckInSaving(true);
      setErrorMessage("");
      try {
        if (ENABLE_QA_FAMILY_BYPASS && currentGroup.id === QA_FAMILY_GROUP.id) {
          const now = new Date().toISOString();
          const place = familyPlaces.find((item) => item.id === placeId);
          setFamilyCheckIns((current) => [
            ...current.filter(
              (item) => item.userId !== (authUser?.id || QA_FAMILY_USER.id),
            ),
            {
              id: -Date.now(),
              groupId: currentGroup.id,
              userId: authUser?.id || QA_FAMILY_USER.id,
              displayName: authUser?.displayName || QA_FAMILY_USER.displayName,
              username: authUser?.username || QA_FAMILY_USER.username,
              placeId,
              placeName: place?.name || null,
              status,
              locationLabel:
                locationLabel ||
                place?.name ||
                (status === "safe" ? "Safe" : "Checked in"),
              hasSharedLocation: shareLocation,
              latitude: shareLocation ? latitude : null,
              longitude: shareLocation ? longitude : null,
              accuracyMeters: shareLocation ? accuracyMeters : null,
              expiresAt: shareLocation
                ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
                : null,
              createdAt: now,
              updatedAt: now,
            },
          ]);
        } else {
          await apiRequest(
            "POST",
            `/api/family/groups/${currentGroup.id}/check-ins`,
            {
              status,
              placeId,
              locationLabel,
              shareLocation,
              latitude,
              longitude,
              accuracyMeters,
              shareMinutes: shareLocation ? 60 : undefined,
            },
          );
          await fetchFamilyPlaces(currentGroup.id);
        }
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      } catch (error) {
        setErrorMessage(
          getFamilySendErrorCopy(
            error,
            "Could not update your family check-in.",
          ),
        );
      } finally {
        setFamilyCheckInSaving(false);
      }
    },
    [
      authUser,
      currentGroup,
      familyPlaces,
      fetchFamilyPlaces,
      requireFamilyTools,
    ],
  );

  const handleCheckInAtPlace = useCallback(
    (place: FamilyPlace) => {
      void handleSaveFamilyCheckIn({
        status: "at_place",
        placeId: place.id,
        locationLabel: place.name,
      });
    },
    [handleSaveFamilyCheckIn],
  );

  const handleShareCurrentLocation = useCallback(async () => {
    if (!currentGroup || !requireFamilyTools()) return;
    setFamilyCheckInSaving(true);
    setErrorMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setErrorMessage(
          "Location sharing is off. Allow foreground location access only if you want to share where you are for one hour.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      let locationLabel = "Current location";
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        locationLabel =
          address?.city ||
          address?.subregion ||
          address?.district ||
          address?.region ||
          locationLabel;
      } catch {
        // The coordinate is still valid when reverse geocoding is unavailable.
      }

      await handleSaveFamilyCheckIn({
        status: "shared_location",
        locationLabel,
        shareLocation: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? null,
      });
    } catch (error) {
      setErrorMessage(
        getFamilySendErrorCopy(
          error,
          "We could not read your current location. Try again when location access is available.",
        ),
      );
    } finally {
      setFamilyCheckInSaving(false);
    }
  }, [currentGroup, handleSaveFamilyCheckIn, requireFamilyTools]);

  const handleClearFamilyCheckIn = useCallback(async () => {
    if (!currentGroup || !requireFamilyTools()) return;
    setFamilyCheckInSaving(true);
    setErrorMessage("");
    try {
      if (ENABLE_QA_FAMILY_BYPASS && currentGroup.id === QA_FAMILY_GROUP.id) {
        setFamilyCheckIns((current) =>
          current.filter(
            (item) => item.userId !== (authUser?.id || QA_FAMILY_USER.id),
          ),
        );
      } else {
        await apiRequest(
          "DELETE",
          `/api/family/groups/${currentGroup.id}/check-ins/me`,
        );
        setFamilyCheckIns((current) =>
          current.filter((item) => item.userId !== authUser?.id),
        );
      }
    } catch (error) {
      setErrorMessage(
        getFamilySendErrorCopy(error, "Could not clear your check-in."),
      );
    } finally {
      setFamilyCheckInSaving(false);
    }
  }, [authUser?.id, currentGroup, requireFamilyTools]);

  const handleRemoveFamilyPlace = useCallback(
    async (place: FamilyPlace) => {
      if (!currentGroup || !requireFamilyTools()) return;
      setErrorMessage("");
      try {
        if (ENABLE_QA_FAMILY_BYPASS && currentGroup.id === QA_FAMILY_GROUP.id) {
          setFamilyPlaces((current) =>
            current.filter((item) => item.id !== place.id),
          );
          setFamilyCheckIns((current) =>
            current.map((item) =>
              item.placeId === place.id
                ? { ...item, placeId: null, placeName: null }
                : item,
            ),
          );
          return;
        }
        await apiRequest(
          "DELETE",
          `/api/family/groups/${currentGroup.id}/places/${place.id}`,
        );
        setFamilyPlaces((current) =>
          current.filter((item) => item.id !== place.id),
        );
        setFamilyCheckIns((current) =>
          current.map((item) =>
            item.placeId === place.id
              ? { ...item, placeId: null, placeName: null }
              : item,
          ),
        );
      } catch (error) {
        setErrorMessage(
          getFamilySendErrorCopy(error, "Could not remove this place."),
        );
      }
    },
    [currentGroup, requireFamilyTools],
  );

  const FAMILY_NAV: {
    key: FamilySection;
    label: string;
    icon: AppIconName;
  }[] = [
    { key: "home", label: "Home", icon: "home" },
    { key: "people", label: "People", icon: "users" },
    { key: "together", label: "Together", icon: "heart" },
    { key: "chat", label: "Chat", icon: "message-circle" },
  ];

  const members = currentGroup ? currentGroup.members : [];
  const checkInByUserId = new Map(
    familyCheckIns.map((checkIn) => [checkIn.userId, checkIn]),
  );
  const currentFamilyCheckIn = authUser
    ? (() => {
        const checkIn = checkInByUserId.get(authUser.id);
        return checkIn && checkIn.status !== "expired" ? checkIn : null;
      })()
    : null;
  const familyLiveMapPoints = useMemo<FamilyLiveMapPoint[]>(
    () =>
      familyCheckIns
        .filter(
          (checkIn) =>
            checkIn.status === "shared_location" &&
            checkIn.hasSharedLocation &&
            checkIn.latitude !== null &&
            checkIn.longitude !== null &&
            (!checkIn.expiresAt ||
              new Date(checkIn.expiresAt).getTime() > Date.now()),
        )
        .map((checkIn) => ({
          id: String(checkIn.id),
          displayName: checkIn.displayName || checkIn.username,
          locationLabel: checkIn.locationLabel,
          latitude: checkIn.latitude as number,
          longitude: checkIn.longitude as number,
          isCurrentUser: checkIn.userId === authUser?.id,
        })),
    [authUser?.id, familyCheckIns],
  );
  const progressByUserId = new Map(
    familyProgressMembers.map((member) => [member.userId, member]),
  );
  const familyWeeklyActions = familyProgressMembers.reduce(
    (sum, member) => sum + member.actionCount,
    0,
  );
  const familyProgress =
    challenges.length > 0
      ? Math.round(
          (challenges.reduce((sum, challenge) => {
            if (challenge.target <= 0) return sum;
            return sum + Math.min(1, challenge.current / challenge.target);
          }, 0) /
            challenges.length) *
            100,
        )
      : 0;
  const nextFamilyGoal =
    challenges.find((challenge) => challenge.current < challenge.target) ??
    challenges[0] ??
    null;
  const latestDua = duas[0] ?? null;
  const topFamilyMember =
    [...familyProgressMembers].sort(
      (a, b) => b.actionCount - a.actionCount || b.totalValue - a.totalValue,
    )[0] ?? null;
  const familyCategoryCounts = familyActivity.reduce<Record<string, number>>(
    (acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    },
    {},
  );
  const topFamilyCategory =
    Object.entries(familyCategoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;
  const weeklySummaryLine =
    familyWeeklyActions > 0
      ? `${familyWeeklyActions} shared actions this week${
          topFamilyCategory ? `, led by ${topFamilyCategory}` : ""
        }.`
      : "Start this week with one shared action from the family.";

  const modalOverlay: any = {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  };

  const modalBox: any = {
    width: "100%",
    backgroundColor: theme.surfaceGlass,
    borderRadius: 24,
    padding: Spacing.xl,
    maxHeight: "80%",
  };

  const modalInput: any = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 14,
    color: theme.text,
    marginBottom: Spacing.md,
  };

  const modalBtnPrimary: any = {
    backgroundColor: theme.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.sm,
  };

  const modalBtnCancel: any = {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  };

  if (authLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (authChecked && !authUser) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} testID="button-back">
            <AppIcon name="arrow-left" size={24} color={theme.icon} />
          </Pressable>
          <View style={{ alignItems: "center", gap: Spacing.xs }}>
            <ThemedText type="h3">Family Circle</ThemedText>
            {!canUseFamilyTools ? <PremiumBadge tier="premium" /> : null}
          </View>
          <View style={{ width: 24 }} />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: Spacing.xl,
          }}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ alignItems: "center" }}
          >
            <View
              style={[
                styles.signInIcon,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <AppIcon name="users" size={48} color={theme.primary} />
            </View>
            <ThemedText
              type="h2"
              style={{ textAlign: "center", marginTop: Spacing.xl }}
            >
              Sign in to use Family Circle
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.md,
              }}
            >
              Connect with your family members, share duas, and track goals
              together.
            </ThemedText>
            <Pressable
              testID="button-sign-in"
              style={[styles.signInBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate("Auth")}
            >
              <AppIcon name="log-in" size={18} color="#FFF" />
              <ThemedText
                type="body"
                style={{
                  color: "#FFF",
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                }}
              >
                Sign In
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  if (groupsLoading && groups.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} testID="button-back">
            <AppIcon name="arrow-left" size={24} color={theme.icon} />
          </Pressable>
          <ThemedText type="h3">Family Circle</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!currentGroup) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} testID="button-back">
            <AppIcon name="arrow-left" size={24} color={theme.icon} />
          </Pressable>
          <ThemedText type="h3">Family Circle</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {invitations.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              {invitations.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.invitationCard,
                    {
                      backgroundColor: theme.primaryMuted,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{inv.groupName}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                    >
                      Invited by {inv.inviterName || "a member"}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                    <Pressable
                      testID={`button-accept-${inv.id}`}
                      style={[
                        styles.inviteResponseBtn,
                        { backgroundColor: theme.primary },
                      ]}
                      onPress={() => handleRespondInvitation(inv.id, "accept")}
                    >
                      <AppIcon name="check" size={16} color="#FFF" />
                    </Pressable>
                    <Pressable
                      testID={`button-decline-${inv.id}`}
                      style={[
                        styles.inviteResponseBtn,
                        { backgroundColor: theme.error },
                      ]}
                      onPress={() => handleRespondInvitation(inv.id, "decline")}
                    >
                      <AppIcon name="x" size={16} color="#FFF" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createCard}
            >
              <View style={styles.createCardIcon}>
                <FamilyIconSvg
                  size={46}
                  color="rgba(255,255,255,0.95)"
                  accentColor={theme.scholar}
                />
              </View>
              <ThemedText
                type="h2"
                style={{
                  color: theme.buttonText,
                  textAlign: "center",
                  marginTop: Spacing.lg,
                }}
              >
                Create Your Family Circle
              </ThemedText>
              <ThemedText
                type="body"
                style={{
                  color: "rgba(255,255,255,0.8)",
                  textAlign: "center",
                  marginTop: Spacing.sm,
                }}
              >
                Start a family group to share duas, track goals, and stay
                connected.
              </ThemedText>
              {!canUseFamilyTools ? (
                <View style={{ marginTop: Spacing.md }}>
                  <PremiumBadge tier="premium" />
                </View>
              ) : null}
              <TextInput
                style={[
                  styles.createInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                placeholder="Enter family group name"
                placeholderTextColor={theme.textMuted}
                value={newGroupName}
                onChangeText={setNewGroupName}
                testID="input-create-group"
              />
              <Pressable
                testID="button-create-group"
                style={styles.createBtn}
                onPress={handleCreateGroup}
                disabled={creatingGroup}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <ThemedText
                    type="body"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    {canUseFamilyTools
                      ? "Create Group"
                      : "Unlock Family Circle"}
                  </ThemedText>
                )}
              </Pressable>
              {errorMessage ? (
                <ThemedText
                  type="caption"
                  style={{
                    color: "#FEE2E2",
                    textAlign: "center",
                    marginTop: Spacing.sm,
                  }}
                >
                  {errorMessage}
                </ThemedText>
              ) : null}
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const renderMessageComposer = () => (
    <View
      style={[
        styles.messageComposer,
        {
          backgroundColor: "transparent",
          borderColor: messageComposerFocused
            ? `${theme.primary}55`
            : theme.borderSubtle,
        },
      ]}
    >
      <NuraiGlass
        pointerEvents="none"
        interactive
        radius={20}
        tint={
          messageComposerFocused
            ? `${theme.primary}1A`
            : "rgba(10, 28, 29, 0.64)"
        }
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.messageComposerIcon,
          { backgroundColor: theme.primaryMuted },
        ]}
      >
        <AppIcon name="message-circle" size={18} color={theme.primary} />
      </View>
      <TextInput
        ref={messageInputRef}
        style={[styles.messageInput, { color: theme.text }]}
        placeholder="Send a family reminder or encouragement"
        placeholderTextColor={theme.textMuted}
        value={newFamilyMessage}
        onChangeText={setNewFamilyMessage}
        onFocus={() => {
          setMessageComposerFocused(true);
          scrollMessagesIntoViewAfterKeyboard();
          setTimeout(scrollMessagesIntoViewAfterKeyboard, 180);
          setTimeout(scrollMessagesIntoViewAfterKeyboard, 420);
        }}
        onBlur={() => setMessageComposerFocused(false)}
        multiline
        maxLength={600}
        blurOnSubmit={false}
        textAlignVertical="top"
        returnKeyType="send"
        onSubmitEditing={() => {
          if (newFamilyMessage.trim()) {
            handleSendFamilyMessage();
          }
        }}
        accessibilityLabel="Family message"
        accessibilityHint="Write a private message to your family circle"
        testID="input-family-message"
      />
      <Pressable
        style={[
          styles.messageSendButton,
          {
            backgroundColor: theme.primary,
            opacity:
              sendingFamilyMessage || !newFamilyMessage.trim() ? 0.55 : 1,
          },
        ]}
        disabled={sendingFamilyMessage || !newFamilyMessage.trim()}
        onPress={handleSendFamilyMessage}
        testID="button-send-family-message"
      >
        {sendingFamilyMessage ? (
          <ActivityIndicator size="small" color={theme.buttonText} />
        ) : (
          <AppIcon name="send" size={16} color={theme.buttonText} />
        )}
      </Pressable>
    </View>
  );

  const groupName = currentGroup.name;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          testID="button-back"
          style={[
            styles.headerIconButton,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <AppIcon name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText type="h3" style={{ color: theme.text }}>
            Family Circle
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Your people, together
          </ThemedText>
          {!canUseFamilyTools ? <PremiumBadge tier="premium" /> : null}
        </View>
        {isCreator ? (
          <Pressable
            testID="button-settings"
            onPress={() => {
              setEditGroupName(groupName);
              setShowSettings(true);
            }}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="settings" size={20} color={theme.primary} />
          </Pressable>
        ) : (
          <View style={[styles.headerIconButton, { opacity: 0 }]} />
        )}
      </View>

      <Animated.View
        entering={FadeInDown.delay(80).duration(360)}
        style={styles.tabRow}
      >
        <NuraiSegmentedControl
          value={familySection}
          onChange={(value) => navigateFamilySection(value as FamilySection)}
          options={FAMILY_NAV.map((tab) => ({
            id: tab.key,
            label:
              tab.key === "people" && invitations.length > 0
                ? `${tab.label} ${invitations.length}`
                : tab.label,
            icon: tab.icon,
            testID: `tab-${tab.key}`,
          }))}
          testID="family-circle-tabs"
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={familyKeyboardOffset}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                familySection === "chat"
                  ? scrollBottomPadding
                  : insets.bottom + scrollBottomPadding,
            },
          ]}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {invitations.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              {invitations.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.invitationCard,
                    {
                      backgroundColor: theme.primaryMuted,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{inv.groupName}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                    >
                      Invited by {inv.inviterName || "a member"}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                    <Pressable
                      testID={`button-accept-${inv.id}`}
                      style={[
                        styles.inviteResponseBtn,
                        { backgroundColor: theme.primary },
                      ]}
                      onPress={() => handleRespondInvitation(inv.id, "accept")}
                    >
                      <AppIcon name="check" size={16} color="#FFF" />
                    </Pressable>
                    <Pressable
                      testID={`button-decline-${inv.id}`}
                      style={[
                        styles.inviteResponseBtn,
                        { backgroundColor: theme.error },
                      ]}
                      onPress={() => handleRespondInvitation(inv.id, "decline")}
                    >
                      <AppIcon name="x" size={16} color="#FFF" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Animated.View>
          ) : null}

          {familySection === "home" ? (
            <Animated.View
              entering={FadeInDown.duration(320)}
              testID="family-circle-home"
            >
              <View
                style={[
                  styles.familyHomeSurface,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <View style={styles.familyHomeEyebrow}>
                  <View
                    style={[
                      styles.familyHomeStatusDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    PRIVATE FAMILY CIRCLE
                  </ThemedText>
                </View>
                <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                  Everyone is connected.
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ color: theme.textSecondary, marginTop: 6 }}
                >
                  A simple place to check in, encourage one another, and keep
                  your shared intentions close.
                </ThemedText>

                <View style={styles.familyHomeMetricRow}>
                  <View style={styles.familyHomeMetric}>
                    <ThemedText type="h3">{members.length}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      People
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.familyHomeMetricDivider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <View style={styles.familyHomeMetric}>
                    <ThemedText type="h3">{familyWeeklyActions}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Shared this week
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.familyHomeMetricDivider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <View style={styles.familyHomeMetric}>
                    <ThemedText type="h3">{familyMessages.length}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Messages
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  onPress={() => navigateFamilySection("chat")}
                  style={({ pressed }) => [
                    styles.familyHomePrimaryAction,
                    {
                      backgroundColor: theme.primary,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  testID="button-family-home-message"
                  accessibilityRole="button"
                  accessibilityLabel="Open family chat"
                >
                  <AppIcon
                    name="message-circle"
                    size={17}
                    color={theme.buttonText}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: theme.buttonText, fontWeight: "800" }}
                  >
                    Message the family
                  </ThemedText>
                  <AppIcon
                    name="arrow-right"
                    size={16}
                    color={theme.buttonText}
                  />
                </Pressable>

                <View style={styles.familyHomeSecondaryActions}>
                  <Pressable
                    onPress={openInviteModal}
                    style={({ pressed }) => [
                      styles.familyHomeSecondaryAction,
                      {
                        borderColor: theme.borderSubtle,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                    testID="button-family-home-invite"
                  >
                    <AppIcon name="user-plus" size={15} color={theme.primary} />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.text, fontWeight: "700" }}
                    >
                      Invite someone
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => navigateFamilySection("together")}
                    style={({ pressed }) => [
                      styles.familyHomeSecondaryAction,
                      {
                        borderColor: theme.borderSubtle,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                    testID="button-family-home-together"
                  >
                    <AppIcon name="heart" size={15} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.text, fontWeight: "700" }}
                    >
                      Shared intentions
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={styles.familyHomeSectionHeader}>
                <View>
                  <ThemedText type="h4">Your people</ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 2 }}
                  >
                    Everyone in this circle
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => navigateFamilySection("people")}
                  testID="button-family-home-people"
                  accessibilityRole="button"
                  accessibilityLabel="View all family members"
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    View all
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.familyHomePeopleList}>
                {members.slice(0, 3).map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      styles.familyHomePersonRow,
                      index < Math.min(members.length, 3) - 1
                        ? {
                            borderBottomColor: theme.borderSubtle,
                            borderBottomWidth: 1,
                          }
                        : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.familyHomePersonAvatar,
                        {
                          backgroundColor: `${theme.primary}1A`,
                          borderColor: `${theme.primary}35`,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{ color: theme.primary, fontWeight: "800" }}
                      >
                        {(member.displayName ||
                          member.username ||
                          "U")[0].toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="small"
                        style={{ fontWeight: "700" }}
                        numberOfLines={1}
                      >
                        {member.displayName || member.username}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 2 }}
                      >
                        {member.role === "creator"
                          ? "Circle owner"
                          : "Family member"}
                      </ThemedText>
                    </View>
                    <View style={styles.familyHomePersonStatus}>
                      <View
                        style={[
                          styles.familyHomeStatusDot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        Connected
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={openFamilyPlaces}
                style={({ pressed }) => [
                  styles.familyHomeNextRow,
                  {
                    borderColor: theme.borderSubtle,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
                testID="button-family-home-places"
                accessibilityRole="button"
                accessibilityLabel="Open family places and check-ins"
              >
                <View
                  style={[
                    styles.familyHomeNextIcon,
                    { backgroundColor: theme.primaryMuted },
                  ]}
                >
                  <AppIcon name="map-pin" size={16} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    PLACES & CHECK-INS
                  </ThemedText>
                  <ThemedText type="small" style={{ marginTop: 3 }}>
                    {familyPlaces.length > 0
                      ? `${familyPlaces.length} saved place${familyPlaces.length === 1 ? "" : "s"} · share only when you choose`
                      : "Save the places your family uses most"}
                  </ThemedText>
                </View>
                <AppIcon name="arrow-right" size={16} color={theme.textMuted} />
              </Pressable>

              <Pressable
                onPress={openFamilyLiveView}
                style={({ pressed }) => [
                  styles.familyHomeNextRow,
                  {
                    borderColor: theme.borderSubtle,
                    opacity: pressed ? 0.76 : 1,
                    marginTop: Spacing.sm,
                  },
                ]}
                testID="button-family-home-live"
                accessibilityRole="button"
                accessibilityLabel="Open live family view"
              >
                <View
                  style={[
                    styles.familyHomeNextIcon,
                    { backgroundColor: theme.scholarSoft },
                  ]}
                >
                  <AppIcon name="navigation" size={16} color={theme.scholar} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    LIVE VIEW
                  </ThemedText>
                  <ThemedText type="small" style={{ marginTop: 3 }}>
                    {familyLiveMapPoints.length > 0
                      ? `${familyLiveMapPoints.length} member${familyLiveMapPoints.length === 1 ? "" : "s"} sharing now`
                      : "See the circle when someone shares for one hour"}
                  </ThemedText>
                </View>
                <AppIcon name="arrow-right" size={16} color={theme.textMuted} />
              </Pressable>

              {nextFamilyGoal || latestDua ? (
                <Pressable
                  onPress={() => navigateFamilySection("together")}
                  style={({ pressed }) => [
                    styles.familyHomeNextRow,
                    {
                      borderColor: theme.borderSubtle,
                      opacity: pressed ? 0.76 : 1,
                    },
                  ]}
                  testID="button-family-home-next"
                >
                  <View
                    style={[
                      styles.familyHomeNextIcon,
                      { backgroundColor: theme.scholarSoft },
                    ]}
                  >
                    <AppIcon
                      name={nextFamilyGoal ? "target" : "heart"}
                      size={16}
                      color={theme.scholar}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      {nextFamilyGoal ? "NEXT TOGETHER" : "LATEST DUA"}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ marginTop: 3 }}
                      numberOfLines={1}
                    >
                      {nextFamilyGoal ? nextFamilyGoal.title : latestDua?.text}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name="arrow-right"
                    size={16}
                    color={theme.textMuted}
                  />
                </Pressable>
              ) : null}
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.hiddenOverview}
          >
            <LinearGradient
              colors={["#062D20", "#0A3D2A", "#061A14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, { borderColor: `${theme.scholar}42` }]}
            >
              <View style={styles.heroTop}>
                <View>
                  <ThemedText type="h2" style={{ color: theme.text }}>
                    {groupName}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 2 }}
                  >
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"} · growing
                    together
                  </ThemedText>
                </View>
                <View style={styles.heroAvatars}>
                  {members.slice(0, 3).map((m, i) => (
                    <View
                      key={m.id}
                      style={[
                        styles.heroAvatar,
                        {
                          backgroundColor:
                            AVATAR_COLORS[i % AVATAR_COLORS.length],
                          marginLeft: i > 0 ? -8 : 0,
                          zIndex: 3 - i,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: "#FFF", fontWeight: "700" }}
                      >
                        {(m.displayName || m.username || "U")[0].toUpperCase()}
                      </ThemedText>
                    </View>
                  ))}
                  {members.length > 3 ? (
                    <View
                      style={[
                        styles.heroAvatar,
                        {
                          backgroundColor: "rgba(255,255,255,0.3)",
                          marginLeft: -8,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: "#FFF", fontWeight: "700" }}
                      >
                        +{members.length - 3}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
              <GoldDivider
                color={theme.scholar}
                opacity={0.65}
                style={styles.heroGoldDivider}
              />
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <AppIcon name="users" size={16} color={theme.primary} />
                  <ThemedText
                    type="h3"
                    style={{ color: theme.text, marginTop: 4 }}
                  >
                    {members.length}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, fontSize: 10 }}
                  >
                    Members
                  </ThemedText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <AppIcon name="heart" size={16} color={theme.scholar} />
                  <ThemedText
                    type="h3"
                    style={{ color: theme.text, marginTop: 4 }}
                  >
                    {duas.length}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, fontSize: 10 }}
                  >
                    Shared Duas
                  </ThemedText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <AppIcon name="target" size={16} color={theme.primary} />
                  <ThemedText
                    type="h3"
                    style={{ color: theme.text, marginTop: 4 }}
                  >
                    {challenges.length}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, fontSize: 10 }}
                  >
                    Goals
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).duration(400)}
            style={styles.hiddenOverview}
          >
            <View
              style={[
                styles.familyCommandPanel,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.familyCommandHeader}>
                <View style={styles.familyCommandTitleRow}>
                  <View
                    style={[
                      styles.familyCommandIcon,
                      { backgroundColor: theme.primaryMuted },
                    ]}
                  >
                    <AppIcon name="shield" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="h4">Family Pulse</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      A private space for shared goals, duas, and gentle
                      accountability.
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.familyPlanBadge,
                    {
                      borderColor: canUseFamilyTools
                        ? theme.primaryBorder
                        : theme.scholar,
                      backgroundColor: canUseFamilyTools
                        ? theme.primarySubtle
                        : theme.scholarSoft,
                    },
                  ]}
                >
                  <AppIcon
                    name={canUseFamilyTools ? "check-circle" : "lock"}
                    size={12}
                    color={canUseFamilyTools ? theme.primary : theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: canUseFamilyTools ? theme.primary : theme.scholar,
                      fontWeight: "700",
                    }}
                  >
                    {canUseFamilyTools ? "Private" : "Premium"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.familyMetricGrid}>
                <View
                  style={[
                    styles.familyMetricCard,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <AppIcon name="users" size={16} color={theme.primary} />
                  <ThemedText type="h3" style={{ marginTop: 5 }}>
                    {members.length}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Members
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.familyMetricCard,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <AppIcon name="activity" size={16} color={theme.scholar} />
                  <ThemedText type="h3" style={{ marginTop: 5 }}>
                    {familyWeeklyActions}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    This week
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.familyMetricCard,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <AppIcon name="heart" size={16} color={theme.primary} />
                  <ThemedText type="h3" style={{ marginTop: 5 }}>
                    {duas.length}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Shared duas
                  </ThemedText>
                </View>
              </View>

              <View style={styles.familyProgressBlock}>
                <View style={styles.familyProgressCopyRow}>
                  <ThemedText type="small" style={{ fontWeight: "700" }}>
                    Weekly family growth
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    {familyProgress}%
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.familyProgressTrack,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View
                    style={[
                      styles.familyProgressFill,
                      {
                        width: `${familyProgress}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.familyActionRail}>
                <Pressable
                  onPress={openInviteModal}
                  style={[
                    styles.familyRailAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-quick-invite"
                >
                  <AppIcon name="user-plus" size={16} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    Invite
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("duas")}
                  style={[
                    styles.familyRailAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-quick-dua"
                >
                  <AppIcon name="heart" size={16} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    Share dua
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setShowCreateGoal(true)}
                  style={[
                    styles.familyRailAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-quick-goal"
                >
                  <AppIcon name="plus-circle" size={16} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    New goal
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(120).duration(400)}
            style={styles.hiddenOverview}
          >
            <View
              style={[
                styles.familyInsightStrip,
                {
                  backgroundColor: theme.scholarSoft,
                  borderColor: theme.scholar,
                },
              ]}
            >
              <AppIcon
                name={nextFamilyGoal ? "trending-up" : "message-circle"}
                size={18}
                color={theme.scholar}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="small"
                  style={{ color: theme.text, fontWeight: "700" }}
                  numberOfLines={1}
                >
                  {nextFamilyGoal
                    ? `Next together: ${nextFamilyGoal.title}`
                    : latestDua
                      ? `Latest dua from ${latestDua.from}`
                      : "Start with one shared family intention"}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {nextFamilyGoal
                    ? `${nextFamilyGoal.current}/${nextFamilyGoal.target} ${nextFamilyGoal.unit} complete. Tap Goals to update progress.`
                    : latestDua
                      ? latestDua.text
                      : "Invite family, choose a goal, and keep the connection gentle."}
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.hiddenOverview}
          >
            <View
              style={[
                styles.weeklySummaryCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.weeklySummaryHeader}>
                <View
                  style={[
                    styles.weeklySummaryIcon,
                    { backgroundColor: theme.primaryMuted },
                  ]}
                >
                  <AppIcon name="bar-chart-2" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="h4">Weekly family summary</ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {weeklySummaryLine}
                  </ThemedText>
                </View>
                {topFamilyMember ? (
                  <View
                    style={[
                      styles.weeklySummaryBadge,
                      {
                        borderColor: theme.scholar,
                        backgroundColor: theme.scholarSoft,
                      },
                    ]}
                  >
                    <AppIcon name="award" size={12} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.scholar,
                        fontWeight: "800",
                        fontSize: 10,
                      }}
                      numberOfLines={1}
                    >
                      {
                        (
                          topFamilyMember.displayName ||
                          topFamilyMember.username ||
                          "Member"
                        ).split(" ")[0]
                      }
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={styles.weeklySummaryGrid}>
                <View
                  style={[
                    styles.weeklySummaryMetric,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <ThemedText type="h3">{familyWeeklyActions}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Actions
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.weeklySummaryMetric,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <ThemedText type="h3">{familyMessages.length}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Messages
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.weeklySummaryMetric,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <ThemedText type="h3">{familyActivity.length}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Updates
                  </ThemedText>
                </View>
              </View>

              <View style={styles.weeklyQuickActions}>
                <Pressable
                  onPress={() => setActiveTab("messages")}
                  style={[
                    styles.weeklyQuickAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-summary-message"
                >
                  <AppIcon
                    name="message-circle"
                    size={14}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Message
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    handleQuickFamilyProgress("quran", "Read Quran together")
                  }
                  style={[
                    styles.weeklyQuickAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-summary-quran"
                >
                  <AppIcon name="book-open" size={14} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Quran
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    handleQuickFamilyProgress("salah", "Protected salah")
                  }
                  style={[
                    styles.weeklyQuickAction,
                    { borderColor: theme.primaryBorder },
                  ]}
                  testID="button-family-summary-salah"
                >
                  <AppIcon name="clock" size={14} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Salah
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {errorMessage && familySection !== "chat" ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                },
              ]}
            >
              <AppIcon name="alert-circle" size={16} color={theme.error} />
              <ThemedText
                type="small"
                style={{ color: theme.error, flex: 1, marginLeft: Spacing.sm }}
              >
                {errorMessage}
              </ThemedText>
              <Pressable onPress={() => setErrorMessage("")}>
                <AppIcon name="x" size={16} color={theme.error} />
              </Pressable>
            </View>
          ) : null}

          {activeTab === "members" && familySection === "people" ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View style={styles.familyPeopleHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4">
                    {peopleSubsection === "members"
                      ? "Your people"
                      : peopleSubsection === "live"
                        ? "Live view"
                        : "Places & check-ins"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 3 }}
                  >
                    {peopleSubsection === "members"
                      ? "See shared progress without a noisy feed."
                      : peopleSubsection === "live"
                        ? "See only the current locations people chose to share."
                        : "A calm, consent-led way to know the family is okay."}
                  </ThemedText>
                </View>
                <View style={styles.familyPeopleSwitcher}>
                  <Pressable
                    onPress={() => setPeopleSubsection("members")}
                    style={[
                      styles.familyPeopleSwitch,
                      peopleSubsection === "members"
                        ? {
                            backgroundColor: theme.primaryMuted,
                            borderColor: theme.primaryBorder,
                          }
                        : { borderColor: theme.borderSubtle },
                    ]}
                    testID="button-family-people-members"
                  >
                    <AppIcon
                      name="users"
                      size={13}
                      color={
                        peopleSubsection === "members"
                          ? theme.primary
                          : theme.textMuted
                      }
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          peopleSubsection === "members"
                            ? theme.primary
                            : theme.textMuted,
                        fontWeight: "800",
                      }}
                    >
                      People
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setPeopleSubsection("live")}
                    style={[
                      styles.familyPeopleSwitch,
                      peopleSubsection === "live"
                        ? {
                            backgroundColor: theme.primaryMuted,
                            borderColor: theme.primaryBorder,
                          }
                        : { borderColor: theme.borderSubtle },
                    ]}
                    testID="button-family-people-live"
                  >
                    <AppIcon
                      name="navigation"
                      size={13}
                      color={
                        peopleSubsection === "live"
                          ? theme.primary
                          : theme.textMuted
                      }
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          peopleSubsection === "live"
                            ? theme.primary
                            : theme.textMuted,
                        fontWeight: "800",
                      }}
                    >
                      Live
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setPeopleSubsection("places")}
                    style={[
                      styles.familyPeopleSwitch,
                      peopleSubsection === "places"
                        ? {
                            backgroundColor: theme.primaryMuted,
                            borderColor: theme.primaryBorder,
                          }
                        : { borderColor: theme.borderSubtle },
                    ]}
                    testID="button-family-people-places"
                  >
                    <AppIcon
                      name="map-pin"
                      size={13}
                      color={
                        peopleSubsection === "places"
                          ? theme.primary
                          : theme.textMuted
                      }
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          peopleSubsection === "places"
                            ? theme.primary
                            : theme.textMuted,
                        fontWeight: "800",
                      }}
                    >
                      Places
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {peopleSubsection === "members" ? (
                <>
                  {members.map((member, idx) => {
                    const progress = progressByUserId.get(member.userId);
                    const checkIn = checkInByUserId.get(member.userId);
                    return (
                      <View
                        key={member.id}
                        style={[
                          styles.memberCard,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.memberAvatar,
                            {
                              backgroundColor: `${theme.primary}1F`,
                              borderColor: `${theme.primary}55`,
                            },
                          ]}
                        >
                          <ThemedText
                            type="h4"
                            style={{ color: theme.primary }}
                          >
                            {(member.displayName ||
                              member.username ||
                              "U")[0].toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <ThemedText type="h4">
                              {member.displayName || member.username}
                            </ThemedText>
                            {member.role === "creator" ? (
                              <View
                                style={[
                                  styles.roleBadge,
                                  { backgroundColor: theme.primaryMuted },
                                ]}
                              >
                                <ThemedText
                                  type="caption"
                                  style={{ color: theme.primary, fontSize: 10 }}
                                >
                                  Creator
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted, marginTop: 2 }}
                          >
                            @{member.username}
                          </ThemedText>
                          <View style={styles.memberProgressRow}>
                            <AppIcon
                              name="activity"
                              size={12}
                              color={progress ? theme.primary : theme.textMuted}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: progress
                                  ? theme.primary
                                  : theme.textMuted,
                                fontSize: 11,
                              }}
                              numberOfLines={1}
                            >
                              {checkIn && checkIn.status !== "expired"
                                ? `${checkIn.locationLabel} · ${
                                    checkIn.status === "shared_location"
                                      ? "shared for a limited time"
                                      : "checked in"
                                  }`
                                : progress
                                  ? `${progress.actionCount} actions this week`
                                  : "No shared progress yet"}
                            </ThemedText>
                          </View>
                          {progress?.categories.length ? (
                            <View style={styles.memberCategoryChips}>
                              {progress.categories
                                .slice(0, 3)
                                .map((category) => (
                                  <View
                                    key={category}
                                    style={[
                                      styles.memberCategoryChip,
                                      {
                                        backgroundColor: `${theme.primary}12`,
                                        borderColor: `${theme.primary}30`,
                                      },
                                    ]}
                                  >
                                    <ThemedText
                                      type="caption"
                                      numberOfLines={1}
                                      style={{
                                        color: theme.primary,
                                        fontSize: 10,
                                        fontWeight: "800",
                                      }}
                                    >
                                      {category}
                                    </ThemedText>
                                  </View>
                                ))}
                            </View>
                          ) : null}
                        </View>
                        {member.userId !== authUser?.id ? (
                          <Pressable
                            testID={`button-message-member-${member.userId}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Mention ${
                              member.displayName || member.username
                            } in family chat`}
                            accessibilityHint="This opens the shared family conversation; every family member can see the message"
                            onPress={() => handleMessageMember(member)}
                            style={({ pressed }) => [
                              styles.memberMessageButton,
                              {
                                backgroundColor: `${theme.primary}12`,
                                borderColor: `${theme.primary}35`,
                              },
                              pressed ? { opacity: 0.68 } : null,
                            ]}
                          >
                            <AppIcon
                              name="message-circle"
                              size={15}
                              color={theme.primary}
                            />
                          </Pressable>
                        ) : null}
                        {isCreator && member.role !== "creator" ? (
                          <View>
                            <Pressable
                              onPress={() =>
                                setMemberMenuId(
                                  memberMenuId === member.userId
                                    ? null
                                    : member.userId,
                                )
                              }
                              hitSlop={8}
                              testID={`button-member-menu-${member.userId}`}
                            >
                              <AppIcon
                                name="more-vertical"
                                size={18}
                                color={theme.textMuted}
                              />
                            </Pressable>
                            {memberMenuId === member.userId ? (
                              <View
                                style={[
                                  styles.memberMenu,
                                  {
                                    backgroundColor: theme.surfaceGlass,
                                    borderColor: theme.border,
                                  },
                                ]}
                              >
                                <Pressable
                                  style={styles.memberMenuItem}
                                  onPress={() =>
                                    handleRemoveMember(member.userId)
                                  }
                                  disabled={removingMember}
                                  testID={`button-remove-${member.userId}`}
                                >
                                  {removingMember ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={theme.error}
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      <AppIcon
                                        name="user-minus"
                                        size={14}
                                        color={theme.error}
                                      />
                                      <ThemedText
                                        type="caption"
                                        style={{
                                          color: theme.error,
                                          marginLeft: 8,
                                        }}
                                      >
                                        Remove
                                      </ThemedText>
                                    </View>
                                  )}
                                </Pressable>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  <Pressable
                    style={[styles.addMemberBtn, { borderColor: theme.border }]}
                    testID="button-add-member"
                    onPress={openInviteModal}
                  >
                    <AppIcon name="user-plus" size={20} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{ color: theme.primary, marginLeft: Spacing.sm }}
                    >
                      Invite Family Member
                    </ThemedText>
                  </Pressable>
                </>
              ) : peopleSubsection === "live" ? (
                <FamilyLiveView
                  points={familyLiveMapPoints}
                  lastRefreshedAt={familyPlacesRefreshedAt}
                  isRefreshing={familyPlacesLoading}
                  onRefresh={() => {
                    if (currentGroup) void fetchFamilyPlaces(currentGroup.id);
                  }}
                  onShareLocation={() => void handleShareCurrentLocation()}
                />
              ) : (
                <View>
                  <View
                    style={[
                      styles.familyPlacesPrivacyCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.familyPlacesPrivacyIcon,
                        { backgroundColor: theme.primaryMuted },
                      ]}
                    >
                      <AppIcon name="shield" size={17} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="small" style={{ fontWeight: "800" }}>
                        You stay in control
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textMuted,
                          marginTop: 3,
                          lineHeight: 18,
                        }}
                      >
                        Saved places are labels. Current location is shared only
                        after you allow it, for up to one hour.
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.familyCheckInCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.familyCheckInCardHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="h4">Your check-in</ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, marginTop: 3 }}
                        >
                          {currentFamilyCheckIn
                            ? currentFamilyCheckIn.status === "shared_location"
                              ? `${currentFamilyCheckIn.locationLabel} · ends ${new Date(currentFamilyCheckIn.expiresAt || "").toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                              : currentFamilyCheckIn.locationLabel
                            : "Let the circle know you are okay."}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.familyCheckInStatus,
                          {
                            backgroundColor: currentFamilyCheckIn
                              ? theme.primaryMuted
                              : theme.surfaceElevated,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.familyHomeStatusDot,
                            {
                              backgroundColor: currentFamilyCheckIn
                                ? theme.primary
                                : theme.textMuted,
                            },
                          ]}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: currentFamilyCheckIn
                              ? theme.primary
                              : theme.textMuted,
                            fontWeight: "800",
                          }}
                        >
                          {currentFamilyCheckIn ? "Visible" : "Off"}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.familyCheckInActions}>
                      <Pressable
                        onPress={() =>
                          void handleSaveFamilyCheckIn({ status: "safe" })
                        }
                        style={[
                          styles.familyCheckInAction,
                          { borderColor: theme.borderSubtle },
                        ]}
                        disabled={familyCheckInSaving}
                        testID="button-family-check-in-safe"
                      >
                        <AppIcon
                          name="check-circle"
                          size={15}
                          color={theme.primary}
                        />
                        <ThemedText
                          type="caption"
                          style={{ color: theme.text, fontWeight: "800" }}
                        >
                          I’m safe
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleShareCurrentLocation()}
                        style={[
                          styles.familyCheckInAction,
                          {
                            borderColor: theme.primaryBorder,
                            backgroundColor: theme.primaryMuted,
                          },
                        ]}
                        disabled={familyCheckInSaving}
                        testID="button-family-share-location"
                      >
                        {familyCheckInSaving ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.primary}
                          />
                        ) : (
                          <AppIcon
                            name="navigation"
                            size={15}
                            color={theme.primary}
                          />
                        )}
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: "800" }}
                        >
                          Share for 1 hour
                        </ThemedText>
                      </Pressable>
                    </View>
                    {currentFamilyCheckIn ? (
                      <Pressable
                        onPress={() => void handleClearFamilyCheckIn()}
                        disabled={familyCheckInSaving}
                        style={styles.familyCheckInClear}
                        testID="button-family-check-in-clear"
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, fontWeight: "700" }}
                        >
                          Clear my check-in
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.familyPlacesSectionHeader}>
                    <View>
                      <ThemedText type="h4">Saved places</ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 3 }}
                      >
                        Home, school, work, or a place of prayer.
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={openAddPlaceModal}
                      style={[
                        styles.familyPlacesAddButton,
                        { backgroundColor: theme.primary },
                      ]}
                      testID="button-family-place-add"
                      accessibilityRole="button"
                      accessibilityLabel="Add a family place"
                    >
                      <AppIcon name="plus" size={16} color={theme.buttonText} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.buttonText, fontWeight: "800" }}
                      >
                        Add
                      </ThemedText>
                    </Pressable>
                  </View>

                  {familyPlacesLoading ? (
                    <View style={styles.familyLoadingRow}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        Loading family places…
                      </ThemedText>
                    </View>
                  ) : familyPlaces.length === 0 ? (
                    <View
                      style={[
                        styles.familyPlacesEmpty,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      <AppIcon
                        name="map-pin"
                        size={28}
                        color={theme.textMuted}
                      />
                      <ThemedText
                        type="small"
                        style={{ marginTop: Spacing.sm, fontWeight: "800" }}
                      >
                        Add the first place
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textMuted,
                          marginTop: 4,
                          textAlign: "center",
                        }}
                      >
                        Places are shared labels—not a live map or tracking
                        history.
                      </ThemedText>
                    </View>
                  ) : (
                    familyPlaces.map((place) => (
                      <View
                        key={place.id}
                        style={[
                          styles.familyPlaceRow,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.familyPlaceIcon,
                            { backgroundColor: theme.primaryMuted },
                          ]}
                        >
                          <AppIcon
                            name={
                              place.kind === "home"
                                ? "home"
                                : place.kind === "work"
                                  ? "briefcase"
                                  : place.kind === "mosque"
                                    ? "mosque"
                                    : "map-pin"
                            }
                            size={17}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            type="small"
                            style={{ fontWeight: "800" }}
                          >
                            {place.name}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted, marginTop: 2 }}
                            numberOfLines={1}
                          >
                            {place.address || "Family place"}
                          </ThemedText>
                          {familyCheckIns.some(
                            (checkIn) =>
                              checkIn.placeId === place.id &&
                              checkIn.status !== "expired",
                          ) ? (
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.primary,
                                marginTop: 4,
                                fontWeight: "700",
                              }}
                            >
                              {
                                familyCheckIns.filter(
                                  (checkIn) =>
                                    checkIn.placeId === place.id &&
                                    checkIn.status !== "expired",
                                ).length
                              }{" "}
                              member
                              {familyCheckIns.filter(
                                (checkIn) =>
                                  checkIn.placeId === place.id &&
                                  checkIn.status !== "expired",
                              ).length === 1
                                ? ""
                                : "s"}{" "}
                              checked in
                            </ThemedText>
                          ) : null}
                        </View>
                        <View style={styles.familyPlaceActions}>
                          <Pressable
                            onPress={() => handleCheckInAtPlace(place)}
                            style={[
                              styles.familyPlaceCheckInButton,
                              { borderColor: theme.primaryBorder },
                            ]}
                            disabled={familyCheckInSaving}
                            testID={`button-family-check-in-place-${place.id}`}
                          >
                            <AppIcon
                              name="check"
                              size={14}
                              color={theme.primary}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.primary,
                                fontWeight: "800",
                              }}
                            >
                              Check in
                            </ThemedText>
                          </Pressable>
                          {place.createdBy === authUser?.id || isCreator ? (
                            <Pressable
                              onPress={() =>
                                void handleRemoveFamilyPlace(place)
                              }
                              hitSlop={8}
                              accessibilityLabel={`Remove ${place.name}`}
                              testID={`button-family-place-remove-${place.id}`}
                            >
                              <AppIcon
                                name="trash-2"
                                size={16}
                                color={theme.textMuted}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}

                  {familyCheckIns.filter(
                    (checkIn) => checkIn.status !== "expired",
                  ).length > 0 ? (
                    <View style={styles.familyLiveCheckInsSection}>
                      <View style={styles.familyPlacesSectionHeader}>
                        <View>
                          <ThemedText type="h4">Circle status</ThemedText>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted, marginTop: 3 }}
                          >
                            Latest check-in only; no timeline is kept.
                          </ThemedText>
                        </View>
                      </View>
                      {familyCheckIns
                        .filter((checkIn) => checkIn.status !== "expired")
                        .map((checkIn) => (
                          <View
                            key={checkIn.id}
                            style={[
                              styles.familyCheckInRow,
                              { borderColor: theme.borderSubtle },
                            ]}
                          >
                            <View
                              style={[
                                styles.familyHomePersonAvatar,
                                {
                                  backgroundColor: theme.primaryMuted,
                                  borderColor: theme.primaryBorder,
                                },
                              ]}
                            >
                              <ThemedText
                                type="small"
                                style={{
                                  color: theme.primary,
                                  fontWeight: "800",
                                }}
                              >
                                {(checkIn.displayName ||
                                  checkIn.username ||
                                  "U")[0].toUpperCase()}
                              </ThemedText>
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText
                                type="small"
                                style={{ fontWeight: "800" }}
                              >
                                {checkIn.displayName || checkIn.username}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                style={{ color: theme.textMuted, marginTop: 2 }}
                              >
                                {checkIn.status === "shared_location"
                                  ? "Shared location"
                                  : checkIn.locationLabel}
                              </ThemedText>
                            </View>
                            <View
                              style={[
                                styles.familyCheckInPill,
                                { backgroundColor: theme.primaryMuted },
                              ]}
                            >
                              <View
                                style={[
                                  styles.familyHomeStatusDot,
                                  { backgroundColor: theme.primary },
                                ]}
                              />
                              <ThemedText
                                type="caption"
                                style={{
                                  color: theme.primary,
                                  fontWeight: "800",
                                }}
                              >
                                {checkIn.status === "shared_location"
                                  ? "Timed"
                                  : "Here"}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>
          ) : null}

          {familySection === "together" ? (
            <View
              style={styles.familyTogetherHeader}
              testID="family-circle-together"
            >
              <View>
                <ThemedText type="h4">Together</ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 2 }}
                >
                  Small shared actions that keep the circle close.
                </ThemedText>
              </View>
              <View style={styles.familyTogetherSwitcher}>
                <Pressable
                  onPress={() => setActiveTab("challenges")}
                  style={[
                    styles.familyTogetherSwitch,
                    activeTab === "challenges"
                      ? {
                          backgroundColor: theme.primaryMuted,
                          borderColor: theme.primaryBorder,
                        }
                      : { borderColor: theme.borderSubtle },
                  ]}
                  testID="button-family-together-goals"
                >
                  <AppIcon
                    name="target"
                    size={13}
                    color={
                      activeTab === "challenges"
                        ? theme.primary
                        : theme.textMuted
                    }
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        activeTab === "challenges"
                          ? theme.primary
                          : theme.textMuted,
                      fontWeight: "800",
                    }}
                  >
                    Goals
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("duas")}
                  style={[
                    styles.familyTogetherSwitch,
                    activeTab === "duas"
                      ? {
                          backgroundColor: theme.scholarSoft,
                          borderColor: theme.scholar,
                        }
                      : { borderColor: theme.borderSubtle },
                  ]}
                  testID="button-family-together-duas"
                >
                  <AppIcon
                    name="heart"
                    size={13}
                    color={
                      activeTab === "duas" ? theme.scholar : theme.textMuted
                    }
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        activeTab === "duas" ? theme.scholar : theme.textMuted,
                      fontWeight: "800",
                    }}
                  >
                    Duas
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeTab === "challenges" && familySection === "together" ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              {challenges.map((challenge) => {
                const progress =
                  challenge.target > 0
                    ? Math.round((challenge.current / challenge.target) * 100)
                    : 0;
                const isQuranChallenge = challenge.category === "quran";
                return (
                  <Pressable
                    key={challenge.id}
                    onPress={() => handleIncrementProgress(challenge.id)}
                    style={[
                      styles.challengeCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.challengeHeader}>
                      <View
                        style={[
                          styles.challengeIconWrap,
                          { backgroundColor: theme.primaryMuted },
                        ]}
                      >
                        <AppIcon
                          name={challenge.icon}
                          size={20}
                          color={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        {isQuranChallenge && challenge.reference ? (
                          <View
                            style={[
                              styles.challengeReferencePill,
                              {
                                backgroundColor: `${theme.scholar}12`,
                                borderColor: `${theme.scholar}30`,
                              },
                            ]}
                          >
                            <AppIcon
                              name="book-open"
                              size={10}
                              color={theme.scholar}
                            />
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                                fontSize: 10,
                              }}
                            >
                              {challenge.reference}
                            </ThemedText>
                          </View>
                        ) : null}
                        <ThemedText type="h4">{challenge.title}</ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted }}
                          numberOfLines={isQuranChallenge ? 3 : 2}
                        >
                          {challenge.description}
                        </ThemedText>
                        {isQuranChallenge && challenge.actionPrompt ? (
                          <View
                            style={[
                              styles.challengeActionPrompt,
                              {
                                backgroundColor: `${theme.primary}0C`,
                                borderColor: `${theme.primary}20`,
                              },
                            ]}
                          >
                            <AppIcon
                              name="message-circle"
                              size={12}
                              color={theme.primary}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.textSecondary,
                                lineHeight: 17,
                                flex: 1,
                              }}
                            >
                              {challenge.actionPrompt}
                            </ThemedText>
                          </View>
                        ) : null}
                        {isQuranChallenge &&
                        (challenge.quranIdentityTitle ||
                          challenge.nextAction ||
                          challenge.familyMilestones?.length) ? (
                          <View
                            style={[
                              styles.challengeJourneyPanel,
                              {
                                backgroundColor: `${theme.scholar}0B`,
                                borderColor: `${theme.scholar}22`,
                              },
                            ]}
                          >
                            <View style={styles.challengeJourneyHeader}>
                              <View
                                style={[
                                  styles.challengeJourneyIcon,
                                  { backgroundColor: `${theme.scholar}16` },
                                ]}
                              >
                                <AppIcon
                                  name="star"
                                  size={13}
                                  color={theme.scholar}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <ThemedText
                                  type="caption"
                                  style={{
                                    color: theme.scholar,
                                    fontWeight: "900",
                                  }}
                                >
                                  {challenge.quranIdentityTitle ||
                                    "Family Quran Circle"}
                                </ThemedText>
                                {challenge.rewardLabel ? (
                                  <ThemedText
                                    type="caption"
                                    numberOfLines={1}
                                    style={{
                                      color: theme.textMuted,
                                      fontSize: 10,
                                    }}
                                  >
                                    Reward focus: {challenge.rewardLabel}
                                  </ThemedText>
                                ) : null}
                              </View>
                            </View>
                            {challenge.nextAction ? (
                              <ThemedText
                                type="caption"
                                numberOfLines={2}
                                style={{
                                  color: theme.textSecondary,
                                  lineHeight: 17,
                                }}
                              >
                                {challenge.nextAction}
                              </ThemedText>
                            ) : null}
                            {challenge.familyMilestones?.length ? (
                              <View style={styles.challengeJourneyMilestones}>
                                {challenge.familyMilestones.map(
                                  (milestone, milestoneIndex) => {
                                    const reached =
                                      challenge.current > milestoneIndex;
                                    return (
                                      <View
                                        key={`${challenge.id}-${milestone}`}
                                        style={[
                                          styles.challengeJourneyChip,
                                          {
                                            backgroundColor: reached
                                              ? `${theme.primary}16`
                                              : `${theme.textMuted}0B`,
                                            borderColor: reached
                                              ? `${theme.primary}35`
                                              : theme.borderSubtle,
                                          },
                                        ]}
                                      >
                                        <AppIcon
                                          name={reached ? "check" : "circle"}
                                          size={10}
                                          color={
                                            reached
                                              ? theme.primary
                                              : theme.textMuted
                                          }
                                        />
                                        <ThemedText
                                          type="caption"
                                          numberOfLines={1}
                                          style={{
                                            color: reached
                                              ? theme.primary
                                              : theme.textMuted,
                                            fontSize: 10,
                                            fontWeight: "800",
                                          }}
                                        >
                                          {milestone}
                                        </ThemedText>
                                      </View>
                                    );
                                  },
                                )}
                              </View>
                            ) : null}
                            <View
                              testID="family-quran-challenge-action-row"
                              style={styles.familyQuranActionRow}
                            >
                              <Pressable
                                testID={`button-family-open-quran-${challenge.id}`}
                                accessibilityRole="button"
                                accessibilityLabel={`Open ${challenge.reference || "Quran"} for this family challenge`}
                                onPress={() =>
                                  handleOpenQuranChallenge(challenge)
                                }
                                style={({ pressed }) => [
                                  styles.familyQuranAction,
                                  {
                                    backgroundColor: `${theme.primary}10`,
                                    borderColor: `${theme.primary}28`,
                                  },
                                  pressed ? { opacity: 0.72 } : null,
                                ]}
                              >
                                <AppIcon
                                  name="book-open"
                                  size={12}
                                  color={theme.primary}
                                />
                                <ThemedText
                                  type="caption"
                                  numberOfLines={1}
                                  style={{
                                    color: theme.primary,
                                    fontWeight: "900",
                                    fontSize: 10,
                                  }}
                                >
                                  Open ayah
                                </ThemedText>
                              </Pressable>
                              <Pressable
                                testID={`button-family-quran-checkin-${challenge.id}`}
                                accessibilityRole="button"
                                accessibilityLabel={`Add a family Quran check-in for ${challenge.title}`}
                                onPress={() =>
                                  handleIncrementProgress(challenge.id)
                                }
                                style={({ pressed }) => [
                                  styles.familyQuranAction,
                                  {
                                    backgroundColor: `${theme.scholar}10`,
                                    borderColor: `${theme.scholar}28`,
                                  },
                                  pressed ? { opacity: 0.72 } : null,
                                ]}
                              >
                                <AppIcon
                                  name="check-circle"
                                  size={12}
                                  color={theme.scholar}
                                />
                                <ThemedText
                                  type="caption"
                                  numberOfLines={1}
                                  style={{
                                    color: theme.scholar,
                                    fontWeight: "900",
                                    fontSize: 10,
                                  }}
                                >
                                  Check-in
                                </ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.daysLeftBadge,
                          {
                            backgroundColor: isDark
                              ? "rgba(59,130,246,0.15)"
                              : "#EFF6FF",
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{
                            color: "#3B82F6",
                            fontSize: 10,
                            fontWeight: "600",
                          }}
                        >
                          {challenge.daysLeft}d left
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.progressSection}>
                      <View
                        style={[
                          styles.progressBarBg,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${progress}%`,
                              backgroundColor: theme.primary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressLabels}>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted }}
                        >
                          {challenge.current}/{challenge.target}{" "}
                          {challenge.unit}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: "600" }}
                        >
                          {progress}%
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                style={[styles.addMemberBtn, { borderColor: theme.border }]}
                testID="button-create-goal"
                onPress={() => setShowCreateGoal(true)}
              >
                <AppIcon name="plus-circle" size={20} color={theme.primary} />
                <ThemedText
                  type="body"
                  style={{ color: theme.primary, marginLeft: Spacing.sm }}
                >
                  Create New Family Goal
                </ThemedText>
              </Pressable>
            </Animated.View>
          ) : null}

          {activeTab === "duas" && familySection === "together" ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View
                style={[
                  styles.duaInputRow,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <TextInput
                  style={[styles.duaInput, { color: theme.text }]}
                  placeholder="Share a dua with your family"
                  placeholderTextColor={theme.textMuted}
                  value={newDua}
                  onChangeText={setNewDua}
                  testID="input-dua"
                />
                <Pressable
                  style={[styles.sendBtn, { backgroundColor: theme.primary }]}
                  testID="button-send-dua"
                  onPress={handleSendDua}
                >
                  <AppIcon name="send" size={16} color="#FFF" />
                </Pressable>
              </View>
              {duas.length > 0 ? (
                duas.map((dua) => (
                  <View
                    key={dua.id}
                    style={[
                      styles.duaCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.duaHeader}>
                      <View
                        style={[
                          styles.duaAvatar,
                          {
                            backgroundColor:
                              AVATAR_COLORS[
                                parseInt(dua.id, 10) % AVATAR_COLORS.length
                              ],
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: "#FFF", fontWeight: "700" }}
                        >
                          {dua.from[0]}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          {dua.from}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, fontSize: 10 }}
                        >
                          {dua.timestamp}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => handleToggleLike(dua.id)}
                        testID={`button-like-${dua.id}`}
                      >
                        <AppIcon
                          name="heart"
                          size={18}
                          color={dua.liked ? "#EF4444" : theme.textMuted}
                        />
                      </Pressable>
                    </View>
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.textSecondary,
                        lineHeight: 22,
                        marginTop: Spacing.sm,
                      }}
                    >
                      {dua.text}
                    </ThemedText>
                    <View style={styles.duaFooter}>
                      <Pressable
                        onPress={() => handleAmeen(dua.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                        testID={`button-ameen-${dua.id}`}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary }}
                        >
                          Ameen
                        </ThemedText>
                        {(dua.ameenCount || 0) > 0 ? (
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted }}
                          >
                            ({dua.ameenCount})
                          </ThemedText>
                        ) : null}
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View
                  style={{ alignItems: "center", paddingVertical: Spacing.xl }}
                >
                  <AppIcon name="heart" size={32} color={theme.textMuted} />
                  <ThemedText
                    type="body"
                    style={{
                      color: theme.textMuted,
                      marginTop: Spacing.md,
                      textAlign: "center",
                    }}
                  >
                    No shared duas yet. Be the first to share a dua with your
                    family.
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          ) : null}

          {activeTab === "messages" && familySection === "chat" ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={styles.messagesSection}
            >
              {errorMessage ? (
                <View
                  style={[
                    styles.messageInlineError,
                    {
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.12)"
                        : "#FEF2F2",
                      borderColor: isDark
                        ? "rgba(248,113,113,0.26)"
                        : "#FECACA",
                    },
                  ]}
                >
                  <AppIcon name="alert-circle" size={15} color={theme.error} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.error, flex: 1, lineHeight: 18 }}
                  >
                    {errorMessage}
                  </ThemedText>
                  {newFamilyMessage.trim() ? (
                    <Pressable
                      onPress={handleSendFamilyMessage}
                      disabled={sendingFamilyMessage}
                      accessibilityLabel="Retry sending family message"
                      testID="button-retry-family-message"
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.error, fontWeight: "800" }}
                      >
                        Retry
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => setErrorMessage("")}
                    accessibilityLabel="Dismiss message error"
                  >
                    <AppIcon name="x" size={15} color={theme.error} />
                  </Pressable>
                </View>
              ) : null}

              {familySyncLoading ? (
                <View style={styles.familyLoadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Loading family updates...
                  </ThemedText>
                </View>
              ) : null}

              {familySyncIssue || queuedFamilyMessageCount > 0 ? (
                <View
                  testID="family-message-sync-soft-warning"
                  style={[
                    styles.familySyncWarning,
                    {
                      backgroundColor: `${theme.scholar}10`,
                      borderColor: `${theme.scholar}2A`,
                    },
                  ]}
                >
                  <AppIcon
                    name={queuedFamilyMessageCount > 0 ? "clock" : "wifi-off"}
                    size={14}
                    color={theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.textSecondary,
                      flex: 1,
                      lineHeight: 18,
                    }}
                  >
                    {queuedFamilyMessageCount > 0
                      ? `${queuedFamilyMessageCount} message${queuedFamilyMessageCount === 1 ? "" : "s"} waiting to send. NurAI will retry automatically.`
                      : familySyncIssue}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      queuedFamilyMessageCount > 0
                        ? "Send waiting family messages now"
                        : "Retry family update refresh"
                    }
                    testID={
                      queuedFamilyMessageCount > 0
                        ? "button-send-family-outbox"
                        : "button-retry-family-sync-refresh"
                    }
                    disabled={queuedSendLoading}
                    onPress={() => {
                      if (!currentGroup) return;
                      if (queuedFamilyMessageCount > 0) {
                        void flushQueuedFamilyMessages(currentGroup.id);
                        return;
                      }
                      void fetchFamilyCollaboration(currentGroup.id);
                    }}
                    style={({ pressed }) => [
                      styles.familySyncRetry,
                      {
                        borderColor: `${theme.scholar}35`,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    {queuedSendLoading ? (
                      <ActivityIndicator size="small" color={theme.scholar} />
                    ) : (
                      <AppIcon
                        name={
                          queuedFamilyMessageCount > 0 ? "send" : "refresh-cw"
                        }
                        size={12}
                        color={theme.scholar}
                      />
                    )}
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "900" }}
                    >
                      {queuedFamilyMessageCount > 0 ? "Send now" : "Refresh"}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}

              {familyMessages.length > 0 ? (
                familyMessages.map((message) => {
                  const isMine = message.senderId === authUser?.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageBubble,
                        isMine ? styles.messageBubbleMine : null,
                        {
                          backgroundColor: isMine
                            ? theme.primaryMuted
                            : theme.surfaceGlass,
                          borderColor: isMine
                            ? theme.primaryBorder
                            : theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.messageBubbleHeader}>
                        <ThemedText
                          type="caption"
                          style={{
                            color: isMine ? theme.primary : theme.textSecondary,
                            fontWeight: "700",
                          }}
                          numberOfLines={1}
                        >
                          {isMine
                            ? "You"
                            : message.senderName || message.senderUsername}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{
                            color: message.queued
                              ? theme.scholar
                              : message.failed
                                ? theme.error
                                : theme.textMuted,
                            fontSize: 10,
                            fontWeight:
                              message.failed || message.queued ? "800" : "400",
                          }}
                        >
                          {message.pending
                            ? "Sending..."
                            : message.failed
                              ? message.queued
                                ? "Waiting to send"
                                : "Not sent"
                              : new Date(message.createdAt).toLocaleTimeString(
                                  "en-GB",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="body"
                        style={{
                          color: theme.text,
                          lineHeight: 21,
                          marginTop: 4,
                        }}
                      >
                        {message.content}
                      </ThemedText>
                      {message.failed && !message.queued ? (
                        <Pressable
                          onPress={() => prepareFamilyMessageRetry(message)}
                          accessibilityRole="button"
                          accessibilityLabel="Prepare this family message to retry"
                          testID={`button-retry-family-message-${message.id}`}
                          style={[
                            styles.messageRetryChip,
                            {
                              backgroundColor: `${theme.error}14`,
                              borderColor: `${theme.error}42`,
                            },
                          ]}
                        >
                          <AppIcon
                            name="refresh-cw"
                            size={12}
                            color={theme.error}
                          />
                          <ThemedText
                            type="caption"
                            style={{ color: theme.error, fontWeight: "900" }}
                          >
                            {message.queued
                              ? "Edit & send"
                              : "Retry this message"}
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyMessagesState}>
                  <AppIcon
                    name="message-circle"
                    size={34}
                    color={theme.textMuted}
                  />
                  <ThemedText
                    type="body"
                    style={{
                      color: theme.textMuted,
                      marginTop: Spacing.md,
                      textAlign: "center",
                    }}
                  >
                    No family messages yet. Start with a gentle reminder or
                    encouragement.
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          ) : null}
        </ScrollView>
        {familySection === "chat" ? (
          <View
            style={[
              styles.messageComposerDock,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
                backgroundColor: `${theme.backgroundRoot}F2`,
                borderTopColor: theme.borderSubtle,
              },
            ]}
          >
            {renderMessageComposer()}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
        testID="modal-invite"
      >
        <Pressable
          style={modalOverlay}
          onPress={() => setShowInviteModal(false)}
        >
          <Pressable style={modalBox} onPress={() => {}}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              Invite Family Member
            </ThemedText>

            <ThemedText
              type="small"
              style={{
                color: theme.textSecondary,
                marginBottom: Spacing.md,
                lineHeight: 20,
              }}
            >
              Search existing NurAI users and invite them into this family
              circle.
            </ThemedText>

            {inviteMessage ? (
              <View
                style={[
                  styles.inviteSuccessBanner,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <AppIcon name="check-circle" size={16} color={theme.primary} />
                <ThemedText
                  type="small"
                  style={{
                    color: theme.primary,
                    marginLeft: Spacing.sm,
                    flex: 1,
                  }}
                >
                  {inviteMessage}
                </ThemedText>
              </View>
            ) : null}

            {inviteError ? (
              <View
                style={[
                  styles.inviteErrorBanner,
                  {
                    backgroundColor: isDark
                      ? "rgba(239,68,68,0.15)"
                      : "#FEF2F2",
                  },
                ]}
              >
                <AppIcon name="alert-circle" size={16} color={theme.error} />
                <ThemedText
                  type="small"
                  style={{
                    color: theme.error,
                    marginLeft: Spacing.sm,
                    flex: 1,
                  }}
                >
                  {inviteError}
                </ThemedText>
              </View>
            ) : null}

            <View>
              <View
                style={[styles.searchInputRow, { borderColor: theme.border }]}
              >
                <AppIcon name="search" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search by username, name, or email"
                  placeholderTextColor={theme.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  testID="input-search-user"
                />
                {searchLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : null}
              </View>

              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                {searchResults.length > 0 ? (
                  searchResults.map((user, idx) => (
                    <View
                      key={user.id}
                      style={[
                        styles.searchResultCard,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.searchResultAvatar,
                          {
                            backgroundColor:
                              AVATAR_COLORS[idx % AVATAR_COLORS.length],
                          },
                        ]}
                      >
                        <ThemedText
                          type="body"
                          style={{ color: "#FFF", fontWeight: "700" }}
                        >
                          {user.avatar}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="h4">
                          {user.displayName || user.username}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary }}
                        >
                          @{user.username}
                        </ThemedText>
                        {user.email ? (
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted, fontSize: 11 }}
                          >
                            {user.email}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Pressable
                        testID={`button-invite-${user.id}`}
                        style={[
                          styles.inviteBtn,
                          { backgroundColor: theme.primary },
                        ]}
                        onPress={() => handleInviteUser(user.id)}
                        disabled={inviteSending}
                      >
                        {inviteSending ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <AppIcon name="user-plus" size={14} color="#FFF" />
                            <ThemedText
                              type="caption"
                              style={{
                                color: "#FFF",
                                marginLeft: 4,
                                fontWeight: "600",
                              }}
                            >
                              Invite
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  ))
                ) : searchQuery.trim().length >= 2 && !searchLoading ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.xl,
                    }}
                  >
                    <AppIcon name="user-x" size={28} color={theme.textMuted} />
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textMuted,
                        marginTop: Spacing.sm,
                        textAlign: "center",
                      }}
                    >
                      No users found matching your search
                    </ThemedText>
                  </View>
                ) : searchQuery.trim().length < 2 ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.xl,
                    }}
                  >
                    <AppIcon name="search" size={28} color={theme.textMuted} />
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textMuted,
                        marginTop: Spacing.sm,
                        textAlign: "center",
                      }}
                    >
                      Type at least 2 characters to search
                    </ThemedText>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            <Pressable
              style={[modalBtnCancel, { marginTop: Spacing.sm }]}
              onPress={() => setShowInviteModal(false)}
              testID="button-close-invite"
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Close
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
        testID="modal-settings"
      >
        <Pressable style={modalOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={modalBox} onPress={() => {}}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              Group Settings
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginBottom: Spacing.xs }}
            >
              Group Name
            </ThemedText>
            <TextInput
              style={modalInput}
              placeholder="Enter group name"
              placeholderTextColor={theme.textMuted}
              value={editGroupName}
              onChangeText={setEditGroupName}
              autoFocus
              testID="input-group-name"
            />
            <Pressable
              style={[modalBtnPrimary, savingGroupName ? { opacity: 0.7 } : {}]}
              onPress={handleSaveGroupName}
              disabled={savingGroupName}
              testID="button-save-group-name"
            >
              {savingGroupName ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#FFF", fontWeight: "600" }}
                >
                  Save
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              style={modalBtnCancel}
              onPress={() => setShowSettings(false)}
              testID="button-cancel-settings"
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Cancel
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCreateGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateGoal(false)}
        testID="modal-create-goal"
      >
        <Pressable
          style={modalOverlay}
          onPress={() => setShowCreateGoal(false)}
        >
          <Pressable style={modalBox} onPress={() => {}}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              Create Family Goal
            </ThemedText>
            <TextInput
              style={modalInput}
              placeholder="Title"
              placeholderTextColor={theme.textMuted}
              value={goalTitle}
              onChangeText={setGoalTitle}
              autoFocus
              testID="input-goal-title"
            />
            <TextInput
              style={modalInput}
              placeholder="Description"
              placeholderTextColor={theme.textMuted}
              value={goalDescription}
              onChangeText={setGoalDescription}
              testID="input-goal-description"
            />
            <TextInput
              style={modalInput}
              placeholder="Target number"
              placeholderTextColor={theme.textMuted}
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="numeric"
              testID="input-goal-target"
            />
            <TextInput
              style={modalInput}
              placeholder="Unit: pages, days, minutes"
              placeholderTextColor={theme.textMuted}
              value={goalUnit}
              onChangeText={setGoalUnit}
              testID="input-goal-unit"
            />
            <TextInput
              style={modalInput}
              placeholder="Days to complete"
              placeholderTextColor={theme.textMuted}
              value={goalDays}
              onChangeText={setGoalDays}
              keyboardType="numeric"
              testID="input-goal-days"
            />
            <Pressable
              style={modalBtnPrimary}
              onPress={handleCreateGoal}
              testID="button-create-goal-submit"
            >
              <ThemedText
                type="body"
                style={{ color: "#FFF", fontWeight: "600" }}
              >
                Create
              </ThemedText>
            </Pressable>
            <Pressable
              style={modalBtnCancel}
              onPress={() => setShowCreateGoal(false)}
              testID="button-cancel-goal"
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Cancel
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAddPlaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddPlaceModal(false)}
        testID="modal-add-family-place"
      >
        <Pressable
          style={modalOverlay}
          onPress={() => setShowAddPlaceModal(false)}
        >
          <Pressable style={modalBox} onPress={() => {}}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
              Add a family place
            </ThemedText>
            <ThemedText
              type="caption"
              style={{
                color: theme.textMuted,
                lineHeight: 18,
                marginBottom: Spacing.md,
              }}
            >
              Save a shared label for quick check-ins. This does not turn on
              background location.
            </ThemedText>
            <TextInput
              style={modalInput}
              placeholder="Place name"
              placeholderTextColor={theme.textMuted}
              value={newPlaceName}
              onChangeText={setNewPlaceName}
              autoFocus
              maxLength={80}
              testID="input-family-place-name"
            />
            <TextInput
              style={modalInput}
              placeholder="Address or note (optional)"
              placeholderTextColor={theme.textMuted}
              value={newPlaceAddress}
              onChangeText={setNewPlaceAddress}
              maxLength={160}
              testID="input-family-place-address"
            />
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
            >
              Place type
            </ThemedText>
            <View style={styles.familyPlaceKindGrid}>
              {(
                [
                  ["home", "Home", "home"],
                  ["school", "School", "book-open"],
                  ["work", "Work", "briefcase"],
                  ["mosque", "Masjid", "mosque"],
                  ["custom", "Other", "map-pin"],
                ] as [FamilyPlaceKind, string, AppIconName][]
              ).map(([kind, label, icon]) => (
                <Pressable
                  key={kind}
                  onPress={() => setNewPlaceKind(kind)}
                  style={[
                    styles.familyPlaceKindOption,
                    {
                      borderColor:
                        newPlaceKind === kind
                          ? theme.primary
                          : theme.borderSubtle,
                      backgroundColor:
                        newPlaceKind === kind
                          ? theme.primaryMuted
                          : theme.surfaceGlass,
                    },
                  ]}
                  testID={`button-family-place-kind-${kind}`}
                >
                  <AppIcon
                    name={icon}
                    size={15}
                    color={
                      newPlaceKind === kind ? theme.primary : theme.textMuted
                    }
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        newPlaceKind === kind ? theme.primary : theme.textMuted,
                      fontWeight: "800",
                    }}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[
                modalBtnPrimary,
                !newPlaceName.trim() ? { opacity: 0.55 } : null,
              ]}
              onPress={handleCreateFamilyPlace}
              disabled={familyPlaceSaving || !newPlaceName.trim()}
              testID="button-family-place-submit"
            >
              {familyPlaceSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#FFF", fontWeight: "700" }}
                >
                  Save place
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              style={modalBtnCancel}
              onPress={() => setShowAddPlaceModal(false)}
              testID="button-family-place-cancel"
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Cancel
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
    gap: 2,
  },
  scrollContent: { paddingHorizontal: Spacing.lg },
  keyboardAvoidingRoot: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  heroGoldDivider: {
    marginBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  heroAvatars: { flexDirection: "row" },
  heroAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(6,20,18,0.62)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 16,
    paddingVertical: Spacing.md,
  },
  heroStat: { alignItems: "center", flex: 1 },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  familyCommandPanel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  familyCommandHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  familyCommandTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  familyCommandIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  familyPlanBadge: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  familyMetricGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  familyMetricCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  familyProgressBlock: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  familyProgressCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  familyProgressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  familyProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  familyActionRail: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  familyRailAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  familyInsightStrip: {
    minHeight: 76,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  weeklySummaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  weeklySummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  weeklySummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklySummaryBadge: {
    minHeight: 28,
    maxWidth: 86,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weeklySummaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  weeklySummaryMetric: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  weeklyQuickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  weeklyQuickAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  familyTravelCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  familyTravelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  familyTravelDestination: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  travelKicker: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  familyTravelProgressBlock: {
    width: 92,
    gap: 6,
    alignItems: "flex-end",
  },
  familyTravelProgressTrack: {
    width: "100%",
    height: 7,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  familyTravelProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  familyTravelFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyTravelFact: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  familyHomeSurface: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  familyHomeEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  familyHomeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  familyHomeMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(184, 194, 189, 0.12)",
  },
  familyHomeMetric: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  familyHomeMetricDivider: {
    width: 1,
    height: 30,
  },
  familyHomePrimaryAction: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.lg,
  },
  familyHomeSecondaryActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  familyHomeSecondaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  familyHomeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  familyHomePeopleList: {
    marginBottom: Spacing.lg,
  },
  familyHomePersonRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  familyHomePersonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  familyHomePersonStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  familyHomeNextRow: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  familyHomeNextIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  familyTogetherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  familyTogetherSwitcher: {
    flexDirection: "row",
    gap: 6,
  },
  familyTogetherSwitch: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyPeopleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  familyPeopleSwitcher: {
    flexDirection: "row",
    gap: 6,
  },
  familyPeopleSwitch: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyPlacesPrivacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  familyPlacesPrivacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  familyCheckInCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  familyCheckInCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  familyCheckInStatus: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyCheckInActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyCheckInAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  familyCheckInClear: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  familyPlacesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  familyPlacesAddButton: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  familyPlacesEmpty: {
    minHeight: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  familyPlaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  familyPlaceIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  familyPlaceActions: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  familyPlaceCheckInButton: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyLiveCheckInsSection: {
    marginTop: Spacing.md,
  },
  familyCheckInRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  familyCheckInPill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyPlaceKindGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  familyPlaceKindOption: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tabRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  hiddenOverview: {
    display: "none",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  badge: {
    backgroundColor: "#EF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberMessageButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  memberCategoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  memberCategoryChip: {
    maxWidth: 88,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberMenu: {
    position: "absolute",
    right: 0,
    top: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.xs,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    minWidth: 120,
  },
  memberMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  challengeCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  challengeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeReferencePill: {
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  challengeActionPrompt: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  challengeJourneyPanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  challengeJourneyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  challengeJourneyIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeJourneyMilestones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  challengeJourneyChip: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  familyQuranActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  familyQuranAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  daysLeftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressSection: { gap: Spacing.xs },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  duaInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  duaInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  duaCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  duaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  duaAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  duaFooter: {
    marginTop: Spacing.sm,
    alignItems: "flex-end",
  },
  messageComposer: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  messageComposerDock: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
  },
  messageComposerIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  messageInput: {
    flex: 1,
    minHeight: 34,
    maxHeight: 82,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 9,
    paddingBottom: 7,
  },
  messageSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  messagesSection: {
    paddingBottom: Spacing.sm,
  },
  messageInlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  familyLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  familySyncWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  familySyncRetry: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyActivityPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  familyActivityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  familyActivityRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  familyActivityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
  },
  messageBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  messageRetryChip: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyMessagesState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  signInIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  createCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    overflow: "hidden",
  },
  createCardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  createInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
    marginTop: Spacing.lg,
  },
  createBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
    marginTop: Spacing.md,
    width: "100%",
  },
  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  inviteResponseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.md,
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  inviteSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  inviteErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
});
