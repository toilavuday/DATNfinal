import type { Employees } from "@/shared/types/user";

export type StaffChatMessageKind = "user" | "system" | "schedule";
export type StaffChatConversationType = "community" | "direct";
export type StaffSchedulePeriod = "week" | "month" | "day";

export const COMMUNITY_CONVERSATION_ID = "community";
export const COMMUNITY_CONVERSATION_TITLE = "Cộng đồng";

export interface StaffChatMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  image?: string | null;
  displayName: string;
}

export interface StaffScheduleChoice {
  memberId: string;
  memberName: string;
  shift: string;
  chosenAt: string;
}

export interface StaffSchedulePayload {
  period: StaffSchedulePeriod;
  periodValue: string;
  targetMemberId: string;
  targetName: string;
  shiftOptions: string[];
  note?: string;
  choices: StaffScheduleChoice[];
}

export interface StaffChatMessage {
  id: string;
  kind: StaffChatMessageKind;
  conversationId: string;
  memberId?: string;
  authorName: string;
  content: string;
  createdAt: string;
  schedule?: StaffSchedulePayload;
}

export interface StaffChatConversationSummary {
  id: string;
  type: StaffChatConversationType;
  title: string;
  subtitle: string;
  memberIds: string[];
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  image?: string | null;
}

export interface StaffChatSyncResult {
  members: StaffChatMember[];
  messages: StaffChatMessage[];
  changed: boolean;
}

const MEMBERS_STORAGE_KEY = "cms-staff-chat-members";
const MESSAGES_STORAGE_KEY = "cms-staff-chat-messages";
export const STAFF_CHAT_CHANNEL = "cms-staff-chat";

const canUseStorage = () => typeof window !== "undefined";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizeRole = (role?: string) => (role || "STAFF").toUpperCase();

export const getRoleLabel = (role?: string) =>
  normalizeRole(role) === "ADMIN" ? "Quản lý" : "Nhân viên";

export const formatStaffChatDisplayName = (employee: Pick<Employees, "name" | "role">) =>
  `${getRoleLabel(employee.role)}_${employee.name || "Chưa đặt tên"}`;

export const getDirectConversationId = (firstMemberId: string, secondMemberId: string) =>
  `direct-${[firstMemberId, secondMemberId].sort().join("--")}`;

export const toStaffChatMember = (employee: Employees): StaffChatMember | null => {
  const id = employee.id || employee.email;
  if (!id) return null;

  return {
    id,
    name: employee.name || employee.email || "Chưa đặt tên",
    role: normalizeRole(employee.role),
    email: employee.email,
    image: typeof employee.image === "string" ? employee.image : null,
    displayName: formatStaffChatDisplayName(employee),
  };
};

const readJson = <T>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const getStoredStaffChatMembers = () =>
  readJson<StaffChatMember[]>(MEMBERS_STORAGE_KEY, []);

export const getStoredStaffChatMessages = () =>
  readJson<StaffChatMessage[]>(MESSAGES_STORAGE_KEY, []);

export const persistStaffChatMessages = (messages: StaffChatMessage[]) => {
  writeJson(MESSAGES_STORAGE_KEY, messages.slice(-5000));
};

export const persistStaffChatMembers = (members: StaffChatMember[]) => {
  writeJson(MEMBERS_STORAGE_KEY, members);
};

export const createStaffChatMessage = (
  member: StaffChatMember,
  content: string,
  conversationId = COMMUNITY_CONVERSATION_ID,
): StaffChatMessage => ({
  id: createId("msg"),
  kind: "user",
  conversationId,
  memberId: member.id,
  authorName: member.displayName,
  content,
  createdAt: new Date().toISOString(),
});

const createSystemMessage = (content: string): StaffChatMessage => ({
  id: createId("system"),
  kind: "system",
  conversationId: COMMUNITY_CONVERSATION_ID,
  authorName: "Hệ thống",
  content,
  createdAt: new Date().toISOString(),
});

export const publishStaffChatEvent = () => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(STAFF_CHAT_CHANNEL);
  channel.postMessage({ type: "sync" });
  channel.close();
};

export const syncStaffChatRoster = (employees: Employees[]): StaffChatSyncResult => {
  const nextMembers = employees
    .map(toStaffChatMember)
    .filter((member): member is StaffChatMember => Boolean(member));
  const previousMembers = getStoredStaffChatMembers();
  const previousMessages = getStoredStaffChatMessages();

  if (!previousMembers.length) {
    persistStaffChatMembers(nextMembers);
    return {
      members: nextMembers,
      messages: previousMessages,
      changed: Boolean(nextMembers.length),
    };
  }

  const nextById = new Map(nextMembers.map((member) => [member.id, member]));
  const previousById = new Map(previousMembers.map((member) => [member.id, member]));
  const systemMessages: StaffChatMessage[] = [];

  nextMembers.forEach((member) => {
    const previous = previousById.get(member.id);
    if (!previous) {
      systemMessages.push(
        createSystemMessage(`${member.displayName} đã được thêm vào nhóm nhân viên.`),
      );
      return;
    }

    if (previous.displayName !== member.displayName) {
      systemMessages.push(
        createSystemMessage(
          `${previous.displayName} đã đổi tên hiển thị thành ${member.displayName}.`,
        ),
      );
    }
  });

  previousMembers.forEach((member) => {
    if (!nextById.has(member.id)) {
      systemMessages.push(
        createSystemMessage(`${member.displayName} đã được xóa khỏi nhóm nhân viên.`),
      );
    }
  });

  const nextMessages = [...previousMessages, ...systemMessages].slice(-5000);
  persistStaffChatMembers(nextMembers);
  if (systemMessages.length) {
    persistStaffChatMessages(nextMessages);
    publishStaffChatEvent();
  }

  return {
    members: nextMembers,
    messages: nextMessages,
    changed: systemMessages.length > 0,
  };
};
