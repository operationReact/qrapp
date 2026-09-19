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
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1 text-zinc-400">{label}</p>
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
      <div className="h-52 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f1ef" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={metric === "orders" ? formatNumber : compactCurrency}
            />
            <Tooltip content={<ChartTooltip metric={metric} />} />
            <Bar dataKey={valueKey} fill="#c93428" radius={[5, 5, 0, 0]} maxBarSize={72} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d92d20" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#d92d20" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f1f1ef" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={metric === "orders" ? formatNumber : compactCurrency}
          />
          <Tooltip content={<ChartTooltip metric={metric} />} />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke="#c93428"
            strokeWidth={2.5}
            fill="url(#dashboardRevenueFill)"
            dot={false}
            activeDot={{ r: 5, fill: "#c93428", stroke: "#fff", strokeWidth: 2 }}
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
          <CartesianGrid vertical={false} stroke="#f1f1ef" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            interval={1}
            tickFormatter={formatHour}
          />
          <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <Tooltip content={<ChartTooltip metric="orders" />} />
          <Bar dataKey="orders" fill="#d92d20" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
