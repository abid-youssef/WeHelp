"use client"

import { useMemo, useState } from "react"
import { useApp } from "./app-context"
import { getTransactionsByUser, getEventById, getGoalsByUser } from "@/data/store"
import { calculateReadiness, computeCalibratedDistributions } from "@/data/forecast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Info,
  Code,
  ChevronDown,
  AlertTriangle,
  Edit2,
  Save,
  Check,
} from "lucide-react"
import { updateLifeEvent, updateCustomEvent } from "@/data/store"
import { Input } from "@/components/ui/input"

interface ExplainabilityModalProps {
  isOpen: boolean
  onClose: () => void
  selectedEventId?: string
}

export function ExplainabilityModal({
  isOpen,
  onClose,
  selectedEventId,
}: ExplainabilityModalProps) {
  const { currentUser, refreshKey, triggerRefresh } = useApp()
  const [showMath, setShowMath] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editCost, setEditCost] = useState("")
  const [editStd, setEditStd] = useState("")

  const data = useMemo(() => {
    if (!currentUser || !selectedEventId) return null
    const event = getEventById(selectedEventId)
    if (!event) return null
    const transactions = getTransactionsByUser(currentUser.id)
    const calibrated = computeCalibratedDistributions(transactions, currentUser)
    const goals = getGoalsByUser(currentUser.id)
    const linkedGoal = goals.find((g) => g.eventId === event.id)
    return {
      event,
      readiness: calculateReadiness(currentUser, transactions, event),
      calibrated,
      linkedGoal,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedEventId, refreshKey])

  if (!data) return null

  const { event, readiness, calibrated, linkedGoal } = data

  const handleStartEdit = () => {
    setEditCost(event.estimatedCost.toString())
    setEditStd(event.costStd.toString())
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    const cost = parseInt(editCost)
    const std = parseInt(editStd)
    if (isNaN(cost) || isNaN(std)) return

    if (event.id.startsWith("custom_")) {
      updateCustomEvent(event.id, { estimatedCost: cost, costStd: std })
    } else {
      updateLifeEvent(event.id, { estimatedCost: cost, costStd: std })
    }

    setIsEditing(false)
    triggerRefresh()
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-success" />
      case "negative":
        return <TrendingDown className="w-4 h-4 text-destructive" />
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 70) return { label: "High", variant: "default" as const }
    if (score >= 40) return { label: "Medium", variant: "secondary" as const }
    return { label: "Low", variant: "destructive" as const }
  }

  const confidence = getConfidenceLabel(readiness.score)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>How We Calculate Your Readiness</DialogTitle>
              <DialogDescription>For {event.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Readiness Score</p>
              <p className="text-2xl font-bold">{readiness.score}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              {!isEditing ? (
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-semibold">{event.estimatedCost.toLocaleString()} TND</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleStartEdit}>
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 w-20 text-right px-1"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                    />
                    <span className="text-xs">TND</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">±</span>
                    <Input
                      className="h-7 w-16 text-right px-1"
                      value={editStd}
                      onChange={(e) => setEditStd(e.target.value)}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={handleSaveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Scoring Methodology</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Your readiness score is calculated using a weighted combination of
                four key financial metrics:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <span className="font-medium text-foreground">Savings Rate</span>{" "}
                  (30%) - Percentage of income saved monthly
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Expense Stability
                  </span>{" "}
                  (20%) - Consistency of monthly spending
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Emergency Buffer
                  </span>{" "}
                  (25%) - Months of expenses covered by savings
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Goal Gap Ratio
                  </span>{" "}
                  (25%) - How close you are to event target
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Key Factors Affecting Your Score</p>
            </div>
            {readiness.drivers.map((driver) => (
              <div
                key={driver.name}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                {getImpactIcon(driver.impact)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{driver.name}</p>
                    <Badge
                      variant={
                        driver.impact === "positive"
                          ? "default"
                          : driver.impact === "negative"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        driver.impact === "positive"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {driver.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {driver.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Show Math Toggle */}
          <Collapsible open={showMath} onOpenChange={setShowMath}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-transparent"
              >
                <span className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Show Math
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showMath ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="p-4 rounded-lg bg-muted/50 font-mono text-xs space-y-3">
                <p className="text-muted-foreground">// Scoring Formula</p>
                <pre className="whitespace-pre-wrap text-foreground">
                  {`Score = 
  (norm_savings_rate × 30) +
  (norm_expense_stability × 20) +
  (norm_months_buffer × 25) +
  (norm_gap_ratio × 25)

where:
  norm_savings_rate = min(max(savings_rate × 5, 0), 1)
  norm_expense_stability = max(1 - volatility × 2, 0)
  norm_months_buffer = min(months_of_savings / 3, 1)
  norm_gap_ratio = min(gap_ratio, 1)`}
                </pre>
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground mb-2">// Your Values</p>
                  <div className="grid grid-cols-2 gap-2 text-foreground">
                    {readiness.drivers.map((d) => (
                      <div key={d.name}>
                        <span className="text-muted-foreground">{d.name}:</span>{" "}
                        {d.value}
                        {d.name.includes("Rate") || d.name.includes("Stability")
                          ? "%"
                          : d.name.includes("Buffer")
                            ? " mo"
                            : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* User-Calibrated Distributions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Your Calibrated Distributions</p>
              {calibrated.income.isReliable ? (
                <Badge className="bg-success/10 text-success border-success/20 text-xs">
                  Reliable
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Limited Data
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Monthly Income</p>
                <p className="font-semibold">
                  {Math.round(calibrated.income.mean).toLocaleString()} TND
                </p>
                <p className="text-xs text-muted-foreground">
                  ±{Math.round(calibrated.income.std).toLocaleString()} std
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                <p className="font-semibold">
                  {Math.round(calibrated.expense.mean).toLocaleString()} TND
                </p>
                <p className="text-xs text-muted-foreground">
                  ±{Math.round(calibrated.expense.std).toLocaleString()} std
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These distributions are computed from your transaction history and used
              for Monte Carlo simulations to provide personalized forecasts.
            </p>
          </div>

          {/* Linked Goal */}
          {linkedGoal && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Linked Goal: {linkedGoal.name}</p>
                  <p className="text-muted-foreground mt-1">
                    Progress: {linkedGoal.currentAmount.toLocaleString()} / {linkedGoal.targetAmount.toLocaleString()} TND
                    ({Math.round((linkedGoal.currentAmount / linkedGoal.targetAmount) * 100)}%)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sensitivity Insight */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Sensitivity Insight</p>
                <p className="text-muted-foreground mt-1">
                  If your income drops by 20%, your readiness score would decrease
                  by approximately {Math.round(readiness.score * 0.25)} points. Consider
                  building a 3-month emergency buffer.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">
              <span className="font-medium">Note:</span> This scoring uses
              rule-based calculations with your actual transaction data. No
              black-box AI models are used, ensuring full transparency and
              auditability.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
