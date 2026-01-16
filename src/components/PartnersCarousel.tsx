import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

import { supabase } from "@/integrations/supabase/client";

interface Partner {
    id: string;
    name: string;
    website_url: string | null;
    logo_url: string | null;
}

const PartnersCarousel = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from("partners")
                    .select("*")
                    .eq("is_active", true)
                    .order("display_order", { ascending: true });

                if (error) throw error;
                setPartners(data || []);
            } catch (error) {
                console.error("Error fetching partners:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPartners();
    }, []);

    // If there are no partners or not enough for a carousel, we could either hide it or duplicate the few we have more times.
    // For now, let's just duplicate whatever we have enough to fill some space or make it look like a carousel.
    // If no partners, fallback to empty array/null
    if (!loading && partners.length === 0) {
        return null;
    }

    // Ensure we have enough items to scroll smoothly
    const duplicatedPartners = partners.length > 0 ? [...partners, ...partners, ...partners, ...partners] : [];

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
                {duplicatedPartners.map((partner, index) => (
                    <div
                        key={`${partner.id}-${index}`}
                        className="flex-shrink-0 w-48 h-32 bg-white/5 backdrop-blur-md rounded-xl p-4 flex items-center justify-center border border-white/10 hover:border-gold/50 transition-all duration-300 group"
                    >
                        {partner.logo_url ? (
                            <img
                                src={partner.logo_url}
                                alt={partner.name}
                                className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                        ) : (
                            <div className="text-muted-foreground group-hover:text-gold transition-colors font-bold text-lg text-center">
                                {partner.name}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnersCarousel;
