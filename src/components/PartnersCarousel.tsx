import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from 'lucide-react';

interface Partner {
    id: string;
    name: string;
    website_url: string | null;
    logo_url: string | null;
}

const PartnersCarousel = () => {
    const { t, i18n } = useTranslation();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from("partners")
                    .select("*")
                    .eq("is_active", true)
                    .order("display_order", { ascending: true })
                    .limit(3); // Only fetch 3 partners

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

    if (loading) {
        return null;
    }

    if (partners.length === 0) {
        return null; // Hide section if no partners
    }

    return (
        <section className="relative w-full py-20 bg-gradient-to-b from-black/10 to-transparent overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Centered Title Section */}
                <div className="text-center mb-16">
                    <div className="inline-block">
                        <h2 className="text-4xl md:text-5xl font-bold text-gold-gradient mb-3 relative">
                            شركاء النجاح
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                        </h2>
                    </div>
                    <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto">
                        نفتخر بشراكتنا مع كبرى المؤسسات الرائدة في المملكة
                    </p>
                </div>

                {/* Partners Grid - 3 columns centered */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {partners.map((partner) => (
                        <div
                            key={partner.id}
                            className="group relative"
                        >
                            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 h-48 flex items-center justify-center overflow-hidden">
                                {/* Glow effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-500 rounded-2xl" />

                                {/* Content */}
                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                    {partner.logo_url ? (
                                        <img
                                            src={partner.logo_url}
                                            alt={partner.name}
                                            className="max-w-full max-h-full object-contain filter brightness-90 group-hover:brightness-110 transition-all duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="text-foreground/80 group-hover:text-primary transition-colors font-bold text-2xl text-center">
                                            {partner.name}
                                        </div>
                                    )}
                                </div>

                                {/* Website link indicator */}
                                {partner.website_url && (
                                    <a
                                        href={partner.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    >
                                        <ExternalLink className="w-5 h-5 text-primary" />
                                    </a>
                                )}
                            </div>

                            {/* Partner name on hover */}
                            {partner.logo_url && (
                                <div className="text-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-sm text-muted-foreground font-medium">{partner.name}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PartnersCarousel;
