"use client"

import { useMemo } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
} from "recharts"
import { useApp } from "./app-context"
import { getEvents, getTransactionsByUser, getLoansByUser } from "@/mocks/store"
import { generateProjection } from "@/mocks/forecast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface ProjectionChartProps {
  monthlySavings: number
}

interface TooltipPayload {
  value: number
  name: string
  color: string
}

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value?.toLocaleString()} TND</span>
        </div>
      ))}
    </div>
  )
}

export function ProjectionChart({ monthlySavings }: ProjectionChartProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()

  const projection = useMemo(() => {
    if (!currentUser) return []
    const transactions = getTransactionsByUser(currentUser.id)
    const loans = getLoansByUser(currentUser.id)
    return generateProjection(currentUser, transactions, events, loans, monthlySavings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, monthlySavings, refreshKey])

  if (!currentUser || projection.length === 0) return null

  // Calculate colors in JS to pass to Recharts
  const primaryColor = "#22c55e" // success/on-track green
  const secondaryColor = "#64748b" // muted gray for "do nothing"
  const confidenceColor = "#e2e8f0" // light gray for confidence band

  const finalDoNothing = projection[projection.length - 1]?.doNothing ?? 0
  const finalWithSavings = projection[projection.length - 1]?.withSavings ?? 0
  const improvement = finalWithSavings - finalDoNothing

  const savingsLabel = monthlySavings > 0 ? `Save ${monthlySavings} TND/mo` : "With Savings"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          6-Month Projection
        </CardTitle>
        <CardDescription>
          Projected balance with and without your savings plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={projection}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={confidenceColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={confidenceColor} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="confidenceHigh"
                stackId="confidence"
                stroke="none"
                fill="url(#confidenceGradient)"
                name="Confidence Range"
              />
              <Line
                type="monotone"
                dataKey="doNothing"
                stroke={secondaryColor}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Do Nothing"
              />
              <Line
                type="monotone"
                dataKey="withSavings"
                stroke={primaryColor}
                strokeWidth={3}
                dot={{ fill: primaryColor, strokeWidth: 2 }}
                name={savingsLabel}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {monthlySavings > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              <span className="font-medium text-success">
                +{improvement.toLocaleString()} TND
              </span>{" "}
              more in 6 months by saving {monthlySavings} TND/month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
