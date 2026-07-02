"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoChatResponses, getDemoChatMessages } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  userName: string;
}

export function AiChat({ userName }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    getDemoChatMessages(userName).map((message) => ({ ...message })),
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  function getResponse(question: string) {
    const lower = question.toLowerCase();
    if (lower.includes("medikament")) return demoChatResponses.medikament;
    return demoChatResponses.default;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: getResponse(question) },
      ]);
      setIsTyping(false);
    }, 900);
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="mb-3 rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted">
          Die KI durchsucht alle deine Dokumente und beantwortet deine Fragen.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "assistant" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-foreground",
              )}
            >
              {message.content}
            </div>
            {message.role === "user" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <User className="h-4 w-4 text-slate-600" aria-hidden="true" />
              </span>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
              Analysiere deine Dokumente…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-border bg-background pt-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Frag etwas… z. B. Warum bekomme ich dieses Medikament?"
            className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm outline-none transition-shadow focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" size="lg" className="shrink-0 px-4" disabled={isTyping}>
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Senden</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
