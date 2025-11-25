import { useState } from "react";
import { Card, CardContent, Typography, Box, TextField, InputAdornment, Breadcrumbs, Link } from "@mui/material";
import { TrendingUp, ShoppingCart, Users, Search, ArrowUp, Info } from "lucide-react";

type TimePeriod = "weekly" | "monthly" | "yearly";

const KPICard = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  iconColor: string;
}) => {
  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem", fontWeight: 500, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#111827", mt: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: `${iconColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <ArrowUp className="w-3 h-3" style={{ color: "#10b981" }} />
          <Typography variant="caption" sx={{ color: "#10b981", fontSize: "0.75rem" }}>
            {change}
          </Typography>
        </Box>
        <Box mt={2} sx={{ height: 40, display: "flex", alignItems: "flex-end", gap: 0.5 }}>
          {[...Array(12)].map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: `${20 + Math.random() * 20}%`,
                backgroundColor: i === 5 ? "#3b82f6" : "#e5e7eb",
                borderRadius: "2px 2px 0 0",
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export const HomePage = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
        <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{ fontSize: "0.875rem" }}>
          <Link color="inherit" href="#" sx={{ textDecoration: "none", color: "#6b7280" }}>
            대시보드
          </Link>
          <Typography color="text.primary" sx={{ color: "#111827", fontWeight: 500 }}>
            개요
          </Typography>
        </Breadcrumbs>
        <TextField
          size="small"
          placeholder="Search..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="w-4 h-4 text-gray-400" />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 300,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#f9fafb",
              "& fieldset": {
                borderColor: "#e5e7eb",
              },
              "&:hover fieldset": {
                borderColor: "#d1d5db",
              },
            },
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome Message */}
        <Box mb={4}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: "#111827", mb: 0.5 }}>
            안녕하세요, 환영합니다.
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            오늘의 거래 내역과 통계를 확인하세요.
          </Typography>
        </Box>

        {/* KPI Cards */}
        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3} mb={4}>
          <KPICard
            title="총 수익"
            value="₩2,032,000"
            change="+0.94 작년 대비"
            icon={TrendingUp}
            iconColor="#3b82f6"
          />
          <KPICard
            title="총 주문"
            value="1,032건"
            change="+0.94 작년 대비"
            icon={ShoppingCart}
            iconColor="#10b981"
          />
          <KPICard
            title="신규 고객"
            value="430명"
            change="+0.94"
            icon={Users}
            iconColor="#8b5cf6"
          />
        </Box>

        {/* Sales Trend Chart */}
        <Card sx={{ borderRadius: 2, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
                  거래 추이
                </Typography>
                <Info className="w-4 h-4 text-gray-400" />
              </Box>
              <Box display="flex" gap={1}>
                {(["weekly", "monthly", "yearly"] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {period === "weekly" ? "주간" : period === "monthly" ? "월간" : "연간"}
                  </button>
                ))}
              </Box>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.875rem" }}>
                총 수익: ₩2,032,000
              </Typography>
            </Box>

            {/* Legend */}
            <Box display="flex" gap={2} mb={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d1d5db" }} />
                <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                  신규 사용자
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#374151" }} />
                <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                  기존 사용자
                </Typography>
              </Box>
            </Box>

            {/* Chart Grid */}
            <Box sx={{ position: "relative", height: 300 }}>
              {/* Y-axis labels */}
              <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", py: 2 }}>
                {[0, 10, 20, 30, 40, 50, 60].map((val) => (
                  <Typography key={val} variant="caption" sx={{ color: "#9ca3af", fontSize: "0.625rem" }}>
                    {val}k
                  </Typography>
                ))}
              </Box>

              {/* Chart Area */}
              <Box sx={{ ml: 5, height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Grid */}
                <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.5 }}>
                  {[...Array(84)].map((_, i) => {
                    const col = i % 12;
                    const isHighlighted = col === 5;
                    const height = Math.random() > 0.3 ? `${30 + Math.random() * 50}%` : "0%";
                    return (
                      <Box
                        key={i}
                        sx={{
                          backgroundColor: isHighlighted ? "#3b82f6" : height !== "0%" ? "#e5e7eb" : "transparent",
                          borderRadius: "2px",
                          height: height,
                          alignSelf: "flex-end",
                          transition: "all 0.2s",
                          "&:hover": {
                            backgroundColor: isHighlighted ? "#2563eb" : "#d1d5db",
                          },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* X-axis labels */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, px: 0.5 }}>
                  {["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"].map(
                    (month, i) => (
                      <Typography
                        key={month}
                        variant="caption"
                        sx={{
                          color: i === 5 ? "#3b82f6" : "#9ca3af",
                          fontSize: "0.625rem",
                          fontWeight: i === 5 ? 600 : 400,
                        }}
                      >
                        {month}
                      </Typography>
                    ),
                  )}
                </Box>
              </Box>

              {/* Tooltip (hover effect on June) */}
              <Box
                sx={{
                  position: "absolute",
                  top: 20,
                  left: "calc(41.666% + 20px)",
                  transform: "translateX(-50%)",
                  backgroundColor: "white",
                  padding: "8px 12px",
                  borderRadius: 1,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e5e7eb",
                  zIndex: 10,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#111827", display: "block", mb: 0.5 }}>
                  2025년 6월
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d1d5db" }} />
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                    신규 사용자 38k
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#374151" }} />
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                    기존 사용자 18k
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
