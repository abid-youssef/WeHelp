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
} from "@/lib/store"
import { LOAN_PURPOSES } from "@/lib/seed-data"
import { events } from "@/lib/seed-data"
import { generateTwinData } from "@/lib/forecast"
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
} from "lucide-react"

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
                {pendingActions.map((action) => (
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
                          <p className="font-medium text-sidebar-foreground">
                            {action.userName}
                          </p>
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
                ))}
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
  const twinData = useMemo(() => {
    if (!action) return null
    const user = getUserById(action.userId)
    if (!user) return null
    const transactions = getTransactionsByUser(action.userId)
    return generateTwinData(user, transactions, events, 0)
  }, [action])

  if (!action) return null

  const user = getUserById(action.userId)

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Client Dossier
          </DialogTitle>
          <DialogDescription>
            Review {user?.name}&apos;s financial profile and request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Client Info */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{user?.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="font-medium">{user?.balance.toLocaleString()} TND</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="font-medium">
                  {user?.monthlyIncome.toLocaleString()} TND
                </p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Request Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {action.type === "goal" ? "Savings Goal" : "Micro-Loan"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">{action.amount.toLocaleString()} TND</p>
              </div>
              {action.eventName && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Related Event</p>
                  <p className="font-medium">{action.eventName}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{action.description}</p>
              </div>
            </div>
          </div>

          {/* Twin Snapshot */}
          {twinData && (
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-3">Financial Health Snapshot</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Savings Rate</p>
                  <p className="font-medium flex items-center gap-1">
                    {twinData.insights.savingsRate}%
                    {twinData.insights.savingsRate > 10 ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expense Volatility</p>
                  <p className="font-medium">{twinData.insights.expenseVolatility}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Months of Savings</p>
                  <p className="font-medium">{twinData.insights.monthsOfSavings}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Readiness Score</p>
                  <p className="font-medium">{twinData.readiness.score}%</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestion */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Suggestion</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {action.riskLevel === "high"
                    ? "This request exceeds recommended thresholds. Consider modifying the amount or requesting additional documentation."
                    : action.riskLevel === "medium"
                      ? "This request is within acceptable limits but warrants review. Client has moderate financial stability."
                      : "This request appears low-risk based on the client's financial profile. Standard approval recommended."}
                </p>
                <Badge className="mt-2" variant="secondary">
                  Confidence: {action.riskLevel === "low" ? "High" : action.riskLevel === "medium" ? "Medium" : "Low"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={onModify}>
            Modify
          </Button>
          <Button variant="destructive" onClick={onReject}>
            Reject
          </Button>
          <Button onClick={onApprove}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
