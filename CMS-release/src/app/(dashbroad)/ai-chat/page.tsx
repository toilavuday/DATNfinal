"use client";

import ProtectedRoute from "@/shared/providers/auth.provider";
import {
  Bot,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import React, { FormEvent, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  highlights?: string[];
  timestamp: Date;
  intent?: string;
}

// ─── Quick-question suggestions ───────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { label: "📊 Tổng quan kinh doanh tháng này", value: "Cho tôi tổng quan kinh doanh tháng này" },
  { label: "💰 Doanh thu tháng này?", value: "Doanh thu tháng này là bao nhiêu?" },
  { label: "📈 Dự báo kỳ tới", value: "Dự báo doanh thu và lợi nhuận kỳ tới là bao nhiêu?" },
  { label: "🏆 Sản phẩm bán chạy nhất", value: "Sản phẩm nào bán chạy nhất tháng này?" },
  { label: "⚠️ Nguyên liệu sắp hết", value: "Nguyên liệu nào đang sắp hết cần nhập thêm?" },
  { label: "📦 Đề xuất nhập hàng", value: "Tôi nên nhập thêm nguyên liệu gì không?" },
  { label: "👥 Chi phí lương tháng này", value: "Chi phí lương nhân viên tháng này là bao nhiêu?" },
  { label: "✅ Lợi nhuận tháng này?", value: "Lợi nhuận tháng này đang như thế nào?" },
];

// ─── Markdown-like renderer ───────────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    // Bold **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i} className="block">
        {parts.map((part, j) =>
          j % 2 === 1 ? (
            <strong key={j} className="font-semibold text-sky-100">
              {part}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </span>
    );
  });
}

// ─── Page component ───────────────────────────────────────────────────────────

const AiChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Xin chào! 👋 Tôi là **Trợ lý AI Kinh doanh** của cửa hàng.\n\nBạn có thể hỏi tôi bất kỳ điều gì về:\n• Doanh thu & lợi nhuận\n• Sản phẩm bán chạy\n• Tồn kho & nguyên liệu\n• Dự báo ARIMA kỳ tới\n• Chi phí lương nhân viên\n\nHãy thử hỏi tôi một câu hỏi! 💡",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lỗi không xác định");
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || "Không có câu trả lời.",
        highlights: data.highlights,
        timestamp: new Date(data.generatedAt || Date.now()),
        intent: data.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "error",
        content: `⚠️ Lỗi: ${err instanceof Error ? err.message : "Không thể kết nối đến máy chủ phân tích."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex h-[calc(100vh-80px)] flex-col gap-4">
          {/* ── Header ── */}
          <div className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-4 text-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.6)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.25),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.2),_transparent_25%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight">
                      Trợ lý AI Kinh doanh
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Phân tích dữ liệu thực — Dự báo ARIMA — Hỏi bằng tiếng Việt tự nhiên
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-medium text-slate-300">
                  <Sparkles className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-sky-300" />
                  Powered by ARIMA
                </div>
              </div>
            </div>
          </div>

          {/* ── Main chat area ── */}
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden xl:flex-row flex-col">
            {/* Chat window */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-sky-50/60 px-4 py-5 sm:px-6">
                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  {messages.map((msg) => {
                    if (msg.role === "user") {
                      return (
                        <div
                          key={msg.id}
                          className="flex justify-end"
                        >
                          <div className="flex max-w-[80%] flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {formatTime(msg.timestamp)}
                              </span>
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="rounded-3xl rounded-tr-md bg-slate-900 px-4 py-3 text-sm text-white shadow-sm">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.role === "error") {
                      return (
                        <div key={msg.id} className="flex justify-start">
                          <div className="max-w-[80%] rounded-3xl rounded-tl-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="flex max-w-[88%] flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-sky-600">
                              Trợ lý AI
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>

                          <div className="rounded-3xl rounded-tl-md bg-slate-900 px-5 py-4 text-sm leading-7 text-slate-200 shadow-sm">
                            {renderMarkdown(msg.content)}
                          </div>

                          {msg.highlights && msg.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-2 pl-1">
                              {msg.highlights.map((h, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="rounded-3xl rounded-tl-md bg-slate-900 px-5 py-4 shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                            <span className="text-sm text-slate-400">
                              Đang phân tích dữ liệu...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messageEndRef} />
                </div>
              </div>

              {/* Input area */}
              <form
                onSubmit={handleSubmit}
                className="border-t border-slate-200/80 bg-white/90 p-4"
              >
                <div className="mx-auto flex max-w-3xl items-end gap-3">
                  <textarea
                    ref={textareaRef}
                    id="ai-chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Hỏi về doanh thu, lợi nhuận, tồn kho... (Enter để gửi)"
                    disabled={loading}
                    className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    id="ai-chat-send-btn"
                    disabled={!input.trim() || loading}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Gửi câu hỏi"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Quick questions sidebar */}
            <aside className="w-full rounded-[28px] border border-white/70 bg-white/75 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur xl:w-72">
              <div className="p-5">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                  <Lightbulb className="h-4 w-4" />
                  Câu hỏi gợi ý
                </div>
                <p className="mb-4 text-xs text-slate-500">
                  Nhấn vào các gợi ý bên dưới để hỏi nhanh:
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      id={`ai-quick-q-${i}`}
                      type="button"
                      onClick={() => void sendMessage(q.value)}
                      disabled={loading}
                      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="mx-4 mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold text-violet-700">
                  💡 Về Trợ lý AI này
                </p>
                <p className="mt-1.5 text-xs text-violet-600 leading-5">
                  Phân tích dữ liệu thực từ hệ thống. Dự báo sử dụng mô hình{" "}
                  <strong>ARIMA</strong>. Câu trả lời phản ánh tình trạng kinh doanh hiện tại.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default AiChatPage;
