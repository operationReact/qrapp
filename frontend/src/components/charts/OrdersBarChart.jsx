import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

// Truncate X-axis category labels (item names can be very long)
const truncateLabel = (str, max) =>
  typeof str === "string" && str.length > max ? str.slice(0, max) + "…" : str;

export default function OrdersBarChart({
  data = [],
  dataKey = "orders",
  xKey = "hour",
  color = "#6366f1",
  label = "Orders",
}) {
  const isMobile = useIsMobile();
  const maxLabelLen = isMobile ? 6 : 12;

  return (
    <div className="w-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: isMobile ? -16 : 0, bottom: isMobile ? 8 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 20 : 30}
            tickFormatter={(v) => truncateLabel(String(v), maxLabelLen)}
          />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 30 : 40}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} iconSize={8} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={label} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
