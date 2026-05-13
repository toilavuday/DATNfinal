import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Employees } from "@/shared/types/user";
import {
  COMMUNITY_CONVERSATION_ID,
  COMMUNITY_CONVERSATION_TITLE,
  getDirectConversationId,
  StaffChatConversationSummary,
  StaffChatMember,
  StaffChatMessage,
  StaffScheduleChoice,
  StaffSchedulePeriod,
  StaffSchedulePayload,
  toStaffChatMember,
} from "@/shared/utils/staff-chat";

export const dynamic = "force-dynamic";

interface StaffChatStore {
  members: StaffChatMember[];
  messages: StaffChatMessage[];
  readState: Record<string, Record<string, string>>;
}

type StaffChatAction = "message" | "schedule" | "shift-choice";

declare global {
  // eslint-disable-next-line no-var
  var __cmsStaffChatStore: StaffChatStore | undefined;
}

const STORAGE_PATH = path.join(process.cwd(), "data", "staff-chat.json");

const saveStore = (store: StaffChatStore) => {
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save staff chat store:", error);
  }
};

const getStore = () => {
  if (!globalThis.__cmsStaffChatStore) {
    let initialStore: StaffChatStore = {
      members: [],
      messages: [],
      readState: {},
    };

    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const data = fs.readFileSync(STORAGE_PATH, "utf-8");
        initialStore = JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load staff chat store:", error);
    }

    globalThis.__cmsStaffChatStore = initialStore;
  }

  globalThis.__cmsStaffChatStore.readState =
    globalThis.__cmsStaffChatStore.readState || {};
  globalThis.__cmsStaffChatStore.messages =
    globalThis.__cmsStaffChatStore.messages.map((message) => ({
      ...message,
      conversationId: message.conversationId || COMMUNITY_CONVERSATION_ID,
    }));

  return globalThis.__cmsStaffChatStore;
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createSystemMessage = (content: string): StaffChatMessage => ({
  id: createId("system"),
  kind: "system",
  conversationId: COMMUNITY_CONVERSATION_ID,
  authorName: "Hệ thống",
  content,
  createdAt: new Date().toISOString(),
});

const appendMessages = (store: StaffChatStore, messages: StaffChatMessage[]) => {
  store.messages = [...store.messages, ...messages].slice(-5000);
  saveStore(store);
};

const getConversationMessages = (store: StaffChatStore, conversationId: string) =>
  store.messages.filter(
    (message) =>
      (message.conversationId || COMMUNITY_CONVERSATION_ID) === conversationId,
  );

const markConversationRead = (
  store: StaffChatStore,
  memberId: string | null,
  conversationId: string,
) => {
  if (!memberId) return;

  store.readState[memberId] = {
    ...(store.readState[memberId] || {}),
    [conversationId]: new Date().toISOString(),
  };
  saveStore(store);
};

const countUnreadMessages = (
  store: StaffChatStore,
  memberId: string | null,
  conversationId: string,
) => {
  if (!memberId) return 0;

  const readAt = store.readState[memberId]?.[conversationId];
  const readAtTime = readAt ? new Date(readAt).getTime() : 0;

  return getConversationMessages(store, conversationId).filter((message) => {
    if (message.memberId === memberId) return false;
    return new Date(message.createdAt).getTime() > readAtTime;
  }).length;
};

const resolveMemberId = (store: StaffChatStore, rawMemberId?: string | null) => {
  if (!rawMemberId) return null;

  const member = store.members.find(
    (item) => item.id === rawMemberId || item.email === rawMemberId,
  );

  return member?.id || rawMemberId;
};

const isDirectConversationForMember = (conversationId: string, memberId: string | null) => {
  if (!memberId || !conversationId.startsWith("direct-")) return true;
  return conversationId.includes(memberId);
};

const getMessagePreview = (message?: StaffChatMessage) => {
  if (!message) return "Chưa có tin nhắn";
  if (message.kind === "schedule") return "Lịch làm việc và lựa chọn ca";
  return message.content || "Tin nhắn";
};

