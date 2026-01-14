import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

const ChatButton: React.FC = () => {
    const { i18n } = useTranslation();
    const { openChat } = useChat();
    const isRTL = i18n.language === 'ar';

    return (
        <div className="fixed bottom-6 right-6 z-50" dir={isRTL ? 'rtl' : 'ltr'}>
            <Button
                onClick={openChat}
                size="lg"
                className="h-14 w-14 rounded-full bg-gold-gradient hover:opacity-90 shadow-lg text-primary-foreground hover:scale-105 transition-transform"
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        </div>
    );
};

export default ChatButton;
