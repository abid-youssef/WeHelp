"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import { getTransactionsByUser, getEvents, getGoalsByUser, getLoansByUser, updateLifeEvent, updateCustomEvent } from "@/mocks/store"
import { generateTwinData } from "@/mocks/forecast"
import { LifeCalendar } from "./life-calendar"
import { ProjectionChart } from "./projection-chart"
import { ScenarioSimulator } from "./scenario-simulator"
import { ReadinessScore } from "./readiness-score"
import { ExplainabilityModal } from "./explainability-modal"
import { ActionButtons } from "./action-buttons"
import { StressTest } from "./stress-test"
import { SensitivityPanel } from "./sensitivity-panel"
import { GoalsManager } from "./goals-manager"
import { CustomEvents } from "./custom-events"
import { CustomStressTemplates } from "./custom-stress-templates"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target,
  Shield,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react"

export function ClientDashboard() {
  const { currentUser, setCurrentUser, refreshKey, triggerRefresh } = useApp()
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()
  const [monthlySavings, setMonthlySavings] = useState(0)
  const [explainModalOpen, setExplainModalOpen] = useState(false)

  const events = getEvents()
  const goals = useMemo(
    () => (currentUser ? getGoalsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const twinData = useMemo(() => {
    if (!currentUser) return null
    const transactions = getTransactionsByUser(currentUser.id)
    const loans = getLoansByUser(currentUser.id)
    return generateTwinData(currentUser, transactions, events, loans, monthlySavings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, monthlySavings, refreshKey])

  if (!currentUser || !twinData) return null

  const maxSavings = Math.round(currentUser.monthlyIncome * 0.5)

  const handleLogout = () => {
    setCurrentUser(null)
    setSelectedEventId(undefined)
    setMonthlySavings(0)
  }

  const handleScheduleSavings = () => {
    // This is handled by ActionButtons component
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  ATB
                </span>
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Life-Companion</h1>
                <p className="text-sm text-muted-foreground">{currentUser.name}</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {currentUser.type}
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Next Event Alert */}
        {twinData.eventReadiness.length > 0 && (
          <Card
            className={`border-2 ${twinData.eventReadiness[0].status === "on_track"
              ? "border-success/30 bg-success/5"
              : twinData.eventReadiness[0].status === "at_risk"
                ? "border-warning/30 bg-warning/5"
                : "border-destructive/30 bg-destructive/5"
              }`}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${twinData.eventReadiness[0].status === "on_track"
                      ? "bg-success/20"
                      : twinData.eventReadiness[0].status === "at_risk"
                        ? "bg-warning/20"
                        : "bg-destructive/20"
                      }`}
                  >
                    {twinData.eventReadiness[0].status === "on_track" ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle
                        className={`w-5 h-5 ${twinData.eventReadiness[0].status === "at_risk"
                          ? "text-warning"
                          : "text-destructive"
                          }`}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Next Event: {twinData.eventReadiness[0].eventName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {twinData.eventReadiness[0].monthsAway} months away -{" "}
                      {twinData.eventReadiness[0].status === "on_track"
                        ? "You're on track!"
                        : twinData.eventReadiness[0].status === "at_risk"
                          ? `Gap: ${twinData.eventReadiness[0].gapAmount.toLocaleString()} TND`
                          : `Critical gap: ${twinData.eventReadiness[0].gapAmount.toLocaleString()} TND`}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    twinData.eventReadiness[0].status === "on_track"
                      ? "bg-success text-success-foreground"
                      : twinData.eventReadiness[0].status === "at_risk"
                        ? "bg-warning text-warning-foreground"
                        : "bg-destructive text-destructive-foreground"
                  }
                >
                  {twinData.eventReadiness[0].readiness}% Ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-semibold">
                    {currentUser.balance.toLocaleString()} TND
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings Rate</p>
                  <p className="text-lg font-semibold">
                    {twinData.insights.savingsRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${twinData.insights.monthsOfSavings >= 3
                    ? "bg-success/10"
                    : twinData.insights.monthsOfSavings >= 1
                      ? "bg-warning/10"
                      : "bg-destructive/10"
                    }`}
                >
                  <PiggyBank
                    className={`w-5 h-5 ${twinData.insights.monthsOfSavings >= 3
                      ? "text-success"
                      : twinData.insights.monthsOfSavings >= 1
                        ? "text-warning"
                        : "text-destructive"
                      }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Emergency Buffer</p>
                  <p className="text-lg font-semibold">
                    {twinData.insights.monthsOfSavings} mo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Goals</p>
                  <p className="text-lg font-semibold">
                    {goals.filter((g) => g.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events & Calendar</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="stress-test">Stress Test</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Calendar & Actions */}
              <div className="space-y-6">
                <LifeCalendar
                  onEventSelect={setSelectedEventId}
                  selectedEventId={selectedEventId}
                />
                <ActionButtons
                  selectedEventId={selectedEventId}
                  monthlySavings={monthlySavings}
                  onActionComplete={triggerRefresh}
                />
              </div>

              {/* Middle/Right Column - Projection & Readiness */}
              <div className="lg:col-span-2 space-y-6">
                <ProjectionChart monthlySavings={monthlySavings} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ScenarioSimulator
                    monthlySavings={monthlySavings}
                    onSavingsChange={setMonthlySavings}
                    onScheduleSavings={handleScheduleSavings}
                    maxSavings={maxSavings}
                  />
                  <ReadinessScore
                    selectedEventId={selectedEventId}
                    onExplainClick={(id) => {
                      setSelectedEventId(id)
                      setExplainModalOpen(true)
                    }}
                    onAdvisorClick={(id) => {
                      if (id.startsWith("custom_")) {
                        updateCustomEvent(id, { consultationRequested: true })
                      } else {
                        updateLifeEvent(id, { consultationRequested: true })
                      }
                      triggerRefresh()
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LifeCalendar
                onEventSelect={setSelectedEventId}
                selectedEventId={selectedEventId}
              />
              <CustomEvents />
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <GoalsManager />
          </TabsContent>

          <TabsContent value="stress-test" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <StressTest monthlySavings={monthlySavings} />
              </div>
              <div className="space-y-6">
                <SensitivityPanel monthlySavings={monthlySavings} />
                <CustomStressTemplates />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Active Goals */}
        {goals.filter((g) => g.status === "active").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Your Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goals
                  .filter((g) => g.status === "active")
                  .map((goal) => {
                    const event = events.find((e) => e.id === goal.eventId)
                    const progress = Math.round(
                      (goal.currentAmount / goal.targetAmount) * 100
                    )
                    return (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <PiggyBank className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {event?.name || "Savings Goal"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {goal.monthlyContribution} TND/month
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {goal.advisorApproved ? (
                              <Badge
                                variant="default"
                                className="bg-success text-success-foreground gap-1"
                              >
                                <Shield className="w-3 h-3" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                Pending Review
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">
                            {goal.currentAmount.toLocaleString()} /{" "}
                            {goal.targetAmount.toLocaleString()} TND
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Explainability Modal */}
      <ExplainabilityModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        selectedEventId={selectedEventId}
      />
    </div>
  )
}
