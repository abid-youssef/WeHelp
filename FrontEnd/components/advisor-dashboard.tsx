"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import {
  getPendingAdvisorActions,
  getUsers,
  getUserById,
  getTransactionsByUser,
  getEventById,
  getAuditLogs,
  updateGoal,
  updateMicroLoanRequest,
  createAuditLog,
  getLoanById,
  approveLoan,
  rejectLoan,
  type AdvisorAction,
  getLoansByUser,
  type Loan,
} from "@/mocks/store"
import { LOAN_PURPOSES } from "@/mocks/seed-data"
import { events } from "@/mocks/seed-data"
import { generateTwinData, classifyClient, calculateLoanRiskScore } from "@/mocks/forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  PiggyBank,
  Banknote,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  History as HistoryIcon,
} from "lucide-react"
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

export function AdvisorDashboard() {
  const { currentAdvisor, setCurrentAdvisor, setIsAdvisorMode, refreshKey, triggerRefresh } = useApp()
  const [selectedAction, setSelectedAction] = useState<AdvisorAction | null>(null)
  const [actionModal, setActionModal] = useState<{
    open: boolean
    type: "approve" | "reject" | "modify"
  }>({ open: false, type: "approve" })
  const [comment, setComment] = useState("")
  const [modifyAmount, setModifyAmount] = useState("")

  const pendingActions = useMemo(() => getPendingAdvisorActions(), [refreshKey])
  const auditLogs = useMemo(() => getAuditLogs(), [refreshKey])

  if (!currentAdvisor) return null

  const handleLogout = () => {
    setCurrentAdvisor(null)
    setIsAdvisorMode(false)
  }

  const handleOpenAction = (action: AdvisorAction) => {
    setSelectedAction(action)
    setModifyAmount(action.amount.toString())
  }

  const handleApprove = () => {
    if (!selectedAction || !currentAdvisor) return

    if (selectedAction.type === "goal") {
      updateGoal(selectedAction.id, { advisorApproved: true })
      createAuditLog({
        userId: selectedAction.userId,
        advisorId: currentAdvisor.id,
        action: "approve",
        actionType: "savings",
        amount: selectedAction.amount,
        comment: comment || "Approved without additional comments",
      })
    } else {
      // Check if this is a new Loan or old MicroLoanRequest
      const loan = getLoanById(selectedAction.id)
      if (loan) {
        // New Loan type - use approveLoan
        approveLoan(selectedAction.id, currentAdvisor.id, comment)
      } else {
        // Old MicroLoanRequest - use updateMicroLoanRequest
        updateMicroLoanRequest(selectedAction.id, {
          status: "approved",
          advisorComment: comment,
        })
        createAuditLog({
          userId: selectedAction.userId,
          advisorId: currentAdvisor.id,
          action: "approve",
          actionType: "micro_loan",
          amount: selectedAction.amount,
          comment: comment || "Approved without additional comments",
        })
      }
    }

    setActionModal({ open: false, type: "approve" })
    setSelectedAction(null)
    setComment("")
    triggerRefresh()
  }

  const handleReject = () => {
    if (!selectedAction || !currentAdvisor) return

    if (selectedAction.type === "goal") {
      updateGoal(selectedAction.id, { status: "cancelled" })
      createAuditLog({
        userId: selectedAction.userId,
        advisorId: currentAdvisor.id,
        action: "reject",
        actionType: "savings",
        amount: selectedAction.amount,
        comment: comment || "Rejected without additional comments",
      })
    } else {
      // Check if this is a new Loan or old MicroLoanRequest
      const loan = getLoanById(selectedAction.id)
      if (loan) {
        // New Loan type - use rejectLoan
        rejectLoan(selectedAction.id, currentAdvisor.id, comment || "Rejected by advisor")
      } else {
        // Old MicroLoanRequest - use updateMicroLoanRequest
        updateMicroLoanRequest(selectedAction.id, {
          status: "rejected",
          advisorComment: comment,
        })
        createAuditLog({
          userId: selectedAction.userId,
          advisorId: currentAdvisor.id,
          action: "reject",
          actionType: "micro_loan",
          amount: selectedAction.amount,
          comment: comment || "Rejected without additional comments",
        })
      }
    }

    setActionModal({ open: false, type: "reject" })
    setSelectedAction(null)
    setComment("")
    triggerRefresh()
  }

  const handleModify = () => {
    if (!selectedAction || !currentAdvisor) return

    const newAmount = parseInt(modifyAmount, 10)
    if (isNaN(newAmount) || newAmount <= 0) return

    if (selectedAction.type === "goal") {
      updateGoal(selectedAction.id, {
        advisorApproved: true,
        monthlyContribution: newAmount,
      })
      createAuditLog({
        userId: selectedAction.userId,
        advisorId: currentAdvisor.id,
        action: "modify",
        actionType: "savings",
        amount: newAmount,
        comment: comment || `Modified amount from ${selectedAction.amount} to ${newAmount} TND`,
      })
    } else {
      // For loans, modification means approving with a different amount
      // Note: For new Loan type, we approve as-is since amount modification is complex
      const loan = getLoanById(selectedAction.id)
      if (loan) {
        // Approve the loan as-is (amount modification would require recalculating schedule)
        approveLoan(selectedAction.id, currentAdvisor.id, comment || `Approved with modification note`)
      } else {
        // Old MicroLoanRequest
        updateMicroLoanRequest(selectedAction.id, {
          status: "approved",
          amount: newAmount,
          advisorComment: comment,
        })
        createAuditLog({
          userId: selectedAction.userId,
          advisorId: currentAdvisor.id,
          action: "modify",
          actionType: "micro_loan",
          amount: newAmount,
          comment: comment || `Modified amount from ${selectedAction.amount} to ${newAmount} TND`,
        })
      }
    }

    setActionModal({ open: false, type: "modify" })
    setSelectedAction(null)
    setComment("")
    setModifyAmount("")
    triggerRefresh()
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "high":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            High Risk
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-warning text-warning-foreground gap-1">
            <Clock className="w-3 h-3" />
            Medium Risk
          </Badge>
        )
      default:
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle className="w-3 h-3" />
            Low Risk
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <header className="border-b border-sidebar-border bg-sidebar sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">Advisor Portal</h1>
                <p className="text-sm text-sidebar-foreground/70">
                  {currentAdvisor.name} - {currentAdvisor.branch}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground">
            {pendingActions.length} Pending
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-sidebar-accent border-sidebar-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">
                    {pendingActions.length}
                  </p>
                  <p className="text-sm text-sidebar-foreground/70">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar-accent border-sidebar-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">
                    {pendingActions.filter((a) => a.riskLevel === "high").length}
                  </p>
                  <p className="text-sm text-sidebar-foreground/70">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar-accent border-sidebar-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">
                    {auditLogs.length}
                  </p>
                  <p className="text-sm text-sidebar-foreground/70">Actions Logged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Actions */}
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-sidebar-foreground">Client Dossiers</CardTitle>
            <CardDescription className="text-sidebar-foreground/70">
              Prioritized by risk level and upcoming events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingActions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-sidebar-foreground">All caught up!</p>
                <p className="text-sm text-sidebar-foreground/70">
                  No pending actions require your review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => {
                  const user = getUserById(action.userId)
                  const txs = user ? getTransactionsByUser(user.id) : []
                  const userLoans = user ? getLoansByUser(user.id) : []
                  const twin = user ? generateTwinData(user, txs, events, userLoans, 0) : null
                  const category = twin ? classifyClient(twin.insights.monthsOfSavings, twin.insights.savingsRate / 100) : null

                  return (
                    <div
                      key={action.id}
                      className="p-4 rounded-lg border border-sidebar-border bg-sidebar hover:border-sidebar-primary/50 cursor-pointer transition-colors"
                      onClick={() => handleOpenAction(action)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                            {action.type === "goal" ? (
                              <PiggyBank className="w-5 h-5 text-sidebar-primary" />
                            ) : (
                              <Banknote className="w-5 h-5 text-sidebar-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sidebar-foreground">
                                {action.userName}
                              </p>
                              {category && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal" style={{ color: category.color, borderColor: category.color }}>
                                  {category.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-sidebar-foreground/70">
                              {action.type === "goal" ? "Savings Goal" : "Micro-Loan"} -{" "}
                              {action.amount.toLocaleString()} TND
                            </p>
                            {action.eventName && (
                              <p className="text-xs text-sidebar-foreground/50 mt-1">
                                For: {action.eventName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(action.riskLevel)}
                          <p className="text-xs text-sidebar-foreground/50 mt-2">
                            {new Date(action.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        {auditLogs.length > 0 && (
          <Card className="bg-sidebar-accent border-sidebar-border">
            <CardHeader>
              <CardTitle className="text-sidebar-foreground">Audit Log</CardTitle>
              <CardDescription className="text-sidebar-foreground/70">
                Recent advisor actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.slice(0, 10).map((log) => {
                  const user = getUserById(log.userId)
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-sidebar"
                    >
                      <div className="flex items-center gap-3">
                        {log.action === "approve" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : log.action === "reject" ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-warning" />
                        )}
                        <div>
                          <p className="text-sm text-sidebar-foreground">
                            <span className="font-medium">{log.action}</span>{" "}
                            {log.actionType} for {user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-sidebar-foreground/50">
                            {log.comment}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-sidebar-foreground/50">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Client Dossier Modal */}
      <ClientDossierModal
        action={selectedAction}
        onClose={() => setSelectedAction(null)}
        onApprove={() => setActionModal({ open: true, type: "approve" })}
        onReject={() => setActionModal({ open: true, type: "reject" })}
        onModify={() => setActionModal({ open: true, type: "modify" })}
      />

      {/* Action Confirmation Modal */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) => setActionModal((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.type === "approve"
                ? "Approve Request"
                : actionModal.type === "reject"
                  ? "Reject Request"
                  : "Modify Request"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.type === "approve"
                ? "Confirm approval of this request"
                : actionModal.type === "reject"
                  ? "Provide a reason for rejection"
                  : "Adjust the amount before approval"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionModal.type === "modify" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Amount (TND)</label>
                <Input
                  type="number"
                  value={modifyAmount}
                  onChange={(e) => setModifyAmount(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the audit log..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionModal({ open: false, type: "approve" })}
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.type === "reject" ? "destructive" : "default"}
              onClick={
                actionModal.type === "approve"
                  ? handleApprove
                  : actionModal.type === "reject"
                    ? handleReject
                    : handleModify
              }
            >
              {actionModal.type === "approve"
                ? "Approve"
                : actionModal.type === "reject"
                  ? "Reject"
                  : "Modify & Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Client Dossier Modal Component
function ClientDossierModal({
  action,
  onClose,
  onApprove,
  onReject,
  onModify,
}: {
  action: AdvisorAction | null
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onModify: () => void
}) {
  const user = action ? getUserById(action.userId) : null
  const transactions = useMemo(() => action ? getTransactionsByUser(action.userId) : [], [action])

  const twinData = useMemo(() => {
    if (!action || !user) return null
    const loans = getLoansByUser(user.id)
    return generateTwinData(user, transactions, events, loans, 0)
  }, [action, user, transactions])

  const classification = useMemo(() => {
    if (!twinData) return null
    return classifyClient(twinData.insights.monthsOfSavings, twinData.insights.savingsRate / 100)
  }, [twinData])

  const loanRisk = useMemo(() => {
    if (!action || !user) return null
    return calculateLoanRiskScore(user, transactions, action.amount)
  }, [action, user, transactions, twinData])

  if (!action || !user || !classification) return null

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Client Dossier & Risk Assessment
          </DialogTitle>
          <DialogDescription>
            Review {user.name}&apos;s profile for {action.type === "goal" ? "savings goal" : "loan request"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2">
          {/* 1. Client Profile & Classification */}
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md`}
              style={{ backgroundColor: classification.color }}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{user.name}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-normal" style={{ color: classification.color, borderColor: classification.color }}>
                  {classification.category}
                </Badge>
                <span>•</span>
                <span>{user.monthlyIncome.toLocaleString()} TND/mo</span>
                <span>•</span>
                <span>{user.balance.toLocaleString()} TND Balance</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Readiness</div>
              <div className={`text-2xl font-bold ${twinData!.readiness.score >= 70 ? "text-success" : twinData!.readiness.score >= 40 ? "text-warning" : "text-destructive"}`}>
                {twinData!.readiness.score}/100
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2. Loan Risk Score (New) */}
            {loanRisk && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Risk Assessment
                </h4>
                <div className={`p-4 rounded-lg border-2 ${loanRisk.level === "low" ? "border-success/20 bg-success/5" : loanRisk.level === "medium" ? "border-warning/20 bg-warning/5" : "border-destructive/20 bg-destructive/5"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">{loanRisk.recommendation}</p>
                      <p className="text-sm opacity-80">Risk Score: {loanRisk.score}/100</p>
                    </div>
                    <Badge className={`text-[10px] h-6 px-1.5 ${loanRisk.level === "low" ? "bg-success" : loanRisk.level === "medium" ? "bg-warning" : "bg-destructive"}`}>
                      {loanRisk.level.toUpperCase()} RISK
                    </Badge>
                  </div>

                  {/* Risk Gauge (Visual) */}
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-6">
                    <div
                      className={`h-full transition-all duration-1000 ${loanRisk.level === "low" ? "bg-success" :
                        loanRisk.level === "medium" ? "bg-warning" : "bg-destructive"
                        }`}
                      style={{ width: `${loanRisk.score}%` }}
                    />
                  </div>

                  <div className="space-y-1">
                    {loanRisk.drivers.map(driver => (
                      <div key={driver.name} className="flex items-center gap-2 text-xs">
                        {driver.impact === "positive" ? (
                          <CheckCircle className="w-3 h-3 text-success" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        )}
                        <span className="flex-1 opacity-80">{driver.name}</span>
                        <span className={`font-medium ${driver.impact === "positive" ? "text-success" : "text-destructive"}`}>
                          {driver.impact === "positive" ? "+" : "-"}{Math.round(driver.contribution)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2b. Readiness Radar (New) */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Readiness Profile
              </h4>
              <div className="p-2 border rounded-lg bg-card h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={twinData!.readiness.breakdown}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#0ea5e9"
                      fill="#0ea5e9"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Detailed Readiness Breakdown */}
          {twinData && (
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Key Drivers Impact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {twinData.readiness.drivers.map((driver) => (
                  <div key={driver.name} className="p-3 rounded-lg bg-muted/50 border flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{driver.name}</span>
                      {driver.impact === "positive" ? <TrendingUp className="w-3 h-3 text-success" /> : driver.impact === "negative" ? <TrendingDown className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">{driver.value}</span>
                      <span className="text-xs text-muted-foreground">{driver.description.split(' (')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Request Details & 5. Audit Trail in Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Request Details</TabsTrigger>
              <TabsTrigger value="history">History & Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Request Summary</h4>
                  <Badge variant="secondary" className="font-mono">
                    {action.amount.toLocaleString()} TND
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &quot;{action.description || 'No description provided'}&quot;
                </p>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  Audit Trail & Decision History
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                        <th className="px-3 py-2 font-medium">Advisor</th>
                        <th className="px-3 py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {getAuditLogs().filter(log => log.userId === user.id).length > 0 ? (
                        getAuditLogs()
                          .filter(log => log.userId === user.id)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map(log => (
                            <tr key={log.id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className={`h-5 text-[10px] ${log.action.includes('approved') ? 'text-success border-success/20 bg-success/5' :
                                  log.action.includes('rejected') ? 'text-destructive border-destructive/20 bg-destructive/5' : ''
                                  }`}>
                                  {log.action.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-medium">{log.advisorId}</td>
                              <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]" title={log.comment}>
                                {log.comment}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground italic">
                            No previous audit history found for this client.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={onModify}>Modify Conditions</Button>
          <Button variant="destructive" onClick={onReject}>Reject</Button>
          <Button onClick={onApprove} className="bg-primary hover:bg-primary/90">
            {loanRisk?.recommendation === "Reject" ? "Override & Approve" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
