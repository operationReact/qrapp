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

export default function PieAnalyticsChart({ data = [], nameKey = "name", valueKey = "value" }) {
  const isMobile = useIsMobile();

  // Scale down the donut on mobile to leave room for the legend
  const outerRadius = isMobile ? 70 : 90;
  const innerRadius = isMobile ? 38 : 50;

  return (
    <div className="w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 240}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="45%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend
            wrapperStyle={{ fontSize: isMobile ? 10 : 12, paddingTop: 4 }}
            iconSize={8}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
