import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
    id: string;
    user_id: string;
    message: string;
    sender_type: 'user' | 'admin';
    is_read: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChatMessageFormData {
    message: string;
    sender_type: 'user' | 'admin';
}

export class ChatService {
    // Send a message
    static async sendMessage(
        userId: string,
        message: string,
        senderType: 'user' | 'admin' = 'user'
    ): Promise<{ success: boolean; error?: string; data?: ChatMessage }> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    user_id: userId,
                    message: message.trim(),
                    sender_type: senderType,
                    is_read: false,
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data as ChatMessage };
        } catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send message',
            };
        }
    }

    // Get messages for a specific user
    static async getUserMessages(userId: string): Promise<{
        success: boolean;
        error?: string;
        data?: ChatMessage[];
    }> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data as ChatMessage[] };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch messages',
            };
        }
    }

    // Get all chat conversations (for admin)
    static async getAllConversations(): Promise<{
        success: boolean;
        error?: string;
        data?: { user_id: string; last_message: string; unread_count: number; last_message_at: string }[];
    }> {
        try {
            // Get latest message for each user with unread count
            const { data, error } = await supabase.rpc('get_chat_conversations');

            if (error) {
                console.error('Error fetching conversations:', error);
                // Fallback: manually get conversations
                const { data: messages, error: messagesError } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (messagesError) {
                    return { success: false, error: messagesError.message };
                }

                // Group by user_id
                const conversationsMap = new Map();
                messages?.forEach((msg: ChatMessage) => {
                    if (!conversationsMap.has(msg.user_id)) {
                        const unreadCount = messages.filter(
                            (m: ChatMessage) => m.user_id === msg.user_id && !m.is_read && m.sender_type === 'user'
                        ).length;

                        conversationsMap.set(msg.user_id, {
                            user_id: msg.user_id,
                            last_message: msg.message,
                            unread_count: unreadCount,
                            last_message_at: msg.created_at,
                        });
                    }
                });

                return { success: true, data: Array.from(conversationsMap.values()) };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch conversations',
            };
        }
    }

    // Mark messages as read
    static async markAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('sender_type', 'user')
                .eq('is_read', false);

            if (error) {
                console.error('Error marking messages as read:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error marking messages as read:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to mark messages as read',
            };
        }
    }

    // Get unread message count for a user
    static async getUnreadCount(userId: string): Promise<{
        success: boolean;
        error?: string;
        count?: number;
    }> {
        try {
            const { count, error } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('sender_type', 'admin')
                .eq('is_read', false);

            if (error) {
                console.error('Error getting unread count:', error);
                return { success: false, error: error.message };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get unread count',
            };
        }
    }

    // Subscribe to new messages for a user
    static subscribeToMessages(userId: string, callback: (message: ChatMessage) => void) {
        const subscription = supabase
            .channel(`chat:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    callback(payload.new as ChatMessage);
                }
            )
            .subscribe();

        return subscription;
    }
}
