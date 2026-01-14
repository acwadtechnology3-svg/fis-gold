import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Phone, Mail, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MainLayout from "@/layouts/MainLayout";

const CertifiedGoldsmiths = () => {
  const navigate = useNavigate();
  const { goldsmiths, loading, fetchGoldsmiths } = useGoldsmiths();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGoldsmiths("approved");
  }, []);

  const filteredGoldsmiths = goldsmiths.filter(
    (goldsmith) =>
      goldsmith.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goldsmith.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goldsmith.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="text-gold-gradient">الصايغين المعتمدين</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            صايغين معتمدين من FIS Gold - جودة مضمونة وثقة كاملة
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <input
            type="text"
            placeholder="ابحث عن صايغ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-card border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Goldsmiths Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-dark border-primary/20">
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGoldsmiths.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? "لا توجد نتائج للبحث" : "لا يوجد صايغين معتمدين حالياً"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoldsmiths.map((goldsmith) => (
              <Card
                key={goldsmith.id}
                className="glass-dark border-primary/20 shadow-gold hover:shadow-gold-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => navigate(`/goldsmith/${goldsmith.id}`)}
              >
                <CardContent className="p-6">
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    {goldsmith.logo_url ? (
                      <img
                        src={goldsmith.logo_url}
                        alt={goldsmith.shop_name}
                        className="w-24 h-24 object-cover rounded-full border-4 border-gold-gradient"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-4 border-gold-gradient flex items-center justify-center">
                        <Package className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Certified Badge */}
                  <div className="flex justify-center mb-3">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      ✓ معتمد من FIS Gold
                    </Badge>
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-center mb-2 text-gold-gradient">
                    {goldsmith.shop_name}
                  </h3>
                  <p className="text-center text-muted-foreground mb-4">
                    {goldsmith.name}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">
                      {goldsmith.rating_average.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({goldsmith.rating_count})
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{goldsmith.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{goldsmith.phone}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {goldsmith.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {goldsmith.description}
                    </p>
                  )}

                  {/* View Products Button */}
                  <Button
                    className="w-full bg-gold-gradient hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/goldsmith/${goldsmith.id}`);
                    }}
                  >
                    عرض المنتجات
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CertifiedGoldsmiths;
