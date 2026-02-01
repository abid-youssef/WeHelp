"use client"

import { useMemo, useState, useCallback } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts"
import { useApp } from "./app-context"
import {
  getEvents,
  getTransactionsByUser,
  getCustomEventsByUser,
  getActiveLoans,
  getFutureLoanPayments,
  calculateMonthlyFlowBreakdown,
  generateMonthExplanation,
  getUserById,
} from "@/data/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  ChevronRight,
  Lightbulb,
} from "lucide-react"
import type { LifeEvent, CustomEvent, Transaction } from "@/data/seed-data"

interface MonthlyProjection {
  month: string
  label: string
  balance: number // Median projected balance
  p10: number // 10th percentile
  p90: number // 90th percentile
  inflows: number
  outflows: number // Total aggregated outflows
  // Detailed breakdown
  fixedOutflows: number
  variableOutflows: number
  seasonalMultiplier: number
  eventContributions: Array<{
    eventId: string
    eventName: string
    mean: number
    std: number
    distributionType: "normal" | "uniform"
  }>
  loanPaymentContributions: Array<{
    loanId: string
    payment: number
  }>
  totalLoanPayments: number
  totalEventCosts: number
  readinessScore: number
  hasEvents: boolean
  hasLoanPayments: boolean
  // Explanation
  explanation: {
    text: string
    drivers: { name: string; contribution: number }[]
    confidence: "low" | "medium" | "high"
  }
}

interface OutflowBreakdown {
  category: string
  amount: number
  isRecurring: boolean
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * std + mean
}

// Uniform distribution sampling
function randomUniform(mean: number, range: number): number {
  return mean + (Math.random() * 2 - 1) * range
}

interface BalanceProjectionChartProps {
  monthlySavings: number
  onSavingsChange: (value: number) => void
  maxSavings: number
}

