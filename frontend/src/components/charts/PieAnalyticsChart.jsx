import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

// Custom label line + text rendered outside each slice
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = (percent * 100).toFixed(0);
  if (pct < 3) return null; // skip tiny slices
  const short = name?.length > 10 ? name.slice(0, 10) + "…" : name;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
      fill="#52525b"
    >
      {`${short} ${pct}%`}
    </text>
  );
};

export default function PieAnalyticsChart({
  data = [],
  nameKey = "name",
  valueKey = "value",
}) {
  const isMobile = useIsMobile();

  const outerRadius = isMobile ? 65 : 85;
  const innerRadius = isMobile ? 35 : 46;

  return (
    <div className="w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 270}>
        <PieChart margin={{ top: 10, right: 30, bottom: 0, left: 30 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="45%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
            labelLine={false}
            label={!isMobile ? renderCustomLabel : false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value, name) => [
              typeof value === "number"
                ? new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(value)
                : value,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: isMobile ? 10 : 11, paddingTop: 6 }}
            iconSize={8}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value) =>
              value?.length > 14 ? value.slice(0, 14) + "…" : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
