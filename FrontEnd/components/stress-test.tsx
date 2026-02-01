"use client"

import { Switch } from "@/components/ui/switch"

import { useState, useCallback } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { useApp } from "./app-context"
import { getEvents, getTransactionsByUser, getCustomEventsByUser, getCustomStressTemplates } from "@/data/store"
import {
  runEnhancedMonteCarlo,
  STRESS_PRESETS,
  type StressScenario,
  type MonteCarloResult,
  type EnhancedMonteCarloConfig,
} from "@/data/forecast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Play,
  BarChart3,
  Shield,
  TrendingDown,
  Zap,
  Info,
  Settings2,
} from "lucide-react"

interface StressTestProps {
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
  label,
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

export function StressTest({ monthlySavings }: StressTestProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()

  const [selectedScenario, setSelectedScenario] = useState<string>("none")
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<(MonteCarloResult & { usingDefaults?: boolean }) | null>(null)
  const [iterations, setIterations] = useState(100)
  const [correlatedReduction, setCorrelatedReduction] = useState(0.3)
  const [includeCustomEvents, setIncludeCustomEvents] = useState(true)

  // Get custom events and templates
  const customEvents = currentUser ? getCustomEventsByUser(currentUser.id) : []
  const customTemplates = currentUser ? getCustomStressTemplates(currentUser.id) : []
  const allScenarios = [...STRESS_PRESETS, ...customTemplates.map(t => ({
    ...t,
    isCustom: true,
  }))]

  const runSimulation = useCallback(() => {
    if (!currentUser) return

    setIsRunning(true)
    setProgress(0)
    setResult(null)

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const transactions = getTransactionsByUser(currentUser.id)
      const scenario =
        selectedScenario !== "none"
          ? allScenarios.find((s) => s.id === selectedScenario)
          : undefined

      // Prepare custom events for simulation
      const customEventCosts = includeCustomEvents
        ? customEvents.map((e) => {
          const eventDate = new Date(e.startDate)
          const now = new Date()
          const monthsAway = Math.max(
            1,
            (eventDate.getFullYear() - now.getFullYear()) * 12 +
            (eventDate.getMonth() - now.getMonth())
          )
          return {
            month: monthsAway <= 6 ? monthsAway : 0,
            cost: e.estimatedCost,
            costStd: e.costStd,
          }
        }).filter((e) => e.month > 0)
        : []

      const config: EnhancedMonteCarloConfig = {
        iterations,
        monthlySavings,
        stressScenario: scenario,
        correlatedExpenseReduction: correlatedReduction,
        shockProbabilityMultiplier: 1,
        includeCustomEvents,
        customEvents: customEventCosts,
      }

      const mcResult = runEnhancedMonteCarlo(
        currentUser,
        transactions,
        events,
        config,
        (prog) => setProgress(prog)
      )

      setResult(mcResult)
      setIsRunning(false)
    }, 50)
  }, [currentUser, events, monthlySavings, selectedScenario, iterations, correlatedReduction, includeCustomEvents, customEvents])

  if (!currentUser) return null

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success"
    if (score >= 40) return "text-warning"
    return "text-destructive"
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-success/10"
    if (score >= 40) return "bg-warning/10"
    return "bg-destructive/10"
  }

  const getRiskBadge = (risk: number) => {
    if (risk <= 10)
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Low Risk
        </Badge>
      )
    if (risk <= 30)
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          Medium Risk
        </Badge>
      )
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
        High Risk
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Stress Test & Monte Carlo
        </CardTitle>
        <CardDescription>
          Run 100 simulations to analyze financial resilience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Selection */}
        <div className="flex gap-3">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select stress scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Stress (Baseline)</SelectItem>
              {STRESS_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    {preset.name}
                  </div>
                </SelectItem>
              ))}
              {customTemplates.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-1">
                    Custom Templates
                  </div>
                  {customTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={runSimulation}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Zap className="w-4 h-4 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </Button>
        </div>

        {/* Selected Scenario Description */}
        {selectedScenario !== "none" && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm">
              <span className="font-medium">
                {allScenarios.find((s) => s.id === selectedScenario)?.name}:
              </span>{" "}
              {allScenarios.find((s) => s.id === selectedScenario)?.description}
            </p>
          </div>
        )}

        {/* Advanced Settings */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            <Settings2 className="w-4 h-4" />
            Advanced Settings
          </summary>
          <div className="mt-3 space-y-4 p-3 rounded-lg bg-muted/30">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Iterations: {iterations}</span>
                <span className="text-muted-foreground">
                  {iterations <= 50 ? "Fast" : iterations <= 100 ? "Standard" : "Detailed"}
                </span>
              </div>
              <Slider
                value={[iterations]}
                onValueChange={(v) => setIterations(v[0])}
                min={30}
                max={200}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Correlated Expense Reduction</span>
                <span className="text-muted-foreground">{Math.round(correlatedReduction * 100)}%</span>
              </div>
              <Slider
                value={[correlatedReduction * 100]}
                onValueChange={(v) => setCorrelatedReduction(v[0] / 100)}
                min={0}
                max={80}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                When income drops, discretionary spending decreases by this factor
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Include custom events in simulation</span>
              <Switch
                checked={includeCustomEvents}
                onCheckedChange={setIncludeCustomEvents}
              />
            </div>
          </div>
        </details>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Running simulations...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result && !isRunning && (
          <div className="space-y-4">
            {/* Defaults Warning */}
            {result.usingDefaults && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-warning mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Using default distributions</span> -
                  Not enough transaction history for reliable user-calibrated sampling.
                  Results may be less accurate.
                </p>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-4 rounded-lg ${getScoreBg(result.resilienceScore)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Resilience Score</span>
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(result.resilienceScore)}`}>
                  {result.resilienceScore}/100
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Negative Balance Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {result.riskOfNegativeBalance}%
                  </p>
                  {getRiskBadge(result.riskOfNegativeBalance)}
                </div>
              </div>
            </div>

            {/* Probability Band Chart */}
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={result.monthlyProjections}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="p90"
                    stackId="band"
                    stroke="none"
                    fill="url(#bandGradient)"
                    name="90th Percentile"
                  />
                  <Area
                    type="monotone"
                    dataKey="p10"
                    stackId="band2"
                    stroke="none"
                    fill="#fff"
                    name="10th Percentile"
                  />
                  <Line
                    type="monotone"
                    dataKey="p50"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    name="Median (50th)"
                  />
                  <Line
                    type="monotone"
                    dataKey="p10"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Worst Case (10th)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Interpretation */}
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Interpretation</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  Based on {result.iterations} simulations, there is a{" "}
                  <span className="font-medium text-foreground">
                    {result.riskOfNegativeBalance}% chance
                  </span>{" "}
                  your balance goes negative in the next 6 months.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    {result.probabilityOfNeedingCredit}% probability
                  </span>{" "}
                  of needing credit (balance below -500 TND).
                </li>
                {result.resilienceScore < 50 && (
                  <li className="text-destructive">
                    Consider increasing your emergency buffer or reducing
                    non-essential expenses.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!result && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Select a stress scenario and click Run to simulate
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