const buildConversations = (
  store: StaffChatStore,
  currentMemberId: string | null,
): StaffChatConversationSummary[] => {
  const communityMessages = getConversationMessages(store, COMMUNITY_CONVERSATION_ID);
  const lastCommunityMessage = communityMessages[communityMessages.length - 1];
  const conversations: StaffChatConversationSummary[] = [
    {
      id: COMMUNITY_CONVERSATION_ID,
      type: "community",
      title: COMMUNITY_CONVERSATION_TITLE,
      subtitle: `${store.members.length} thành viên`,
      memberIds: store.members.map((member) => member.id),
      unreadCount: countUnreadMessages(store, currentMemberId, COMMUNITY_CONVERSATION_ID),
      lastMessageAt: lastCommunityMessage?.createdAt,
      lastMessagePreview: getMessagePreview(lastCommunityMessage),
    },
  ];

  if (!currentMemberId) return conversations;

  const currentMember = store.members.find((member) => member.id === currentMemberId);
  const directConversations = store.members
    .filter((member) => member.id !== currentMemberId)
    .map((member): StaffChatConversationSummary => {
      const conversationId = getDirectConversationId(currentMemberId, member.id);
      const directMessages = getConversationMessages(store, conversationId);
      const lastMessage = directMessages[directMessages.length - 1];

      return {
        id: conversationId,
        type: "direct",
        title: member.displayName,
        subtitle: member.email || "Tin nhắn riêng",
        memberIds: [currentMemberId, member.id],
        unreadCount: countUnreadMessages(store, currentMemberId, conversationId),
        lastMessageAt: lastMessage?.createdAt,
        lastMessagePreview: getMessagePreview(lastMessage),
        image: member.image,
      };
    });

  if (currentMember && !store.members.some((member) => member.id === currentMemberId)) {
    conversations.push({
      id: getDirectConversationId(currentMemberId, currentMember.id),
      type: "direct",
      title: currentMember.displayName,
      subtitle: currentMember.email || "Tin nhắn riêng",
      memberIds: [currentMemberId, currentMember.id],
      unreadCount: 0,
      lastMessagePreview: "Chưa có tin nhắn",
      image: currentMember.image,
    });
  }

  return [...conversations, ...directConversations].sort((a, b) => {
    if (a.id === COMMUNITY_CONVERSATION_ID) return -1;
    if (b.id === COMMUNITY_CONVERSATION_ID) return 1;
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime || a.title.localeCompare(b.title, "vi");
  });
};

