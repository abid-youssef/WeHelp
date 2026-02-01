"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import { getTransactionsByUser, getEvents, getGoalsByUser, getCustomEventsByUser, getActiveLoans, getLoansByUser, updateLifeEvent, updateCustomEvent } from "@/data/store"
import { generateTwinData } from "@/data/forecast"
import { BalanceProjectionChart } from "./balance-projection-chart"
import { LifeCalendar } from "./life-calendar"
import { CustomEvents } from "./custom-events"
import { GoalsManager } from "./goals-manager"
import { StressTest } from "./stress-test"
import { SensitivityPanel } from "./sensitivity-panel"
import { ReadinessScore } from "./readiness-score"
import { ExplainabilityModal } from "./explainability-modal"
import { LoanRequest } from "./loan-request"
import { MonthlyObligations } from "./monthly-obligations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Calendar,
  Target,
  AlertTriangle,
  Info,
  ChevronRight,
  BarChart3,
  Zap,
  Banknote,
  Clock,
  CreditCard,
} from "lucide-react"

export function BalanceFirstDashboard() {
  const { currentUser, setCurrentUser, refreshKey, triggerRefresh } = useApp()
  const [activeTab, setActiveTab] = useState("events")
  const [loanTrigger, setLoanTrigger] = useState(0)
  const [loanEventId, setLoanEventId] = useState<string | undefined>()
  const [monthlySavings, setMonthlySavings] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [projectionExplainOpen, setProjectionExplainOpen] = useState(false)

  const events = getEvents()
  const goals = useMemo(
    () => (currentUser ? getGoalsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )
  const customEvents = useMemo(
    () => (currentUser ? getCustomEventsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const twinData = useMemo(() => {
    if (!currentUser) return null
    const transactions = getTransactionsByUser(currentUser.id)
    const loans = getLoansByUser(currentUser.id)
    return generateTwinData(currentUser, transactions, events, loans, monthlySavings)
  }, [currentUser, events, monthlySavings, refreshKey])

  const userLoans = useMemo(
    () => (currentUser ? getLoansByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  if (!currentUser || !twinData) return null

  const maxSavings = Math.round(currentUser.monthlyIncome * 0.5)

  const handleLogout = () => {
    setCurrentUser(null)
    setSelectedEventId(undefined)
    setMonthlySavings(0)
  }

  // Calculate quick stats
  const nextEvent = twinData.eventReadiness[0]
  const totalEventCosts = customEvents.reduce((sum, e) => sum + e.estimatedCost, 0) +
    events.filter(e => new Date(e.startDate) > new Date()).reduce((sum, e) => sum + e.estimatedCost, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">ATB</span>
              </div>
              <div>
                <h1 className="font-semibold text-sm text-foreground">Life-Companion</h1>
                <p className="text-xs text-muted-foreground">{currentUser.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize text-xs">
              {currentUser.type}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 bg-transparent"
              onClick={() => setProjectionExplainOpen(true)}
            >
              <Info className="w-3 h-3" />
              How it works
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm font-semibold">{currentUser.balance.toLocaleString()} TND</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly Net</p>
                <p className="text-sm font-semibold text-chart-2">
                  {(twinData.insights.savingsRate > 0 ? "+" : "")}{Math.round(currentUser.monthlyIncome * twinData.insights.savingsRate / 100)} TND
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Events (6mo)</p>
                <p className="text-sm font-semibold">{totalEventCosts.toLocaleString()} TND</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-chart-4" />
              <div>
                <p className="text-xs text-muted-foreground">Goals</p>
                <p className="text-sm font-semibold">{goals.filter(g => g.status === "active").length} Active</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Next Event Alert (compact) */}
        {nextEvent && nextEvent.status !== "on_track" && (
          <Card className={`border-2 ${nextEvent.status === "at_risk" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${nextEvent.status === "at_risk" ? "text-warning" : "text-destructive"}`} />
                <div>
                  <p className="text-sm font-medium">
                    {nextEvent.eventName} {nextEvent.monthsAway === 0 ? "starts this month" : nextEvent.monthsAway === 1 ? "starts next month" : `in ${nextEvent.monthsAway} months`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gap: {nextEvent.gapAmount.toLocaleString()} TND
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {nextEvent.status === "critical" && (
                  (() => {
                    const existingLoan = userLoans.find(
                      (l) =>
                        l.eventId === nextEvent.eventId &&
                        l.status !== "completed" &&
                        l.status !== "rejected_by_advisor"
                    );

                    if (existingLoan) {
                      return (
                        <Badge variant="outline" className="h-8 gap-1 border-primary/50 text-primary">
                          <Clock className="w-3 h-3" />
                          {existingLoan.status.includes("approved") ? "Loan Approved" : "Loan Pending"}
                        </Badge>
                      );
                    }

                    return (
                      <Button
                        size="sm"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1 h-8"
                        onClick={() => {
                          setActiveTab("loans");
                          setLoanTrigger(Date.now());
                          setLoanEventId(nextEvent.eventId);
                        }}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Apply for Loan
                      </Button>
                    );
                  })()
                )}
                <Badge className={nextEvent.status === "at_risk" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>
                  {nextEvent.readiness}% Ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PRIMARY: Balance Projection Chart */}
        <BalanceProjectionChart
          monthlySavings={monthlySavings}
          onSavingsChange={setMonthlySavings}
          maxSavings={maxSavings}
        />

        {/* Secondary Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="bills" className="gap-1">
              <CreditCard className="w-4 h-4" />
              Bills
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1">
              <Calendar className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1">
              <Target className="w-4 h-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="stress" className="gap-1">
              <Zap className="w-4 h-4" />
              Stress Test
            </TabsTrigger>
            <TabsTrigger value="readiness" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              Readiness
            </TabsTrigger>
            <TabsTrigger value="loans" className="gap-1">
              <Banknote className="w-4 h-4" />
              Loans
            </TabsTrigger>

          </TabsList>

          <TabsContent value="events" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LifeCalendar
                onEventSelect={setSelectedEventId}
                selectedEventId={selectedEventId}
              />
              <CustomEvents />
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            <GoalsManager />
          </TabsContent>

          <TabsContent value="stress" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <StressTest monthlySavings={monthlySavings} />
              </div>
              <SensitivityPanel monthlySavings={monthlySavings} />
            </div>
          </TabsContent>

          <TabsContent value="readiness" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReadinessScore
                selectedEventId={selectedEventId || twinData.eventReadiness[0]?.eventId}
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Readiness Overview</CardTitle>
                  <CardDescription>Your preparation status for upcoming events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {twinData.eventReadiness.map((er) => (
                      <div
                        key={er.eventId}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedEventId(er.eventId)}
                      >
                        <div>
                          <p className="font-medium text-sm">{er.eventName}</p>
                          <p className="text-xs text-muted-foreground">
                            {er.monthsAway === 0 ? "Starting this month" : er.monthsAway === 1 ? "Next month" : `${er.monthsAway} months away`}
                            {er.gapAmount > 0 && ` • Gap: ${er.gapAmount.toLocaleString()} TND`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              er.status === "on_track"
                                ? "bg-success text-success-foreground"
                                : er.status === "at_risk"
                                  ? "bg-warning text-warning-foreground"
                                  : "bg-destructive text-destructive-foreground"
                            }
                          >
                            {er.readiness}%
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="loans" className="mt-4">
            <LoanRequest
              onLoanCreated={triggerRefresh}
              trigger={loanTrigger}
              eventId={loanEventId}
            />
          </TabsContent>

          <TabsContent value="bills" className="mt-4">
            <MonthlyObligations />
          </TabsContent>
        </Tabs>
      </main>

      {/* Explainability Modal */}
      <ExplainabilityModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        selectedEventId={selectedEventId}
      />

      {/* Projection Explanation Modal */}
      <Dialog open={projectionExplainOpen} onOpenChange={setProjectionExplainOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              How Projection Works
            </DialogTitle>
            <DialogDescription>
              Understanding your balance projection and confidence bands
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">Monthly Balance Calculation</h4>
              <p className="text-muted-foreground">
                Balance = Previous Month + Income - Outflows - Event Costs + Savings
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">Aggregated Outflows</h4>
              <p className="text-muted-foreground">
                All recurring expenses (rent, utilities, groceries, subscriptions) are summed into a single monthly outflow figure.
                You can tap any month to see the breakdown.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">Event Costs (User-Defined)</h4>
              <p className="text-muted-foreground">
                When you add an event, you specify the estimated cost and error margin (e.g., 600 ± 150 TND).
                The projection samples from this distribution to show realistic uncertainty.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">Confidence Bands (Monte Carlo)</h4>
              <p className="text-muted-foreground">
                We run 30 simulations with random variations in income, expenses, and event costs.
                The shaded area shows the 10th to 90th percentile range - your balance will likely fall within this band.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-medium mb-1 text-primary">Try It</h4>
              <p className="text-muted-foreground">
                Use the savings slider to see how increasing your monthly savings affects your projected balance and narrows the confidence band.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
