import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageCircle,
    X,
    Send,
    User as UserIcon,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { ChatService, ChatMessage } from '@/services/chatService';
import { toast } from 'sonner';

const Chatbot = () => {
    const { i18n } = useTranslation();
    const { user } = useAuth();
    const { isChatOpen, closeChat } = useChat();
    const isRTL = i18n.language === 'ar';

    const [isMinimized, setIsMinimized] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load existing messages when chat opens
    useEffect(() => {
        if (isChatOpen && user) {
            loadMessages();

            // Subscribe to new messages
            const subscription = ChatService.subscribeToMessages(user.id, (newMessage) => {
                setMessages((prev) => [...prev, newMessage]);
                scrollToBottom();
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isChatOpen, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        if (!user) return;

        setLoading(true);
        const result = await ChatService.getUserMessages(user.id);

        if (result.success && result.data) {
            setMessages(result.data);
        } else if (result.error) {
            toast.error(
                isRTL ? `خطأ في تحميل الرسائل: ${result.error}` : `Error loading messages: ${result.error}`
            );
        }
        setLoading(false);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !user) {
            if (!user) {
                toast.error(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            }
            return;
        }

        const messageText = inputValue.trim();
        setInputValue('');

        const result = await ChatService.sendMessage(user.id, messageText, 'user');

        if (result.success && result.data) {
            setMessages((prev) => [...prev, result.data!]);
            scrollToBottom();
        } else {
            toast.error(
                isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'
            );
            setInputValue(messageText); // Restore the message
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString(isRTL ? 'ar' : 'en', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Quick reply messages in Arabic
    const quickReplies = isRTL ? [
        'مرحباً، أحتاج مساعدة',
        'كيف يمكنني الإيداع؟',
        'كيف يمكنني السحب؟',
        'ما هي الباقات المتاحة؟',
        'كيف أبدأ الاستثمار؟',
        'أريد التحدث مع مسؤول',
        'لدي مشكلة في حسابي',
        'متى يتم التحقق من حسابي؟',
    ] : [
        'Hello, I need help',
        'How can I deposit?',
        'How can I withdraw?',
        'What packages are available?',
        'How do I start investing?',
        'I want to speak with a manager',
        'I have a problem with my account',
        'When will my account be verified?',
    ];

    const handleQuickReply = async (message: string) => {
        if (!user) {
            toast.error(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        const result = await ChatService.sendMessage(user.id, message, 'user');

        if (result.success && result.data) {
            setMessages((prev) => [...prev, result.data!]);
            scrollToBottom();
        } else {
            toast.error(
                isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'
            );
        }
    };

    if (!isChatOpen) {
        return null; // Don't show the chat button when closed, it will be controlled by context
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)]" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card className="shadow-2xl border-0 bg-background/95 backdrop-blur-sm shadow-gold">
                <CardHeader className="pb-3 bg-gold-gradient text-secondary rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">
                                {isRTL ? 'مساعد FIS Gold' : 'FIS Gold Assistant'}
                            </CardTitle>
                            <p className="text-xs opacity-90 font-medium">
                                {user
                                    ? (isRTL ? 'متصل بالإنترنت' : 'Online')
                                    : (isRTL ? 'يرجى تسجيل الدخول' : 'Please login')
                                }
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-8 w-8 p-0 text-secondary hover:bg-black/10"
                            >
                                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={closeChat}
                                className="h-8 w-8 p-0 text-secondary hover:bg-black/10"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <>
                        <CardContent className="p-0">
                            {/* Messages */}
                            <ScrollArea className="h-96 p-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-sm text-muted-foreground">
                                            {isRTL ? 'ابدأ محادثة جديدة' : 'Start a new conversation'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {isRTL ? 'سيتم الرد على رسائلك من قبل الإدارة' : 'Your messages will be answered by admin'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex items-start gap-2 max-w-[80%] ${message.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'
                                                    }`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender_type === 'user'
                                                            ? 'bg-primary'
                                                            : 'bg-muted'
                                                        }`}>
                                                        <UserIcon className={`h-4 w-4 ${message.sender_type === 'user' ? 'text-primary-foreground' : 'text-foreground'
                                                            }`} />
                                                    </div>
                                                    <div className={`rounded-lg p-3 ${message.sender_type === 'user'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted'
                                                        }`}>
                                                        <p className="text-sm whitespace-pre-wrap break-words">
                                                            {message.message}
                                                        </p>
                                                        <p className={`text-xs mt-1 ${message.sender_type === 'user'
                                                                ? 'text-primary-foreground/70'
                                                                : 'text-muted-foreground'
                                                            }`}>
                                                            {formatTime(message.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Quick Replies */}
                            {user && messages.length === 0 && (
                                <div className="p-4 border-t bg-muted/50">
                                    <p className="text-xs font-medium mb-2 text-muted-foreground">
                                        {isRTL ? 'رسائل سريعة:' : 'Quick Replies:'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickReplies.slice(0, 4).map((reply, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleQuickReply(reply)}
                                                className="text-xs h-auto py-2 px-3 whitespace-normal text-right justify-start"
                                            >
                                                {reply}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* More Quick Replies - Shown when user has messages */}
                            {user && messages.length > 0 && (
                                <div className="px-4 pt-2">
                                    <details className="group">
                                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
                                            <span>{isRTL ? '▼ رسائل سريعة' : '▼ Quick Replies'}</span>
                                        </summary>
                                        <div className="grid grid-cols-2 gap-2 mt-2 pb-2">
                                            {quickReplies.map((reply, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleQuickReply(reply)}
                                                    className="text-xs h-auto py-2 px-3 whitespace-normal text-right justify-start"
                                                >
                                                    {reply}
                                                </Button>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="p-4 border-t">
                                {!user ? (
                                    <div className="text-center text-sm text-muted-foreground">
                                        {isRTL ? 'يرجى تسجيل الدخول لإرسال الرسائل' : 'Please login to send messages'}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            size="icon"
                                            className="bg-gold-gradient text-secondary hover:opacity-90"
                                            disabled={!inputValue.trim()}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
};

export default Chatbot;
