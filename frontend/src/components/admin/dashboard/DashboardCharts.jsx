import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatHour, formatNumber } from "./DashboardPrimitives";

const compactCurrency = (value) => formatCurrency(value, true);

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const formatted = metric === "revenue" || metric === "aov"
    ? formatCurrency(value)
    : formatNumber(value);
  return (
    <div className="rounded-[10px] border border-[#E8E2DD] bg-white px-3 py-2 text-xs text-[#171717] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <p className="mb-1 text-[#8A8580]">{label}</p>
      <p className="font-bold">{formatted}</p>
    </div>
  );
}

export function RevenueChart({ data, metric }) {
  const valueKey = metric === "orders" ? "orders" : metric === "aov" ? "aov" : "revenue";
  const empty = !data?.some((row) => Number(row[valueKey]) > 0);
  if (empty) return null;

  if (data.length === 1) {
    return (
      <div className="h-[180px] w-full lg:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEE9E5" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8580" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#8A8580" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={metric === "orders" ? formatNumber : compactCurrency}
            />
            <Tooltip content={<ChartTooltip metric={metric} />} />
            <Bar dataKey={valueKey} fill="#FF2438" radius={[5, 5, 0, 0]} maxBarSize={72} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[180px] w-full lg:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFF0F2" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#FFF0F2" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EEE9E5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8580" }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#8A8580" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={metric === "orders" ? formatNumber : compactCurrency}
          />
          <Tooltip content={<ChartTooltip metric={metric} />} />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke="#FF2438"
            strokeWidth={2}
            fill="url(#dashboardRevenueFill)"
            dot={false}
            activeDot={{ r: 5, fill: "#FF2438", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data }) {
  if (!data?.some((row) => Number(row.orders) > 0)) return null;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEE9E5" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#8A8580" }}
            tickLine={false}
            axisLine={false}
            interval={1}
            tickFormatter={formatHour}
          />
          <YAxis tick={{ fontSize: 10, fill: "#8A8580" }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <Tooltip content={<ChartTooltip metric="orders" />} />
          <Bar dataKey="orders" fill="#FF2438" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
