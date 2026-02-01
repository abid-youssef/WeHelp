"use client"

import { useMemo } from "react"
import { useApp } from "./app-context"
import { getEvents, getTransactionsByUser, getEventById } from "@/lib/store"
import { calculateReadiness } from "@/lib/forecast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  MessageCircle,
} from "lucide-react"

interface ReadinessScoreProps {
  selectedEventId?: string
  onExplainClick: () => void
}

export function ReadinessScore({ selectedEventId, onExplainClick }: ReadinessScoreProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()

  const readinessData = useMemo(() => {
    if (!currentUser || !selectedEventId) return null
    const event = getEventById(selectedEventId)
    if (!event) return null
    const transactions = getTransactionsByUser(currentUser.id)
    return {
      event,
      readiness: calculateReadiness(currentUser, transactions, event),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedEventId, refreshKey])

  if (!currentUser) return null

  if (!readinessData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Readiness Score</CardTitle>
          <CardDescription>
            Select an event from the Life Calendar to see your readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No event selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { event, readiness } = readinessData

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

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-success"
    if (score >= 40) return "bg-warning"
    return "bg-destructive"
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Readiness Score</CardTitle>
            <CardDescription>For {event.name}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onExplainClick} className="gap-1">
            <HelpCircle className="w-4 h-4" />
            Explain
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(readiness.score / 100) * 352} 352`}
                className={
                  readiness.score >= 70
                    ? "text-success"
                    : readiness.score >= 40
                      ? "text-warning"
                      : "text-destructive"
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold">{readiness.score}</span>
              <span className="text-xs text-muted-foreground uppercase">
                {readiness.level}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Top Drivers</p>
          {readiness.drivers.map((driver, index) => (
            <div
              key={driver.name}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
            >
              <div className="mt-0.5">{getImpactIcon(driver.impact)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <span
                    className={`text-sm font-medium ${
                      driver.impact === "positive"
                        ? "text-success"
                        : driver.impact === "negative"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {typeof driver.value === "number" && driver.name.includes("Rate")
                      ? `${driver.value}%`
                      : driver.value}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {driver.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <MessageCircle className="w-4 h-4" />
            Ask an Advisor
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