const syncRoster = (store: StaffChatStore, employees: Employees[]) => {
  const nextMembers = employees
    .map(toStaffChatMember)
    .filter((member): member is StaffChatMember => Boolean(member));

  if (!store.members.length) {
    store.members = nextMembers;
    return;
  }

  const previousById = new Map(store.members.map((member) => [member.id, member]));
  const nextById = new Map(nextMembers.map((member) => [member.id, member]));
  const systemMessages: StaffChatMessage[] = [];

  nextMembers.forEach((member) => {
    const previous = previousById.get(member.id);
    if (!previous) {
      systemMessages.push(
        createSystemMessage(`${member.displayName} đã được thêm vào ${COMMUNITY_CONVERSATION_TITLE}.`),
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

  store.members.forEach((member) => {
    if (!nextById.has(member.id)) {
      systemMessages.push(
        createSystemMessage(`${member.displayName} đã được xóa khỏi ${COMMUNITY_CONVERSATION_TITLE}.`),
      );
    }
  });

  store.members = nextMembers;
  if (systemMessages.length) appendMessages(store, systemMessages);
  saveStore(store);
};

const fetchEmployees = async (request: NextRequest) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) return [];

  const headers: Record<string, string> = {};
  const authorization = request.headers.get("authorization");
  if (authorization) headers.Authorization = authorization;

  const response = await fetch(new URL("/user", apiBaseUrl).toString(), {
    cache: "no-store",
    headers,
  });

  if (!response.ok) return [];
  return (await response.json()) as Employees[];
};

const getSyncedStore = async (request: NextRequest) => {
  const store = getStore();
  const employees = await fetchEmployees(request);
  if (employees.length) syncRoster(store, employees);
  return store;
};

const resolveConversationId = (
  requestedConversationId: string | null,
  currentMemberId: string | null,
) => {
  if (!requestedConversationId) return COMMUNITY_CONVERSATION_ID;
  if (requestedConversationId === COMMUNITY_CONVERSATION_ID) return requestedConversationId;
  if (!isDirectConversationForMember(requestedConversationId, currentMemberId)) {
    return COMMUNITY_CONVERSATION_ID;
  }
  return requestedConversationId;
};

const buildResponse = (
  store: StaffChatStore,
  currentMemberId: string | null,
  conversationId: string,
) => ({
  members: store.members,
  conversations: buildConversations(store, currentMemberId),
  activeConversationId: conversationId,
  messages: getConversationMessages(store, conversationId),
});

export async function GET(request: NextRequest) {
  const store = await getSyncedStore(request);
  const { searchParams } = new URL(request.url);
  const currentMemberId = resolveMemberId(store, searchParams.get("memberId"));
  const conversationId = resolveConversationId(
    searchParams.get("conversationId"),
    currentMemberId,
  );

  if (searchParams.get("markRead") === "true") {
    markConversationRead(store, currentMemberId, conversationId);
  }

  return NextResponse.json(buildResponse(store, currentMemberId, conversationId));
}

const ensureDirectConversationAccess = (
  conversationId: string,
  memberId?: string,
) => {
  if (conversationId === COMMUNITY_CONVERSATION_ID) return true;
  if (!memberId) return false;
  return conversationId.startsWith("direct-") && conversationId.includes(memberId);
};

const createScheduleMessage = (
  body: {
    authorName?: string;
    memberId?: string;
    period?: StaffSchedulePeriod;
    periodValue?: string;
    targetMemberId?: string;
    shiftOptions?: string[];
    note?: string;
  },
  members: StaffChatMember[],
) => {
  const targetMemberId = body.targetMemberId || "all";
  const targetName =
    targetMemberId === "all"
      ? "Tất cả nhân viên"
      : members.find((member) => member.id === targetMemberId)?.displayName || "Nhân viên";
  const period = body.period === "month" ? "month" : body.period === "day" ? "day" : "week";
  const periodLabel = period === "month" ? "tháng" : period === "day" ? "ngày" : "tuần";
  const shiftOptions =
    body.shiftOptions?.map((item) => item.trim()).filter(Boolean).slice(0, 8) || [];
  const schedule: StaffSchedulePayload = {
    period,
    periodValue: body.periodValue || "",
    targetMemberId,
    targetName,
    shiftOptions: shiftOptions.length ? shiftOptions : ["Ca sáng", "Ca chiều", "Ca tối"],
    note: body.note?.trim(),
    choices: [],
  };

  return {
    id: createId("schedule"),
    kind: "schedule" as const,
    conversationId: COMMUNITY_CONVERSATION_ID,
    memberId: body.memberId,
    authorName: body.authorName || "Quản lý",
    content: `Đã gửi lịch làm việc theo ${periodLabel} cho ${targetName}.`,
    createdAt: new Date().toISOString(),
    schedule,
  };
};

const updateScheduleChoice = (
  store: StaffChatStore,
  body: {
    messageId?: string;
    memberId?: string;
    memberName?: string;
    shift?: string;
  },
) => {
  const message = store.messages.find(
    (item) => item.id === body.messageId && item.kind === "schedule",
  );

  if (!message?.schedule || !body.memberId || !body.shift) {
    return false;
  }

  const canChoose =
    message.schedule.targetMemberId === "all" ||
    message.schedule.targetMemberId === body.memberId;

  if (!canChoose || !message.schedule.shiftOptions.includes(body.shift)) {
    return false;
  }

  const nextChoice: StaffScheduleChoice = {
    memberId: body.memberId,
    memberName: body.memberName || "Nhân viên",
    shift: body.shift,
    chosenAt: new Date().toISOString(),
  };

  message.schedule.choices = [
    ...message.schedule.choices.filter((choice) => choice.memberId !== body.memberId),
    nextChoice,
  ];

  saveStore(store);
  return true;
};

export async function POST(request: NextRequest) {
  const store = await getSyncedStore(request);
  const body = (await request.json().catch(() => null)) as {
    action?: StaffChatAction;
    content?: string;
    memberId?: string;
    authorName?: string;
    authorRole?: string;
    conversationId?: string;
    messageId?: string;
    period?: StaffSchedulePeriod;
    periodValue?: string;
    targetMemberId?: string;
    shiftOptions?: string[];
    note?: string;
    shift?: string;
    memberName?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const action = body.action || "message";
  const resolvedMemberId = resolveMemberId(store, body.memberId);
  const conversationId = resolveConversationId(
    body.conversationId || COMMUNITY_CONVERSATION_ID,
    resolvedMemberId,
  );

  if (action === "shift-choice") {
    const updated = updateScheduleChoice(store, {
      ...body,
      memberId: resolvedMemberId || undefined,
    });
    if (!updated) {
      return NextResponse.json({ message: "Khong the chon ca lam." }, { status: 400 });
    }
    markConversationRead(store, resolvedMemberId, COMMUNITY_CONVERSATION_ID);
    return NextResponse.json(
      buildResponse(store, resolvedMemberId, COMMUNITY_CONVERSATION_ID),
    );
  }

  if (action === "schedule") {
    if (String(body.authorRole || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ message: "Chi quan ly duoc gui lich." }, { status: 403 });
    }

    const scheduleMessage = createScheduleMessage(
      {
        ...body,
        memberId: resolvedMemberId || undefined,
      },
      store.members,
    );
    appendMessages(store, [scheduleMessage]);
    markConversationRead(store, resolvedMemberId, COMMUNITY_CONVERSATION_ID);

    return NextResponse.json(
      buildResponse(store, resolvedMemberId, COMMUNITY_CONVERSATION_ID),
    );
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ message: "No message content." }, { status: 400 });
  }

  if (!ensureDirectConversationAccess(conversationId, resolvedMemberId || undefined)) {
    return NextResponse.json({ message: "Invalid conversation." }, { status: 403 });
  }

  const member = store.members.find((item) => item.id === resolvedMemberId);
  const message: StaffChatMessage = {
    id: createId("msg"),
    kind: "user",
    conversationId,
    memberId: member?.id || resolvedMemberId || undefined,
    authorName: member?.displayName || body.authorName || "Nhân viên",
    content,
    createdAt: new Date().toISOString(),
  };

  appendMessages(store, [message]);
  markConversationRead(store, resolvedMemberId, conversationId);

  return NextResponse.json(buildResponse(store, resolvedMemberId, conversationId));
}
