import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

// Truncate X-axis category labels (item names can be very long)
const truncateLabel = (str, max) =>
  typeof str === "string" && str.length > max ? str.slice(0, max) + "…" : str;

// Custom label rendered on top of each bar
const BarTopLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="#6366f1"
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {typeof value === "number" && value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : value}
    </text>
  );
};

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
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 8, left: isMobile ? -16 : 0, bottom: isMobile ? 8 : 0 }}
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
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={label} maxBarSize={48}>
            <LabelList dataKey={dataKey} content={<BarTopLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
