"use client";

import ProtectedRoute from "@/shared/providers/auth.provider";
import { authState } from "@/shared/store/Atoms/auth";
import {
  COMMUNITY_CONVERSATION_ID,
  COMMUNITY_CONVERSATION_TITLE,
  formatStaffChatDisplayName,
  getDirectConversationId,
  getStoredStaffChatMembers,
  getStoredStaffChatMessages,
  persistStaffChatMembers,
  persistStaffChatMessages,
  publishStaffChatEvent,
  STAFF_CHAT_CHANNEL,
  StaffChatConversationSummary,
  StaffChatMember,
  StaffChatMessage,
  StaffSchedulePeriod,
  toStaffChatMember,
} from "@/shared/utils/staff-chat";
import {
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  SendHorizonal,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import localeData from "dayjs/plugin/localeData";
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(localeData);
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRecoilValue } from "recoil";

const DEFAULT_SHIFT_OPTIONS = "Ca 1, Ca 2, Ca 3";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getConversationAvatar = (conversation: StaffChatConversationSummary) => {
  if (conversation.type === "community") return null;
  return conversation.image || null;
};

const MessagePage = () => {
  const auth = useRecoilValue(authState);
  const [members, setMembers] = useState<StaffChatMember[]>([]);
  const [conversations, setConversations] = useState<StaffChatConversationSummary[]>([]);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(COMMUNITY_CONVERSATION_ID);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [schedulePeriod, setSchedulePeriod] = useState<StaffSchedulePeriod>("week");
  const [schedulePeriodValue, setSchedulePeriodValue] = useState("");
  const [scheduleTargetMemberId, setScheduleTargetMemberId] = useState("all");
  const [scheduleShiftOptions, setScheduleShiftOptions] = useState(DEFAULT_SHIFT_OPTIONS);
  const [scheduleNote, setScheduleNote] = useState("");
  const [showScheduleComposer, setShowScheduleComposer] = useState(true);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const rawCurrentMemberId = auth.user?.id || auth.user?.email || "";

  const loadStoredChat = useCallback(() => {
    setMembers(getStoredStaffChatMembers());
    setMessages(getStoredStaffChatMessages());
  }, []);

  const currentMember = useMemo(() => {
    if (!auth.user) return null;

    const syncedMember = members.find(
      (member) =>
        member.id === rawCurrentMemberId ||
        Boolean(auth.user?.email && member.email === auth.user.email),
    );
    if (syncedMember) return syncedMember;

    return toStaffChatMember(auth.user);
  }, [auth.user, rawCurrentMemberId, members]);

  const currentMemberId = currentMember?.id || rawCurrentMemberId;
  const isAdmin =
    String(auth.user?.role || currentMember?.role || "").toUpperCase() === "ADMIN";

  const applyChatResponse = useCallback(
    (result: {
      members?: StaffChatMember[];
      conversations?: StaffChatConversationSummary[];
      messages?: StaffChatMessage[];
      activeConversationId?: string;
    }) => {
      const nextMembers = Array.isArray(result.members) ? result.members : [];
      const nextConversations = Array.isArray(result.conversations)
        ? result.conversations
        : [];
      const nextMessages = Array.isArray(result.messages) ? result.messages : [];

      setMembers(nextMembers);
      setConversations(nextConversations);
      setMessages(nextMessages);
      persistStaffChatMembers(nextMembers);
      persistStaffChatMessages(nextMessages);

      if (result.activeConversationId) {
        setActiveConversationId(result.activeConversationId);
      }
    },
    [],
  );

  const syncChat = useCallback(
    async (conversationId = activeConversationId, markRead = true) => {
      setSyncing(true);
      try {
        const token = localStorage.getItem("authToken");
        const params = new URLSearchParams({
          conversationId,
          markRead: markRead ? "true" : "false",
        });
        if (currentMemberId) params.set("memberId", currentMemberId);

        const response = await fetch(`/api/staff-chat?${params.toString()}`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error(`Staff chat sync returned ${response.status}`);
        }

        applyChatResponse(await response.json());
      } catch (error) {
        console.error("Không thể đồng bộ tin nhắn nhân viên:", error);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [activeConversationId, applyChatResponse, currentMemberId],
  );

  useEffect(() => {
    loadStoredChat();
  }, [loadStoredChat]);

  useEffect(() => {
    void syncChat(activeConversationId, true);

    const interval = window.setInterval(() => {
      void syncChat(activeConversationId, true);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeConversationId, syncChat]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(STAFF_CHAT_CHANNEL);
    channel.onmessage = () => {
      void syncChat(activeConversationId, true);
    };

    return () => {
      channel.close();
    };
  }, [activeConversationId, syncChat]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeConversationId]);

  const activeMembers = useMemo(
    () => [...members].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi")),
    [members],
  );

  const sidebarConversations = useMemo(() => {
    const existingById = new Map(
      conversations.map((conversation) => [conversation.id, conversation]),
    );
    const existingCommunity = existingById.get(COMMUNITY_CONVERSATION_ID);
    const communityConversation: StaffChatConversationSummary = {
      id: COMMUNITY_CONVERSATION_ID,
      type: "community",
      title: COMMUNITY_CONVERSATION_TITLE,
      subtitle: `${activeMembers.length} thành viên`,
      memberIds: activeMembers.map((member) => member.id),
      unreadCount: existingCommunity?.unreadCount || 0,
      lastMessageAt: existingCommunity?.lastMessageAt,
      lastMessagePreview:
        existingCommunity?.lastMessagePreview || "Nhóm chung của cửa hàng",
    };

    const directConversations = currentMemberId
      ? activeMembers
          .filter((member) => member.id !== currentMemberId)
          .map((member): StaffChatConversationSummary => {
            const conversationId = getDirectConversationId(currentMemberId, member.id);
            const existing = existingById.get(conversationId);

            return {
              id: conversationId,
              type: "direct",
              title: existing?.title || member.displayName,
              subtitle: existing?.subtitle || member.email || "Tin nhắn riêng",
              memberIds: [currentMemberId, member.id],
              unreadCount: existing?.unreadCount || 0,
              lastMessageAt: existing?.lastMessageAt,
              lastMessagePreview:
                existing?.lastMessagePreview || member.email || "Bắt đầu trò chuyện",
              image: existing?.image || member.image,
            };
          })
      : [];

    return [
      communityConversation,
      ...directConversations.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime || a.title.localeCompare(b.title, "vi");
      }),
    ];
  }, [activeMembers, conversations, currentMemberId]);

  const activeConversation = useMemo(
    () =>
      sidebarConversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) || sidebarConversations[0],
    [activeConversationId, sidebarConversations],
  );

  const totalUnreadCount = useMemo(
    () =>
      sidebarConversations.reduce(
        (total, conversation) => total + Number(conversation.unreadCount || 0),
        0,
      ),
    [sidebarConversations],
  );

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
    void syncChat(conversationId, true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = messageText.trim();
    if (!content || !currentMember || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/staff-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "message",
          content,
          memberId: currentMember.id,
          authorName: currentMember.displayName,
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Staff chat send returned ${response.status}`);
      }

      applyChatResponse(await response.json());
      publishStaffChatEvent();
      setMessageText("");
    } catch (error) {
      console.error("Không thể gửi tin nhắn nhân viên:", error);
    } finally {
      setSending(false);
    }
  };

  const handleScheduleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentMember || !isAdmin || sending) return;

    const shiftOptions = scheduleShiftOptions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setSending(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/staff-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "schedule",
          memberId: currentMember.id,
          authorName: currentMember.displayName,
          authorRole: auth.user?.role,
          conversationId: COMMUNITY_CONVERSATION_ID,
          period: schedulePeriod,
          periodValue: schedulePeriodValue,
          targetMemberId: scheduleTargetMemberId,
          shiftOptions,
          note: scheduleNote,
        }),
      });

      if (!response.ok) {
        throw new Error(`Staff schedule send returned ${response.status}`);
      }

      applyChatResponse(await response.json());
      publishStaffChatEvent();
      setActiveConversationId(COMMUNITY_CONVERSATION_ID);
      setScheduleNote("");
    } catch (error) {
      console.error("Không thể gửi lịch làm việc:", error);
    } finally {
      setSending(false);
    }
  };

  const handleShiftChoice = async (messageId: string, shift: string) => {
    if (!currentMember || sending) return;

    const targetMessage = messages.find((m) => m.id === messageId);
    if (!targetMessage || !targetMessage.schedule) return;

    const currentChoice = targetMessage.schedule.choices.find(
      (c) => c.memberId === currentMember.id,
    );

    const isChanging = currentChoice && currentChoice.shift !== shift;
    const isSame = currentChoice && currentChoice.shift === shift;

    if (isSame) return;

    const confirmMessage = isChanging
      ? `Bạn có chắc chắn muốn đổi từ ${currentChoice.shift} sang ${shift} không?`
      : `Bạn có chắc chắn muốn nhận ${shift} ${
          targetMessage.schedule.period === "day"
            ? `vào ngày ${targetMessage.schedule.periodValue}`
            : ""
        } không?`;

    if (!window.confirm(confirmMessage)) return;

    setSending(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/staff-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "shift-choice",
          messageId,
          memberId: currentMember.id,
          memberName: currentMember.displayName,
          shift,
        }),
      });

      if (!response.ok) {
        throw new Error(`Shift choice returned ${response.status}`);
      }

      applyChatResponse(await response.json());
      publishStaffChatEvent();

      if (targetMessage.schedule.period) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
          const dates: string[] = [];
          const periodValue = targetMessage.schedule.periodValue;

          if (targetMessage.schedule.period === "day") {
            dates.push(dayjs(periodValue).startOf("day").toISOString());
          } else if (targetMessage.schedule.period === "week") {
            const [year, week] = periodValue.split("-W");
            let d = dayjs().year(parseInt(year)).isoWeek(parseInt(week)).startOf("isoWeek");
            for (let i = 0; i < 7; i++) {
              dates.push(d.startOf("day").toISOString());
              d = d.add(1, "day");
            }
          } else if (targetMessage.schedule.period === "month") {
            let d = dayjs(periodValue).startOf("month");
            const daysInMonth = d.daysInMonth();
            for (let i = 0; i < daysInMonth; i++) {
              dates.push(d.startOf("day").toISOString());
              d = d.add(1, "day");
            }
          }

          // Gửi từng yêu cầu thêm lịch
          await Promise.all(
            dates.map((date) =>
              axios.post(`${apiBaseUrl}/schedule`, {
                userId: currentMember.id,
                date,
                shifts: [shift],
                hoursWorked: 8,
                status: "active",
                notes: isChanging 
                  ? `${currentMember.displayName} đổi ca sang ${shift} từ tin nhắn` 
                  : `${currentMember.displayName} đăng ký từ tin nhắn`,
              })
            )
          );
        } catch (scheduleError) {
          console.error("Không thể tự động thêm lịch làm việc:", scheduleError);
        }
      }
    } catch (error) {
      console.error("Không thể chọn ca làm:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]}>
      <section className="min-h-[calc(100vh-120px)] px-3 py-4 sm:px-4 lg:px-6">
        <div className="flex h-[calc(100vh-150px)] min-h-[640px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.5)] backdrop-blur xl:flex-row">
          <aside className="flex w-full flex-col border-b border-slate-200/80 bg-slate-50/80 xl:w-[360px] xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200/80 p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                <UsersRound className="h-4 w-4" />
                {activeMembers.length} thành viên
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                Tin nhắn nhân viên
              </h1>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    {currentMember
                      ? formatStaffChatDisplayName({
                          name: currentMember.name,
                          role: currentMember.role,
                        })
                      : "Chưa xác định tài khoản"}
                  </span>
                </span>
                {totalUnreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sidebarConversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const avatar = getConversationAvatar(conversation);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleConversationSelect(conversation.id)}
                    className={`mb-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left shadow-sm transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-white/85 text-slate-900 hover:bg-white"
                    }`}
                  >
                    {conversation.type === "community" ? (
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          isActive ? "bg-white/15" : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        <UsersRound className="h-5 w-5" />
                      </div>
                    ) : avatar ? (
                      <div
                        aria-label={conversation.title}
                        className="h-12 w-12 shrink-0 rounded-2xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${avatar})` }}
                      />
                    ) : (
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                          isActive ? "bg-white/15 text-white" : "bg-slate-900 text-white"
                        }`}
                      >
                        {getInitials(conversation.title)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {conversation.title}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1 truncate text-xs ${
                          isActive ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {conversation.lastMessagePreview || conversation.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}

              {!loading && sidebarConversations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-sm text-slate-500">
                  Chưa có cuộc trò chuyện.
                </div>
              )}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/70 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-900">
                      {activeConversation.title}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {messages.length} tin nhắn
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && activeConversationId === COMMUNITY_CONVERSATION_ID && (
                    <button
                      type="button"
                      onClick={() => setShowScheduleComposer((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <CalendarDays className="h-4 w-4" />
                      {showScheduleComposer ? "Ẩn lịch" : "Tạo lịch"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void syncChat(activeConversationId, true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-700 disabled:opacity-60"
                    disabled={syncing}
                    title="Đồng bộ tin nhắn"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {isAdmin &&
                activeConversationId === COMMUNITY_CONVERSATION_ID &&
                showScheduleComposer && (
                <form
                  onSubmit={handleScheduleSubmit}
                  className="grid grid-cols-1 gap-3 rounded-[24px] border border-sky-100 bg-sky-50/70 p-3 md:grid-cols-[150px_170px_1fr_1.2fr_auto]"
                >
                  <div className="md:col-span-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm">
                      <CalendarDays className="h-4 w-4" />
                      Gửi lịch làm việc và tạo lựa chọn ca
                    </div>
                  </div>
                  <select
                    value={schedulePeriod}
                    onChange={(event) =>
                      setSchedulePeriod(event.target.value as StaffSchedulePeriod)
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none"
                  >
                    <option value="day">Theo ngày</option>
                    <option value="week">Theo tuần</option>
                    <option value="month">Theo tháng</option>
                  </select>
                  <input
                    type={schedulePeriod === "day" ? "date" : schedulePeriod}
                    value={schedulePeriodValue}
                    onChange={(event) => setSchedulePeriodValue(event.target.value)}
                    required
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  />
                  <select
                    value={scheduleTargetMemberId}
                    onChange={(event) => setScheduleTargetMemberId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="all">Tất cả nhân viên</option>
                    {activeMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <input
                    value={scheduleShiftOptions}
                    onChange={(event) => setScheduleShiftOptions(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    placeholder="Ca 1, Ca 2, Ca 3"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Gửi lịch
                  </button>
                  <input
                    value={scheduleNote}
                    onChange={(event) => setScheduleNote(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none md:col-span-5"
                    placeholder="Ghi chú lịch làm việc"
                  />
                </form>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_rgba(248,250,252,0.92),_rgba(240,249,255,0.88))] px-4 py-5 sm:px-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {messages.map((message) => {
                  const isOwnMessage =
                    message.kind === "user" &&
                    currentMember &&
                    message.memberId === currentMember.id;

                  if (message.kind === "system") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="max-w-[85%] rounded-full bg-white/85 px-4 py-2 text-center text-xs font-medium text-slate-500 shadow-sm">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  if (message.kind === "schedule" && message.schedule) {
                    const currentChoice = currentMember
                      ? message.schedule.choices.find(
                          (choice) => choice.memberId === currentMember.id,
                        )
                      : undefined;
                    const canChoose =
                      currentMember &&
                      (message.schedule.targetMemberId === "all" ||
                        message.schedule.targetMemberId === currentMember.id);

                    return (
                      <div key={message.id} className="flex justify-start">
                        <div className="w-full max-w-2xl rounded-[26px] border border-sky-100 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Lịch làm việc
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-slate-900">
                                {message.schedule.period === "month"
                                  ? "Lịch theo tháng"
                                  : message.schedule.period === "day"
                                  ? "Lịch theo ngày"
                                  : "Lịch theo tuần"}{" "}
                                {message.schedule.periodValue}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {message.schedule.targetName}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>

                          {message.schedule.note && (
                            <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                              {message.schedule.note}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.schedule.shiftOptions.map((shift) => {
                              const selected = currentChoice?.shift === shift;
                              return (
                                <button
                                  key={shift}
                                  type="button"
                                  disabled={!canChoose || sending}
                                  onClick={() => handleShiftChoice(message.id, shift)}
                                  className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                                    selected
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-700"
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {selected && <CheckCircle2 className="h-4 w-4" />}
                                  {shift}
                                </button>
                              );
                            })}
                          </div>

                          {message.schedule.choices.length > 0 && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Đã chọn ca
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.schedule.choices.map((choice) => (
                                  <span
                                    key={choice.memberId}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                                  >
                                    {choice.memberName}: {choice.shift}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                          isOwnMessage
                            ? "rounded-br-md bg-slate-900 text-white"
                            : "rounded-bl-md bg-white text-slate-800"
                        }`}
                      >
                        <div
                          className={`mb-1 text-xs font-semibold ${
                            isOwnMessage ? "text-sky-100" : "text-sky-700"
                          }`}
                        >
                          {message.authorName}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                        <div
                          className={`mt-2 text-right text-[11px] ${
                            isOwnMessage ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!loading && messages.length === 0 && (
                  <div className="mt-16 flex flex-col items-center text-center text-slate-500">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-sky-600 shadow-sm">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-sm font-medium">Chưa có tin nhắn.</p>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200/80 bg-white/80 p-4"
            >
              <div className="mx-auto flex max-w-4xl items-end gap-3">
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  rows={1}
                  placeholder="Nhập tin nhắn"
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || !currentMember || sending}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  title="Gửi tin nhắn"
                >
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </div>
            </form>
          </main>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default MessagePage;
