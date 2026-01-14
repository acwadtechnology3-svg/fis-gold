import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

const PartnersCarousel = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    // Using placeholder images for now as we don't have the original assets
    // You should replace these with actual partner logos
    const partnerImages = [
        '/assets/partner1.png',
        '/assets/partner2.png',
        '/assets/partner3.png',
        '/assets/partner4.png',
        '/assets/partner5.png'
    ];

    const duplicatedPartners = [...partnerImages, ...partnerImages, ...partnerImages];

    return (
        <div className="relative w-full overflow-hidden py-10 bg-black/20">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

            <div className="container mx-auto px-4 mb-8 text-center">
                <h2 className="text-3xl font-bold text-gold-gradient mb-2">شركاء النجاح</h2>
                <p className="text-muted-foreground">نفتخر بشراكتنا مع كبرى المؤسسات</p>
            </div>

            <div
                className="flex space-x-8 md:space-x-10 lg:space-x-12 animate-scroll-partners"
                style={{
                    animationDirection: isRTL ? 'reverse' : 'normal',
                }}
            >
                {duplicatedPartners.map((_, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-48 h-32 bg-white/5 backdrop-blur-md rounded-xl p-4 flex items-center justify-center border border-white/10 hover:border-gold/50 transition-all duration-300 group"
                    >
                        <div className="text-muted-foreground group-hover:text-gold transition-colors font-bold text-xl">
                            PARTNER LOGO
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnersCarousel;
