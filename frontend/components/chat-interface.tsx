"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Brain, Send, Plus, MessageSquare, Trash2, Settings, User, Bot, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelSelector } from "@/components/model-selector"
import { BACKEND_URL } from "@/config"
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  formattedTimestamp: string; 
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}
export function ChatInterface() {
    const initialTimestamp = new Date();
    const initialFormattedTimestamp = format(initialTimestamp, 'HH:mm:ss');
    const [conversations, setConversations] = useState<Conversation[]>([
        {
            id: "1",
            title: "Welcome to NexusAI",
            messages: [
                {
                    id: "1",
                    content: "Hello! I'm your AI assistant. How can I help you today?",
                    role: "assistant",
                    timestamp: initialTimestamp,
                    formattedTimestamp: initialFormattedTimestamp, // Use fixed formatted timestamp
                },
            ],
            updatedAt: initialTimestamp,
        },
    ]);
    const [activeConversationId, setActiveConversationId] = useState("1");
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedModel, setSelectedModel] = useState("gpt-4o");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find((c) => c.id === activeConversationId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeConversation?.messages]);

    const createNewConversation = () => {
        const now = new Date();
        const newConversation: Conversation = {
            id: Date.now().toString(),
            title: "New Conversation",
            messages: [],
            updatedAt: now,
        };
        setConversations([newConversation, ...conversations]);
        setActiveConversationId(newConversation.id);
    };

    const deleteConversation = (conversationId: string) => {
        const updatedConversations = conversations.filter((c) => c.id !== conversationId);
        setConversations(updatedConversations);

        if (activeConversationId === conversationId && updatedConversations.length > 0) {
            setActiveConversationId(updatedConversations[0].id);
        } else if (updatedConversations.length === 0) {
            createNewConversation();
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const now = new Date();
        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputMessage,
            role: "user",
            timestamp: now,
            formattedTimestamp: format(now, 'HH:mm:ss'), // Pre-format
        };

        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === activeConversationId
                    ? {
                        ...conv,
                        messages: [...conv.messages, userMessage],
                        title: conv.messages.length === 0 ? inputMessage.slice(0, 30) + "..." : conv.title,
                        updatedAt: now,
                    }
                    : conv,
            ),
        );

        const currentMessage = inputMessage;
        setInputMessage("");
        setIsLoading(true);

        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
            id: assistantMessageId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
            formattedTimestamp: format(new Date(), 'HH:mm:ss'), // Pre-format
        };

        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === activeConversationId
                    ? {
                        ...conv,
                        messages: [...conv.messages, assistantMessage],
                        updatedAt: new Date(),
                    }
                    : conv,
            ),
        );

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: currentMessage,
                    conversationId: activeConversationId !== "1" ? activeConversationId : undefined,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("No response body reader available");
            }

            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.done) {
                                break;
                            }

                            if (data.content) {
                                accumulatedContent += data.content;

                                setConversations((prev) =>
                                    prev.map((conv) =>
                                        conv.id === activeConversationId
                                            ? {
                                                ...conv,
                                                messages: conv.messages.map((msg) =>
                                                    msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg,
                                                ),
                                                updatedAt: new Date(),
                                            }
                                            : conv,
                                    ),
                                );
                            }
                        } catch (parseError) {
                            console.error("Error parsing SSE data:", parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);

            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === activeConversationId
                        ? {
                            ...conv,
                            messages: conv.messages.map((msg) =>
                                msg.id === assistantMessageId
                                    ? { ...msg, content: "Sorry, I encountered an error. Please try again." }
                                    : msg,
                            ),
                            updatedAt: new Date(),
                        }
                        : conv,
                ),
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const loadConversations = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/ai/conversations`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.conversation && data.conversation.length > 0) {
                    const formattedConversations = data.conversation.map((conv: Conversation) => ({
                        id: conv.id,
                        title: conv.title,
                        messages: [],
                        updatedAt: new Date(conv.updatedAt),
                    }));
                    setConversations(formattedConversations);
                    setActiveConversationId(formattedConversations[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
    };

    const loadConversationMessages = async (conversationId: string) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/ai/conversations/${conversationId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.conversation && data.conversation.messages) {
                    const formattedMessages = data.conversation.messages.map((msg: Message) => {
                        const roleLower = String(msg.role || "").toLowerCase();
                        const role: "user" | "assistant" =
                            roleLower === "agent" || roleLower === "assistant" ? "assistant" : "user";

                        return {
                            id: msg.id,
                            content: msg.content,
                            role,
                            timestamp: new Date(msg.timestamp),
                            formattedTimestamp: format(new Date(msg.timestamp), 'HH:mm:ss'), // Pre-format
                        } as Message;
                    });

                    setConversations((prev) =>
                        prev.map((conv) => (conv.id === conversationId ? { ...conv, messages: formattedMessages } : conv)),
                    );
                }
            }
        } catch (error) {
            console.error("Error loading conversation messages:", error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            loadConversations();
        }
    }, []);

    useEffect(() => {
        if (activeConversationId && activeConversationId !== "1") {
            const conversation = conversations.find((c) => c.id === activeConversationId);
            if (conversation && conversation.messages.length === 0) {
                loadConversationMessages(activeConversationId);
            }
        }
    }, [activeConversationId]);

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div
                className={cn(
                    "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
                    sidebarOpen ? "w-80" : "w-0 overflow-hidden",
                )}
            >
                <div className="p-4 border-b border-sidebar-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Brain className="h-6 w-6 text-sidebar-primary" />
                            <span className="font-semibold text-sidebar-foreground">NexusAI</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(false)}
                            className="text-sidebar-foreground hover:text-sidebar-primary lg:hidden"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        onClick={createNewConversation}
                        className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                </div>
                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-2">
                        {conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={cn(
                                    "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                                    activeConversationId === conversation.id
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                                )}
                                onClick={() => setActiveConversationId(conversation.id)}
                            >
                                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{conversation.title}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteConversation(conversation.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-sidebar-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-sidebar-border">
                    <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        {!sidebarOpen && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarOpen(true)}
                                className="text-foreground hover:text-primary"
                            >
                                <Menu className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="font-semibold text-card-foreground">{activeConversation?.title || "New Conversation"}</h1>
                    </div>
                    <ModelSelector selectedModel={selectedModel} onModelSelect={setSelectedModel} />
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {activeConversation?.messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}
                            >
                                {message.role === "assistant" && (
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[70%] rounded-lg p-4 text-sm leading-relaxed",
                                        message.role === "user"
                                            ? "bg-muted text-muted-foreground ml-auto"
                                            : "bg-card text-card-foreground border border-border",
                                    )}
                                >
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                    <div className="text-xs opacity-50 mt-2">{message.formattedTimestamp}</div>
                                </div>
                                {message.role === "user" && (
                                    <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                        <User className="h-4 w-4 text-secondary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 justify-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <div className="bg-card text-card-foreground border border-border rounded-lg p-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-border bg-card">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message here..."
                                    className="min-h-[44px] pr-12 bg-input border-border resize-none"
                                    disabled={isLoading}
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!inputMessage.trim() || isLoading}
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 text-center">
                            Press Enter to send, Shift + Enter for new line
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