export function BalanceProjectionChart({
  monthlySavings,
  onSavingsChange,
  maxSavings,
}: BalanceProjectionChartProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()
  const [showEventContributions, setShowEventContributions] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<MonthlyProjection | null>(null)
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [breakdownMonth, setBreakdownMonth] = useState<MonthlyProjection | null>(null)

  const customEvents = useMemo(
    () => (currentUser ? getCustomEventsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  // Get active loans and future payments
  const activeLoans = useMemo(
    () => (currentUser ? getActiveLoans(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const futureLoanPayments = useMemo(
    () => (currentUser ? getFutureLoanPayments(currentUser.id, 6) : []),
    [currentUser, refreshKey]
  )

  // Compute monthly outflows by category
  const computeMonthlyOutflows = useCallback(
    (transactions: Transaction[], monthStr: string): OutflowBreakdown[] => {
      const categoryTotals: Record<string, { amount: number; isRecurring: boolean }> = {}

      // Get transactions from this month or recurring pattern
      const monthTransactions = transactions.filter((t) => {
        const tMonth = t.date.substring(0, 7)
        return tMonth === monthStr && t.amount < 0
      })

      monthTransactions.forEach((t) => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = { amount: 0, isRecurring: false }
        }
        categoryTotals[t.category].amount += Math.abs(t.amount)
      })

      // Mark recurring categories based on history
      const categoryCounts: Record<string, number> = {}
      transactions.forEach((t) => {
        if (t.amount < 0) {
          categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
        }
      })

      Object.keys(categoryTotals).forEach((cat) => {
        categoryTotals[cat].isRecurring = (categoryCounts[cat] || 0) >= 3
      })

      return Object.entries(categoryTotals).map(([category, data]) => ({
        category,
        amount: data.amount,
        isRecurring: data.isRecurring,
      }))
    },
    []
  )

  // Run Monte Carlo projection with realistic monthly flow breakdown
  const projection = useMemo(() => {
    if (!currentUser) return []

    // Get realistic monthly flow breakdown from store
    const flowBreakdowns = calculateMonthlyFlowBreakdown(currentUser.id, 6)

    const now = new Date()
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    const ITERATIONS = 30 // Quick mobile-friendly iteration count
    const projectionData: MonthlyProjection[] = []

    // Current month (month 0)
    const currentDate = new Date(now)
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`
    const currentLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`

    // Add current month as baseline
    projectionData.push({
      month: currentMonthStr,
      label: currentLabel,
      balance: Math.round(currentUser.balance),
      p10: Math.round(currentUser.balance * 0.95),
      p90: Math.round(currentUser.balance * 1.05),
      inflows: Math.round(currentUser.monthlyIncome),
      outflows: Math.round(currentUser.fixedMonthlyOutflows + currentUser.avgVariableOutflows),
      fixedOutflows: currentUser.fixedMonthlyOutflows,
      variableOutflows: currentUser.avgVariableOutflows,
      seasonalMultiplier: 1.0,
      eventContributions: [],
      loanPaymentContributions: [],
      totalLoanPayments: 0,
      totalEventCosts: 0,
      readinessScore: Math.round(Math.min(100, (currentUser.balance / (currentUser.avgVariableOutflows * 3)) * 100)),
      hasEvents: false,
      hasLoanPayments: false,
      explanation: {
        text: "Current month baseline",
        drivers: [
          { name: "Current Balance", contribution: currentUser.balance },
        ],
        confidence: "high",
      },
    })

    // Project future months using realistic breakdown
    for (let monthIdx = 0; monthIdx < flowBreakdowns.length; monthIdx++) {
      const breakdown = flowBreakdowns[monthIdx]
      const targetDate = new Date(now)
      targetDate.setMonth(now.getMonth() + monthIdx + 1)
      const label = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`

      // Monte Carlo sampling using the realistic breakdown
      const balanceSamples: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        // Sample income with variance based on salary frequency
        const sampledIncome = Math.max(0, randomNormal(breakdown.scheduledIncome, breakdown.incomeVariance))

        // Fixed outflows are deterministic
        const fixedOutflows = breakdown.fixedOutflows

        // Sample variable outflows with seasonal adjustment
        const sampledVariable = Math.max(
          breakdown.variableOutflowMean * 0.5,
          randomNormal(breakdown.variableOutflowMean, breakdown.variableOutflowStd)
        )

        // Sample event costs with their respective distributions
        let eventCost = 0
        for (const event of breakdown.eventCosts) {
          if (event.distributionType === 'uniform') {
            eventCost += Math.max(0, randomUniform(event.mean, event.std * 1.73))
          } else {
            eventCost += Math.max(0, randomNormal(event.mean, event.std))
          }
        }

        // Loan payments are deterministic
        const loanPayments = breakdown.totalLoanPayments

        // Calculate total expense for this iteration
        const totalExpense = fixedOutflows + sampledVariable + eventCost + loanPayments

        // Calculate cumulative balance
        let iterBalance = currentUser.balance
        for (let m = 0; m <= monthIdx; m++) {
          const prevBreakdown = m < monthIdx ? flowBreakdowns[m] : breakdown
          const monthIncome = m < monthIdx ? prevBreakdown.scheduledIncome : sampledIncome
          const monthExpense = m < monthIdx ? prevBreakdown.totalOutflowsMean : totalExpense
          iterBalance += monthIncome - monthExpense + monthlySavings
        }
        balanceSamples.push(iterBalance)
      }

      // Sort and compute percentiles
      balanceSamples.sort((a, b) => a - b)
      const p10 = balanceSamples[Math.floor(ITERATIONS * 0.1)] || balanceSamples[0]
      const p50 = balanceSamples[Math.floor(ITERATIONS * 0.5)] || balanceSamples[0]
      const p90 = balanceSamples[Math.floor(ITERATIONS * 0.9)] || balanceSamples[0]

      // Generate explanation for this month
      const explanation = generateMonthExplanation(breakdown, currentUser)

      projectionData.push({
        month: breakdown.month,
        label,
        balance: Math.round(p50),
        p10: Math.round(p10),
        p90: Math.round(p90),
        inflows: Math.round(breakdown.totalInflowsMean),
        outflows: Math.round(breakdown.totalOutflowsMean),
        fixedOutflows: breakdown.fixedOutflows,
        variableOutflows: Math.round(breakdown.variableOutflowMean),
        seasonalMultiplier: breakdown.seasonalMultiplier,
        eventContributions: breakdown.eventCosts,
        loanPaymentContributions: breakdown.loanPayments,
        totalLoanPayments: breakdown.totalLoanPayments,
        totalEventCosts: breakdown.totalEventMean,
        readinessScore: Math.round(Math.max(0, Math.min(100, (p50 / (breakdown.variableOutflowMean * 3)) * 100))),
        hasEvents: breakdown.eventCosts.length > 0,
        hasLoanPayments: breakdown.totalLoanPayments > 0,
        explanation,
      })
    }

    return projectionData
  }, [currentUser, monthlySavings, refreshKey])

  // Colors
  const balanceColor = "#22c55e"
  const bandColor = "#dcfce7"
  const outflowColor = "#f97316"
  const eventMarkerColor = "#8b5cf6"

  const topDrivers = []

  if (!currentUser || projection.length === 0) return null

  // Top drivers for explainability
  const nextRiskyMonth = projection.find((p) => p.balance < currentUser.balance * 0.5)

  if (nextRiskyMonth) {
    nextRiskyMonth.eventContributions.forEach((e) => {
      topDrivers.push(`${e.eventName} estimated cost ${e.mean.toLocaleString()} ± ${e.std.toLocaleString()} TND`)
    })
  }

  const savingsRate = (projection[0]?.inflows - projection[0]?.outflows) / projection[0]?.inflows
  if (savingsRate < 0.1) {
    topDrivers.push("Low savings rate - consider reducing discretionary spending")
  }

  if (currentUser.balance < projection[0]?.outflows) {
    topDrivers.push("Current balance below monthly outflows - build emergency buffer")
  }

  const handleMonthClick = (data: MonthlyProjection) => {
    handleViewBreakdown(data)
  }

  const handleViewBreakdown = (month: MonthlyProjection) => {
    setBreakdownMonth(month)
    setBreakdownModalOpen(true)
    setSelectedMonth(null)
  }

  // Custom tooltip with detailed breakdown
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = projection.find((p) => p.label === label)
    if (!data) return null

    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg min-w-[280px] max-w-[340px] relative z-[100]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">{label}</p>
          {data.seasonalMultiplier > 1.05 && (
            <Badge variant="outline" className="text-xs">
              +{((data.seasonalMultiplier - 1) * 100).toFixed(0)}% seasonal
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {/* Balance */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Projected Balance</span>
            <span className="font-semibold text-success">{data.balance.toLocaleString()} TND</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Range (10th-90th)</span>
            <span>{data.p10.toLocaleString()} - {data.p90.toLocaleString()} TND</span>
          </div>

          {/* Inflows */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Income</p>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Salary/Income</span>
              <span className="text-sm text-emerald-600">+{data.inflows.toLocaleString()} TND</span>
            </div>
          </div>

          {/* Outflows Breakdown */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Outflows Breakdown</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Fixed (rent, bills)</span>
                <span className="text-red-500">-{data.fixedOutflows?.toLocaleString() || 0} TND</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Discretionary</span>
                <span className="text-orange-500">-{data.variableOutflows?.toLocaleString() || 0} TND</span>
              </div>
              {data.totalEventCosts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Events</span>
                  <span className="text-purple-500">-{data.totalEventCosts.toLocaleString()} TND</span>
                </div>
              )}
              {data.totalLoanPayments > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Loan payments</span>
                  <span className="text-blue-500">-{data.totalLoanPayments.toFixed(0)} TND</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-medium pt-1 border-t">
                <span>Total Outflows</span>
                <span className="text-destructive">-{data.outflows.toLocaleString()} TND</span>
              </div>
            </div>
          </div>

          {/* Event Details */}
          {data.eventContributions.length > 0 && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Event Costs</p>
              {data.eventContributions.map((e) => (
                <div key={e.eventId} className="flex justify-between items-center text-sm">
                  <span className="text-purple-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {e.eventName}
                  </span>
                  <span>{e.mean.toLocaleString()} ± {e.std.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Loan Details */}
          {data.loanPaymentContributions.length > 0 && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Loan Payments</p>
              {data.loanPaymentContributions.map((loan, idx) => (
                <div key={loan.loanId || idx} className="flex justify-between items-center text-sm">
                  <span className="text-blue-600 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Loan Payment
                  </span>
                  <span>{loan.payment.toFixed(0)} TND</span>
                </div>
              ))}
            </div>
          )}

          {/* Readiness & Confidence */}
          <div className="border-t pt-2 mt-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Readiness</span>
              <Badge variant={data.readinessScore >= 70 ? "default" : data.readinessScore >= 40 ? "secondary" : "destructive"}>
                {data.readinessScore}%
              </Badge>
            </div>
            <Badge variant="outline" className="text-xs">
              {data.explanation?.confidence || "medium"} confidence
            </Badge>
          </div>

          {/* Explanation */}
          {data.explanation?.text && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                {data.explanation.text.substring(0, 150)}
                {data.explanation.text.length > 150 && "..."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 py-2 border-t border-dashed flex items-center justify-center gap-2 text-xs text-primary font-medium">
          <Info className="w-3 h-3" />
          Click chart for full breakdown
        </div>
      </div>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Balance Projection
            </CardTitle>
            <CardDescription>
              6-month projected balance with Monte Carlo confidence bands
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Switch
                checked={showEventContributions}
                onCheckedChange={setShowEventContributions}
                id="show-events"
              />
              <label htmlFor="show-events" className="text-muted-foreground">Show Events</label>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Savings Slider */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Savings Target</span>
            <span className="text-lg font-semibold text-primary">{monthlySavings} TND/mo</span>
          </div>
          <Slider
            value={[monthlySavings]}
            onValueChange={(v) => onSavingsChange(v[0])}
            max={maxSavings}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>{maxSavings} TND</span>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={projection}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              onClick={(e) => e?.activePayload?.[0]?.payload && handleMonthClick(e.activePayload[0].payload)}
            >
              <defs>
                <linearGradient id="balanceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={bandColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={bandColor} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={outflowColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={outflowColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                yAxisId="balance"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                domain={['dataMin - 500', 'dataMax + 500']}
              />
              <YAxis
                yAxisId="outflows"
                orientation="right"
                tick={{ fontSize: 11, fill: "#f97316" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                domain={[0, 'dataMax + 200']}
              />

              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 100 }}
              />

              {/* Confidence band (p10-p90) */}
              <Area
                yAxisId="balance"
                type="monotone"
                dataKey="p90"
                stroke="none"
                fill="url(#balanceBand)"
                fillOpacity={1}
              />
              <Area
                yAxisId="balance"
                type="monotone"
                dataKey="p10"
                stroke="none"
                fill="#fff"
                fillOpacity={1}
              />

              {/* Outflows area (optional) */}
              <Area
                yAxisId="outflows"
                type="monotone"
                dataKey="outflows"
                stroke={outflowColor}
                strokeWidth={1}
                fill="url(#outflowGradient)"
                name="Monthly Outflows"
                activeDot={false}
              />

              {/* Balance line (median) */}
              <Line
                yAxisId="balance"
                type="monotone"
                dataKey="balance"
                stroke={balanceColor}
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (payload.hasEvents && showEventContributions) {
                    return (
                      <g key={payload.month}>
                        <circle cx={cx} cy={cy} r={8} fill={eventMarkerColor} opacity={0.3} />
                        <circle cx={cx} cy={cy} r={5} fill={eventMarkerColor} />
                        <circle cx={cx} cy={cy} r={3} fill="#fff" />
                      </g>
                    )
                  }
                  return <circle key={payload.month} cx={cx} cy={cy} r={4} fill={balanceColor} stroke="#fff" strokeWidth={2} />
                }}
                name="Projected Balance"
              />

              {/* Zero line reference */}
              <ReferenceLine yAxisId="balance" y={0} stroke="#ef4444" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: balanceColor }} />
            <span>Projected Balance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-3 rounded" style={{ backgroundColor: bandColor }} />
            <span>Confidence Range (10th-90th)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-3 rounded opacity-50" style={{ backgroundColor: outflowColor }} />
            <span>Monthly Outflows</span>
          </div>
          {showEventContributions && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventMarkerColor }} />
              <span>Event Month</span>
            </div>
          )}
        </div>

        {/* Feature Explanation & Tooltips */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Understanding your Forecast</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Realistic Variability</p>
              <p>We use historical spending habits and seasonal trends (like Ramadan or Summer) to simulate potential future balances.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Confidence Bands</p>
              <p>The shaded area represents the 10th-90th percentile range. Your balance is 80% likely to fall within this area.</p>
            </div>
          </div>
        </div>

        {/* Top Drivers / Explainability */}
        {topDrivers.length > 0 && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Key Drivers</span>
            </div>
            <ul className="space-y-1">
              {topDrivers.map((driver, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-warning">•</span>
                  {driver}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-xs text-muted-foreground">End Balance (Median)</p>
            <p className="text-lg font-semibold text-success">
              {projection[projection.length - 1]?.balance.toLocaleString()} TND
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Worst Case (10th)</p>
            <p className="text-lg font-semibold">
              {projection[projection.length - 1]?.p10.toLocaleString()} TND
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Best Case (90th)</p>
            <p className="text-lg font-semibold">
              {projection[projection.length - 1]?.p90.toLocaleString()} TND
            </p>
          </div>
        </div>
      </CardContent>

      {/* Breakdown Modal */}
      <Dialog open={breakdownModalOpen} onOpenChange={setBreakdownModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {breakdownMonth?.label} Breakdown
            </DialogTitle>
          </DialogHeader>
          {breakdownMonth && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-success/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projected Balance</span>
                  <span className="font-semibold text-success">{breakdownMonth.balance.toLocaleString()} TND</span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <span>Range</span>
                  <span>{breakdownMonth.p10.toLocaleString()} - {breakdownMonth.p90.toLocaleString()} TND</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-chart-2" />
                  Inflows
                </h4>
                <div className="p-2 rounded bg-chart-2/10">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Income</span>
                    <span className="text-sm font-medium">+{breakdownMonth.inflows.toLocaleString()} TND</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Outflows (Aggregated)
                </h4>
                <div className="p-2 rounded bg-destructive/10">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-medium text-destructive">-{breakdownMonth.outflows.toLocaleString()} TND</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes rent, utilities, groceries, subscriptions, and other recurring expenses
                  </p>
                </div>
              </div>

              {breakdownMonth.eventContributions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Event Contributions
                  </h4>
                  {breakdownMonth.eventContributions.map((e) => (
                    <div key={e.eventId} className="p-2 rounded bg-purple-500/10">
                      <div className="flex justify-between">
                        <span className="text-sm">{e.eventName}</span>
                        <span className="text-sm font-medium">{e.mean.toLocaleString()} ± {e.std.toLocaleString()} TND</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Readiness Score</span>
                  <Badge variant={breakdownMonth.readinessScore >= 70 ? "default" : breakdownMonth.readinessScore >= 40 ? "secondary" : "destructive"}>
                    {breakdownMonth.readinessScore}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
