import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatService, ChatMessage } from "@/services/chatService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Send, Loader2, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Conversation {
    user_id: string;
    last_message: string;
    unread_count: number;
    last_message_at: string;
    user_name?: string;
    user_email?: string;
}

export const AdminChat = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadConversations = async () => {
        setLoading(true);
        const result = await ChatService.getAllConversations();

        if (result.success && result.data) {
            // Fetch user names for each conversation
            const conversationsWithNames = await Promise.all(
                result.data.map(async (conv) => {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("full_name, email")
                        .eq("id", conv.user_id)
                        .single();

                    return {
                        ...conv,
                        user_name: profile?.full_name || "مستخدم",
                        user_email: profile?.email || "",
                    };
                })
            );
            setConversations(conversationsWithNames);
        } else {
            toast.error("حدث خطأ في جلب المحادثات");
        }
        setLoading(false);
    };

    const loadMessages = async (userId: string) => {
        setLoadingMessages(true);
        setSelectedUserId(userId);

        const result = await ChatService.getUserMessages(userId);
        if (result.success && result.data) {
            setMessages(result.data);
            // Mark messages as read
            await ChatService.markAsRead(userId);
            // Refresh conversations to update unread count
            loadConversations();
        } else {
            toast.error("حدث خطأ في جلب الرسائل");
        }
        setLoadingMessages(false);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUserId) return;

        setSendingMessage(true);
        const result = await ChatService.sendMessage(selectedUserId, newMessage, "admin");

        if (result.success && result.data) {
            setMessages((prev) => [...prev, result.data!]);
            setNewMessage("");
            loadConversations(); // Refresh conversations
        } else {
            toast.error("حدث خطأ في إرسال الرسالة");
        }
        setSendingMessage(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const selectedConversation = conversations.find((c) => c.user_id === selectedUserId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Conversations List */}
            <Card className="glass-dark border-primary/20 shadow-gold md:col-span-1">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        المحادثات
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">
                            لا توجد محادثات
                        </p>
                    ) : (
                        <ScrollArea className="h-[480px]">
                            <div className="space-y-1 p-2">
                                {conversations.map((conv) => (
                                    <button
                                        key={conv.user_id}
                                        onClick={() => loadMessages(conv.user_id)}
                                        className={`w-full text-right p-3 rounded-lg transition-colors ${selectedUserId === conv.user_id
                                                ? "bg-primary/20 border border-primary/30"
                                                : "hover:bg-muted/50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-sm">
                                                {conv.user_name}
                                            </span>
                                            {conv.unread_count > 0 && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {conv.unread_count}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {conv.last_message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(conv.last_message_at), "dd MMM, HH:mm", {
                                                locale: ar,
                                            })}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="glass-dark border-primary/20 shadow-gold md:col-span-2 flex flex-col">
                <CardHeader className="pb-3 border-b border-primary/10">
                    {selectedConversation ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">
                                    {selectedConversation.user_name}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {selectedConversation.user_email}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <CardTitle className="text-lg text-muted-foreground">
                            اختر محادثة للبدء
                        </CardTitle>
                    )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                    {!selectedUserId ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>اختر محادثة من القائمة</p>
                            </div>
                        </div>
                    ) : loadingMessages ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-3">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.sender_type === "admin" ? "justify-start" : "justify-end"
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-lg p-3 ${msg.sender_type === "admin"
                                                        ? "bg-primary/20 text-foreground"
                                                        : "bg-muted text-foreground"
                                                    }`}
                                            >
                                                <p className="text-sm">{msg.message}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {format(new Date(msg.created_at), "HH:mm", { locale: ar })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Message Input */}
                            <div className="p-4 border-t border-primary/10">
                                <div className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="اكتب رسالتك..."
                                        className="flex-1"
                                        disabled={sendingMessage}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sendingMessage}
                                        size="icon"
                                    >
                                        {sendingMessage ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
