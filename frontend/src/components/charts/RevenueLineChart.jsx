import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const formatCurrency = (v) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(v)
    : v;

// Compact INR formatter for Y-axis ticks (avoids ₹12,000 overflowing on mobile)
const compactCurrency = (v) => {
  if (typeof v !== "number") return v;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};

// Truncate long X-axis labels so they don't collide on mobile
const truncateLabel = (str, max = 8) =>
  typeof str === "string" && str.length > max ? str.slice(0, max) + "…" : str;

export default function RevenueLineChart({
  data = [],
  dataKey = "revenue",
  xKey = "date",
  color = "#6366f1",
}) {
  const isMobile = useIsMobile();

  return (
    // min-h prevents chart collapsing to zero in flex containers
    <div className="w-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: isMobile ? -16 : 0, bottom: isMobile ? 8 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            // preserve first/last label, skip crowded middle ones
            interval="preserveStartEnd"
            minTickGap={isMobile ? 30 : 50}
            tickFormatter={(v) => truncateLabel(String(v), isMobile ? 5 : 10)}
          />
          <YAxis
            tickFormatter={compactCurrency}
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 42 : 52}
          />
          <Tooltip
            formatter={(v) => [formatCurrency(v), "Revenue"]}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} iconSize={8} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
