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

const truncateLabel = (str, max) =>
  typeof str === "string" && str.length > max ? str.slice(0, max) + "…" : str;

/**
 * MultiBarChart – for side-by-side bar series (e.g. revenue vs discount).
 */
export default function MultiBarChart({
  data = [],
  xKey = "name",
  series = [{ dataKey: "value", color: "#6366f1", name: "Value" }],
}) {
  const isMobile = useIsMobile();
  const maxLabelLen = isMobile ? 5 : 10;

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
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              name={s.name}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

