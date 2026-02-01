"use client"

import { useState, useCallback } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { useApp } from "./app-context"
import { getEvents, getTransactionsByUser } from "@/lib/store"
import { runSensitivityAnalysis, type SensitivityResult } from "@/lib/forecast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Play, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"

interface SensitivityPanelProps {
  monthlySavings: number
}

interface TooltipPayload {
  value: number
  name: string
  color: string
  payload: { value: number; score: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm">
        <span className="text-muted-foreground">Value:</span>{" "}
        <span className="font-medium">{data.value}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Score:</span>{" "}
        <span className="font-bold">{data.score}</span>
      </p>
    </div>
  )
}

export function SensitivityPanel({ monthlySavings }: SensitivityPanelProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<SensitivityResult[] | null>(null)

  const runAnalysis = useCallback(() => {
    if (!currentUser) return

    setIsRunning(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 15, 90))
    }, 200)

    setTimeout(() => {
      const transactions = getTransactionsByUser(currentUser.id)
      const sensitivityResults = runSensitivityAnalysis(
        currentUser,
        transactions,
        events,
        monthlySavings
      )

      clearInterval(progressInterval)
      setProgress(100)
      setResults(sensitivityResults)
      setIsRunning(false)
    }, 100)
  }, [currentUser, events, monthlySavings])

  if (!currentUser) return null

  const formatChartData = (result: SensitivityResult) => {
    return result.testValues.map((value, index) => ({
      value,
      score: result.scores[index],
    }))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Sensitivity Analysis
        </CardTitle>
        <CardDescription>
          How changes in income or savings affect your resilience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results && !isRunning && (
          <div className="text-center py-6">
            <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              Analyze how your resilience score changes with different scenarios
            </p>
            <Button onClick={runAnalysis} className="gap-2">
              <Play className="w-4 h-4" />
              Run Analysis
            </Button>
          </div>
        )}

        {isRunning && (
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span>Analyzing scenarios...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results && !isRunning && (
          <Tabs defaultValue="savings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="savings" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Savings
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <TrendingDown className="w-4 h-4" />
                Income Drop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="savings" className="space-y-4 pt-4">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={formatChartData(results[0])}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="value"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Monthly Savings (TND)",
                        position: "bottom",
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Score",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      x={monthlySavings}
                      stroke="#22c55e"
                      strokeDasharray="4 4"
                      label={{
                        value: "Current",
                        position: "top",
                        fontSize: 10,
                        fill: "#22c55e",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm">
                  <TrendingUp className="w-4 h-4 inline mr-1 text-success" />
                  <span className="font-medium">{results[0].impact}</span> - Increasing
                  savings significantly improves your resilience.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="income" className="space-y-4 pt-4">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={formatChartData(results[1])}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="value"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Income Drop (%)",
                        position: "bottom",
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Score",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      x={0}
                      stroke="#22c55e"
                      strokeDasharray="4 4"
                      label={{
                        value: "Current",
                        position: "top",
                        fontSize: 10,
                        fill: "#22c55e",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1 text-destructive" />
                  <span className="font-medium">{results[1].impact}</span> - Build an
                  emergency buffer to protect against income loss.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {results && (
          <Button
            variant="outline"
            onClick={runAnalysis}
            className="w-full gap-2 bg-transparent"
          >
            <Play className="w-4 h-4" />
            Re-run Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
