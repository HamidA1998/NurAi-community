import { apiRequest, getApiUrl } from "@/lib/query-client";

export type CommunityAudience = "male" | "female";
export type CommunityRequestDirection = "incoming" | "outgoing" | null;

export type CommunityPerson = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  connectionId: number | null;
  connectionStatus: "none" | "pending" | "accepted";
  requestDirection: CommunityRequestDirection;
};

export type CommunityConnection = {
  id: number;
  status: "pending" | "accepted";
  requestDirection: Exclude<CommunityRequestDirection, null>;
  createdAt: string;
  profile: Pick<CommunityPerson, "id" | "username" | "displayName" | "bio">;
};

export type CommunityConversation = {
  id: number;
  lastMessageAt: string;
  lastMessage: string;
  lastMessageCreatedAt: string | null;
  unreadCount: number;
  profile: Pick<CommunityPerson, "id" | "username" | "displayName">;
};

export type CommunityDirectMessage = {
  id: number;
  conversationId: number;
  senderProfileId: number;
  clientMessageId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  media: {
    id: number;
    mimeType: "image/jpeg";
    byteSize: number;
    width: number;
    height: number;
    altText: string;
  } | null;
};

export type CommunityMessageImageInput = {
  dataUrl: string;
  width: number;
  height: number;
  altText: string;
};

export type CommunityProfileSettings = {
  id: number;
  displayName: string;
  gender: CommunityAudience;
  bio: string;
  discoverableByUsername: boolean;
  discoverableByEmail: boolean;
  allowConnectionRequests: boolean;
};

export type CommunityBlockedMember = {
  id: number;
  username: string;
  displayName: string;
  blockedAt: string;
};

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function searchCommunityPeople(
  query: string,
): Promise<CommunityPerson[]> {
  const response = await apiRequest(
    "GET",
    `/api/community/people?q=${encodeURIComponent(query.trim())}`,
  );
  return (await json<{ people: CommunityPerson[] }>(response)).people;
}

export async function fetchCommunityConnections(): Promise<
  CommunityConnection[]
> {
  const response = await apiRequest("GET", "/api/community/connections");
  return (await json<{ connections: CommunityConnection[] }>(response))
    .connections;
}

export async function requestCommunityConnection(
  profileId: number,
): Promise<void> {
  await apiRequest("POST", `/api/community/connections/${profileId}`);
}

export async function respondToCommunityConnection(
  connectionId: number,
  action: "accept" | "decline",
): Promise<void> {
  await apiRequest("PATCH", `/api/community/connections/${connectionId}`, {
    action,
  });
}

export async function removeCommunityConnection(
  connectionId: number,
): Promise<void> {
  await apiRequest("DELETE", `/api/community/connections/${connectionId}`);
}

export async function blockCommunityMember(profileId: number): Promise<void> {
  await apiRequest("POST", `/api/community/blocks/${profileId}`);
}

export async function unblockCommunityMember(profileId: number): Promise<void> {
  await apiRequest("DELETE", `/api/community/blocks/${profileId}`);
}

export async function fetchCommunityBlockedMembers(): Promise<
  CommunityBlockedMember[]
> {
  const response = await apiRequest("GET", "/api/community/blocks");
  return (await json<{ blocked: CommunityBlockedMember[] }>(response)).blocked;
}

export async function fetchCommunityProfileSettings(): Promise<CommunityProfileSettings> {
  const response = await apiRequest("GET", "/api/community/profile");
  return json<CommunityProfileSettings>(response);
}

export async function updateCommunityProfileSettings(
  settings: Pick<
    CommunityProfileSettings,
    | "displayName"
    | "bio"
    | "discoverableByUsername"
    | "discoverableByEmail"
    | "allowConnectionRequests"
  >,
): Promise<CommunityProfileSettings> {
  const response = await apiRequest(
    "PATCH",
    "/api/community/profile",
    settings,
  );
  return json<CommunityProfileSettings>(response);
}

export async function fetchCommunityConversations(): Promise<
  CommunityConversation[]
> {
  const response = await apiRequest("GET", "/api/community/conversations");
  return (await json<{ conversations: CommunityConversation[] }>(response))
    .conversations;
}

export async function openCommunityConversation(
  profileId: number,
): Promise<{ id: number }> {
  const response = await apiRequest("POST", "/api/community/conversations", {
    profileId,
  });
  return json<{ id: number }>(response);
}

export async function fetchCommunityMessages(
  conversationId: number,
): Promise<CommunityDirectMessage[]> {
  const response = await apiRequest(
    "GET",
    `/api/community/conversations/${conversationId}/messages`,
  );
  return (await json<{ messages: CommunityDirectMessage[] }>(response))
    .messages;
}

export async function sendCommunityMessage(params: {
  conversationId: number;
  clientMessageId: string;
  content: string;
  image?: CommunityMessageImageInput;
}): Promise<CommunityDirectMessage> {
  const response = await apiRequest(
    "POST",
    `/api/community/conversations/${params.conversationId}/messages`,
    {
      clientMessageId: params.clientMessageId,
      content: params.content,
      image: params.image,
    },
  );
  return json<CommunityDirectMessage>(response);
}

export function getCommunityMessageMediaUrl(messageId: number): string {
  return new URL(
    `/api/community/messages/${messageId}/media`,
    getApiUrl(),
  ).toString();
}

export async function markCommunityConversationRead(
  conversationId: number,
): Promise<void> {
  await apiRequest(
    "PATCH",
    `/api/community/conversations/${conversationId}/read`,
  );
}

export async function reportCommunityTarget(params: {
  targetType: "profile" | "post" | "reply" | "message";
  targetId: number;
  reason:
    | "harassment"
    | "spam"
    | "hate"
    | "sexual_content"
    | "dangerous_content"
    | "impersonation"
    | "other";
  details?: string;
}): Promise<void> {
  await apiRequest("POST", "/api/community/reports", params);
}

export function createCommunityClientMessageId(): string {
  return `community:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}
