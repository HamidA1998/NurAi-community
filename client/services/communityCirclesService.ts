import { apiRequest } from "@/lib/query-client";

export type CommunityCircleSummary = {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  memberCap: number;
  isOwner: boolean;
  memberCount: number;
  checkedInToday: boolean;
  todayCheckinCount: number;
};

export type CommunityCircleMemberRow = {
  profileId: number;
  role: "owner" | "member";
  joinedAt: string;
  displayName: string;
};

export type CommunityCircleCheckinRow = {
  id: number;
  profileId: number;
  content: string;
  checkinDate: string;
  createdAt: string;
  displayName: string;
};

export type CommunityCircleDetail = {
  circle: {
    id: number;
    name: string;
    description: string;
    inviteCode: string;
    memberCap: number;
    createdByProfileId: number;
    createdAt: string;
  };
  myRole: "owner" | "member";
  myProfileId: number;
  members: CommunityCircleMemberRow[];
  checkins: CommunityCircleCheckinRow[];
};

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchMyCircles(): Promise<CommunityCircleSummary[]> {
  const response = await apiRequest("GET", "/api/community/circles");
  return (await json<{ circles: CommunityCircleSummary[] }>(response)).circles;
}

export async function createCircle(params: {
  name: string;
  description?: string;
}): Promise<CommunityCircleSummary> {
  const response = await apiRequest("POST", "/api/community/circles", params);
  return json<CommunityCircleSummary>(response);
}

export async function joinCircle(
  inviteCode: string,
): Promise<CommunityCircleSummary> {
  const response = await apiRequest("POST", "/api/community/circles/join", {
    inviteCode,
  });
  return json<CommunityCircleSummary>(response);
}

export async function fetchCircleDetail(
  circleId: number,
): Promise<CommunityCircleDetail> {
  const response = await apiRequest(
    "GET",
    `/api/community/circles/${circleId}`,
  );
  return json<CommunityCircleDetail>(response);
}

export async function postCircleCheckin(
  circleId: number,
  content: string,
): Promise<CommunityCircleCheckinRow> {
  const response = await apiRequest(
    "POST",
    `/api/community/circles/${circleId}/checkins`,
    { content },
  );
  return json<CommunityCircleCheckinRow>(response);
}

export async function leaveCircle(circleId: number): Promise<void> {
  await apiRequest("DELETE", `/api/community/circles/${circleId}/leave`);
}
