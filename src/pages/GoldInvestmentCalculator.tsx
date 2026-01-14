import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import GoldParticles from "@/components/GoldParticles";
import { Calculator, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MainLayout from "@/layouts/MainLayout";

const GoldInvestmentCalculator = () => {
  const { data: pricesData, isLoading } = useMetalPrices();
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [karat, setKarat] = useState<string>("21");
  const [futurePriceChange, setFuturePriceChange] = useState<string>("0");
  const [investmentPeriod, setInvestmentPeriod] = useState<string>("1");

  // Get current gold price
  const currentGoldPrice = pricesData?.gold?.buy_price_per_gram || pricesData?.gold?.price_per_gram || 0;

  // Karat purity percentages
  const karatPurity: Record<string, number> = {
    "18": 0.75, // 18K = 75% gold
    "21": 0.875, // 21K = 87.5% gold
    "22": 0.9167, // 22K = 91.67% gold
    "24": 1.0, // 24K = 100% gold (pure gold)
  };

  // Calculate results
  const calculations = useMemo(() => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0 || !currentGoldPrice) {
      return null;
    }

    const amount = parseFloat(investmentAmount);
    const selectedKarat = parseInt(karat);
    const purity = karatPurity[karat] || 0.875;
    const futurePricePercent = parseFloat(futurePriceChange) || 0;

    // Calculate weight of 24K gold
    const gold24KWeight = amount / currentGoldPrice;

    // Calculate weight of selected karat (adjusted for purity)
    const goldWeight = gold24KWeight * purity;

    // Current value
    const currentValue = amount;

    // Future price (after price change)
    const futurePrice = currentGoldPrice * (1 + futurePricePercent / 100);
    const futureValue = gold24KWeight * futurePrice * purity;

    // Profit/Loss
    const profitLoss = futureValue - amount;
    const profitLossPercent = (profitLoss / amount) * 100;

    // Per gram price for selected karat
    const pricePerGram = currentGoldPrice * purity;

    return {
      investmentAmount: amount,
      gold24KWeight,
      goldWeight,
      currentValue,
      futurePrice,
      futureValue,
      profitLoss,
      profitLossPercent,
      pricePerGram,
      karat: selectedKarat,
    };
  }, [investmentAmount, karat, currentGoldPrice, futurePriceChange]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calculator className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gold-gradient">حاسبة الاستثمار في الذهب</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            احسب وزن الذهب الذي ستحصل عليه والأرباح المحتملة بناءً على أسعار الذهب الحالية
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card className="glass-dark border-primary/20 shadow-gold">
              <CardHeader>
                <CardTitle className="text-gold-gradient">بيانات الاستثمار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Investment Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ المستثمر (ج.م)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="مثال: 50000"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    الحد الأدنى للاستثمار: 2,000 ج.م
                  </p>
                </div>

                {/* Karat Selection */}
                <div className="space-y-2">
                  <Label htmlFor="karat">العيار</Label>
                  <Select value={karat} onValueChange={setKarat}>
                    <SelectTrigger id="karat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18 قيراط (75%)</SelectItem>
                      <SelectItem value="21">21 قيراط (87.5%)</SelectItem>
                      <SelectItem value="22">22 قيراط (91.67%)</SelectItem>
                      <SelectItem value="24">24 قيراط (100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Gold Price */}
                <div className="space-y-2">
                  <Label>سعر الذهب الحالي (24 قيراط)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-gold-gradient">
                        {formatNumber(currentGoldPrice)} ج.م / جم
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        سعر الشراء الحالي
                      </div>
                    </div>
                  )}
                </div>

                {/* Future Price Change (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="future-price">توقع تغير السعر (%)</Label>
                  <Input
                    id="future-price"
                    type="number"
                    step="0.1"
                    placeholder="مثال: 5 أو -5"
                    value={futurePriceChange}
                    onChange={(e) => setFuturePriceChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    أدخل نسبة التغير المتوقعة في سعر الذهب (إيجابي للزيادة، سلبي للنقصان)
                  </p>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setInvestmentAmount("");
                    setKarat("21");
                    setFuturePriceChange("0");
                  }}
                >
                  إعادة تعيين
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {!calculations ? (
              <Card className="glass-dark border-primary/20 shadow-gold">
                <CardContent className="p-12 text-center">
                  <Calculator className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-lg">
                    أدخل المبلغ المستثمر لحساب النتائج
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Current Investment Results */}
                <Card className="glass-dark border-primary/20 shadow-gold">
                  <CardHeader>
                    <CardTitle className="text-gold-gradient">نتائج الاستثمار الحالي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Investment Amount */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">المبلغ المستثمر</Label>
                        <div className="text-3xl font-bold text-primary">
                          {formatNumber(calculations.investmentAmount)} ج.م
                        </div>
                      </div>

                      {/* Gold Weight */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">وزن الذهب ({calculations.karat}K)</Label>
                        <div className="text-3xl font-bold text-gold-gradient">
                          {formatNumber(calculations.goldWeight)} جم
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ({formatNumber(calculations.gold24KWeight)} جم ذهب خالص 24K)
                        </div>
                      </div>

                      {/* Price Per Gram */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">سعر الجرام ({calculations.karat}K)</Label>
                        <div className="text-2xl font-bold">
                          {formatNumber(calculations.pricePerGram)} ج.م
                        </div>
                      </div>

                      {/* Current Value */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">القيمة الحالية</Label>
                        <div className="text-2xl font-bold text-primary">
                          {formatNumber(calculations.currentValue)} ج.م
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Future Projection (if price change is specified) */}
                {parseFloat(futurePriceChange) !== 0 && (
                  <Card className="glass-dark border-primary/20 shadow-gold">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {parseFloat(futurePriceChange) > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-gold-gradient">
                          التوقع المستقبلي (تغير السعر: {futurePriceChange}%)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Future Price */}
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">سعر الذهب المستقبلي (24K)</Label>
                          <div className="text-2xl font-bold">
                            {formatNumber(calculations.futurePrice)} ج.م / جم
                          </div>
                        </div>

                        {/* Future Value */}
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">القيمة المستقبلية ({calculations.karat}K)</Label>
                          <div className="text-2xl font-bold text-primary">
                            {formatNumber(calculations.futureValue)} ج.م
                          </div>
                        </div>

                        {/* Profit/Loss */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-muted-foreground">الربح / الخسارة</Label>
                          <div
                            className={`text-3xl font-bold ${calculations.profitLoss >= 0
                              ? "text-green-500"
                              : "text-red-500"
                              }`}
                          >
                            {calculations.profitLoss >= 0 ? "+" : ""}
                            {formatNumber(calculations.profitLoss)} ج.م
                            <span className="text-xl mr-2">
                              ({calculations.profitLossPercent >= 0 ? "+" : ""}
                              {formatNumber(calculations.profitLossPercent)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card className="glass-dark border-primary/20 bg-blue-500/5">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-4 text-lg">معلومات مهمة</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                      <li>الأسعار المذكورة استرشادية وتعتمد على سعر الذهب الحالي</li>
                      <li>السعر الفعلي قد يختلف قليلاً وقت تنفيذ العملية</li>
                      <li>العيارات المختلفة لها نقاوة مختلفة من الذهب الخالص</li>
                      <li>التوقعات المستقبلية هي فقط للتخطيط ولا تضمن نتائج فعلية</li>
                      <li>يتم حساب الأرباح بناءً على تغير سعر الذهب فقط</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoldInvestmentCalculator;
