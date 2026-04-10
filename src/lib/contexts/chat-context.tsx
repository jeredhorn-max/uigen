"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
  useMemo,
  FormEvent,
  ChangeEvent,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: any[];
}

interface ChatContextType {
  messages: any[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [input, setInput] = useState("");

  // Keep a ref to the latest fileSystem so the transport body is always fresh
  const fileSystemRef = useRef(fileSystem);
  useEffect(() => {
    fileSystemRef.current = fileSystem;
  }, [fileSystem]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          files: fileSystemRef.current.serialize(),
          projectId,
        }),
      }),
    [projectId]
  );

  const processedToolCallIds = useRef<Set<string>>(new Set());

  const { messages, sendMessage, status } = useAIChat({
    messages: initialMessages as UIMessage[],
    transport,
  });

  // Sync tool invocations to the client-side file system.
  // In AI SDK v5, server-side tool results appear in message parts with type
  // "tool-{toolName}" (e.g. "tool-str_replace_editor"), input field for args,
  // and state "input-available" or "output-available".
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant" || !message.parts) continue;
      for (const part of message.parts as any[]) {
        if (!part.type?.startsWith("tool-")) continue;
        // Apply once args are fully available
        if (part.state !== "input-available" && part.state !== "output-available") continue;
        if (processedToolCallIds.current.has(part.toolCallId)) continue;
        processedToolCallIds.current.add(part.toolCallId);
        const toolName = part.type.split("-").slice(1).join("-");
        handleToolCall({ toolName, args: part.input });
      }
    }
  }, [messages, handleToolCall]);

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <ChatContext.Provider
      value={{
        messages: messages as any,
        input,
        handleInputChange,
        handleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
