import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, X } from "lucide-react";

export interface FilterState {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

interface AdminFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  type: "deposits" | "withdrawals" | "users";
}

export const AdminFilters = ({ onFilterChange, type }: AdminFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: "",
      status: "all",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>بحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          {type !== "users" && (
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  {type === "withdrawals" && (
                    <SelectItem value="completed">مكتمل</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date From */}
          <div className="space-y-2">
            <Label>من تاريخ</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label>إلى تاريخ</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>

          {/* Amount Range */}
          {type !== "users" && (
            <>
              <div className="space-y-2">
                <Label>الحد الأدنى للمبلغ</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأقصى للمبلغ</Label>
                <Input
                  type="number"
                  placeholder="لا يوجد حد"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Reset Button */}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <X className="w-4 h-4" />
            إعادة تعيين
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
