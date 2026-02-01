"use client"

import { useState, useMemo, useEffect } from "react"
import { useApp } from "./app-context"
import {
  getLoansByUser,
  getActiveLoans,
  createLoanRequest,
  calculateLoanEligibility,
} from "@/data/store"
import {
  LOAN_PURPOSES,
  DEFAULT_LOAN_RATE,
  AUTO_APPROVAL_THRESHOLD,
  calculateMonthlyPayment,
  type Loan,
} from "@/data/seed-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Banknote,
  Calculator,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  TrendingDown,
  Calendar,
  ChevronRight,
} from "lucide-react"

interface LoanRequestProps {
  onLoanCreated?: () => void
  trigger?: number
  eventId?: string
}

export function LoanRequest({ onLoanCreated, trigger, eventId }: LoanRequestProps) {
  const { currentUser, refreshKey, triggerRefresh } = useApp()

  // State declarations at the top
  const [isOpen, setIsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastLoan, setLastLoan] = useState<Loan | null>(null)
  const [wasAutoApproved, setWasAutoApproved] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  // Form state
  const [amount, setAmount] = useState(500)
  const [termMonths, setTermMonths] = useState(6)
  const [purpose, setPurpose] = useState("emergency")
  const [interestRate, setInterestRate] = useState(DEFAULT_LOAN_RATE)

  // Trigger effect
  useEffect(() => {
    if (trigger && trigger > 0) {
      setIsOpen(true)
      setConsentChecked(true)
    }
  }, [trigger])

  // Get user's loans
  const userLoans = useMemo(
    () => (currentUser ? getLoansByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const activeLoans = useMemo(
    () => (currentUser ? getActiveLoans(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  // Calculate eligibility preview
  const eligibility = useMemo(() => {
    if (!currentUser) return null
    return calculateLoanEligibility(currentUser.id, amount)
  }, [currentUser, amount])

  // Calculate payment details
  const paymentDetails = useMemo(() => {
    const monthlyPayment = calculateMonthlyPayment(amount, interestRate, termMonths)
    const totalRepayment = monthlyPayment * termMonths
    const totalInterest = totalRepayment - amount

    return {
      monthlyPayment,
      totalRepayment,
      totalInterest,
    }
  }, [amount, interestRate, termMonths])

  if (!currentUser) return null

  const handleSubmit = () => {
    if (!consentChecked) {
      alert("Please check the consent box to proceed.")
      return
    }

    const result = createLoanRequest({
      userId: currentUser.id,
      amount,
      termMonths,
      annualInterestRate: interestRate,
      purpose,
      eventId: eventId,
    })

    setLastLoan(result.loan)
    setWasAutoApproved(result.autoApproved)
    setIsOpen(false)
    setShowSuccess(true)
    setConsentChecked(false)
    triggerRefresh()
    onLoanCreated?.()
  }

  const resetForm = () => {
    setAmount(500)
    setTermMonths(6)
    setPurpose("emergency")
    setInterestRate(DEFAULT_LOAN_RATE)
    setConsentChecked(false)
  }

  const openDialog = () => {
    resetForm()
    setIsOpen(true)
  }

  const getLoanStatusBadge = (status: Loan["status"]) => {
    switch (status) {
      case "approved_auto":
        return <Badge className="bg-success text-success-foreground">Auto-Approved</Badge>
      case "approved_by_advisor":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>
      case "pending_advisor":
        return <Badge className="bg-warning text-warning-foreground">Pending Review</Badge>
      case "rejected_by_advisor":
        return <Badge variant="destructive">Rejected</Badge>
      case "active":
        return <Badge className="bg-chart-2 text-white">Active</Badge>
      case "completed":
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Loan Request
              </CardTitle>
              <CardDescription>
                Request a loan with transparent terms
              </CardDescription>
            </div>
            <Button onClick={openDialog} className="gap-1">
              <Banknote className="w-4 h-4" />
              Request Loan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userLoans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No loans yet.</p>
              <p className="text-xs mt-1">
                Loans under {AUTO_APPROVAL_THRESHOLD} TND may be auto-approved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {loan.amount.toLocaleString()} TND
                        </span>
                        {getLoanStatusBadge(loan.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {LOAN_PURPOSES.find((p) => p.value === loan.purpose)?.label || loan.purpose}
                        {" - "}
                        {loan.termMonths} months at {loan.annualInterestRate}% APR
                      </p>
                      {(loan.status === "approved_auto" ||
                        loan.status === "approved_by_advisor" ||
                        loan.status === "active") && (
                          <p className="text-xs text-chart-2 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {loan.monthlyPayment.toFixed(0)} TND/month
                          </p>
                        )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(loan.createdAt).toLocaleDateString()}
                      </p>
                      {loan.advisorComment && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                          {loan.advisorComment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active loans summary */}
          {activeLoans.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1">Active Loan Payments</p>
              <p className="text-xs text-muted-foreground">
                You have {activeLoans.length} active loan(s) with a total monthly payment of{" "}
                <span className="font-medium text-foreground">
                  {activeLoans.reduce((sum, l) => sum + l.monthlyPayment, 0).toFixed(0)} TND
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Request a Loan
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. Loans up to {AUTO_APPROVAL_THRESHOLD} TND may be auto-approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Amount Slider */}
            <div className="space-y-4">
              {/* Info Box */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <div className="text-xs space-y-1 text-left">
                  <p className="font-semibold text-primary">Micro-loan Advantage</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Requests under <span className="font-bold text-foreground">{AUTO_APPROVAL_THRESHOLD} TND</span> are typically
                    <span className="font-semibold text-success"> auto-approved</span> instantly for clients with a high readiness score.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Loan Amount</Label>
                <span className="text-lg font-semibold text-primary">
                  {amount.toLocaleString()} TND
                </span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={([v]) => setAmount(v)}
                min={100}
                max={5000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100 TND</span>
                <span className="text-primary font-medium">
                  Auto-approve threshold: {AUTO_APPROVAL_THRESHOLD} TND
                </span>
                <span>5,000 TND</span>
              </div>
            </div>

            {/* Term Selection */}
            <div className="space-y-2">
              <Label>Repayment Term</Label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 6, 9, 12].map((months) => (
                  <Button
                    key={months}
                    variant={termMonths === months ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTermMonths(months)}
                    className="bg-transparent"
                  >
                    {months} mo
                  </Button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interest Rate (display only for simulation) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Annual Interest Rate (APR)</Label>
                <span className="text-sm font-medium">{interestRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard product rate. For simulation purposes only.
              </p>
            </div>

            {/* Payment Calculator */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Payment Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="text-lg font-semibold text-primary">
                    {paymentDetails.monthlyPayment.toFixed(0)} TND
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Interest</p>
                  <p className="text-lg font-semibold">
                    {paymentDetails.totalInterest.toFixed(0)} TND
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Repayment</p>
                  <p className="text-lg font-semibold">
                    {paymentDetails.totalRepayment.toFixed(0)} TND
                  </p>
                </div>
              </div>
            </div>

            {/* Eligibility Hint */}
            {eligibility && (
              <div
                className={`p-4 rounded-lg border ${eligibility.canAutoApprove
                  ? "bg-success/10 border-success/30"
                  : eligibility.score >= 40
                    ? "bg-warning/10 border-warning/30"
                    : "bg-destructive/10 border-destructive/30"
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {eligibility.canAutoApprove ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : eligibility.score >= 40 ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="font-medium text-sm">
                    Eligibility Score: {eligibility.score}/100
                  </span>
                </div>

                {eligibility.canAutoApprove ? (
                  <p className="text-xs text-success">
                    This loan qualifies for automatic approval. You will receive instant confirmation.
                  </p>
                ) : amount > AUTO_APPROVAL_THRESHOLD ? (
                  <p className="text-xs text-muted-foreground">
                    Loans above {AUTO_APPROVAL_THRESHOLD} TND require advisor review. An advisor will review your request within 24-48 hours.
                  </p>
                ) : (
                  <p className="text-xs text-warning">
                    Due to risk factors, this request will be reviewed by an advisor.
                  </p>
                )}

                {eligibility.riskFlags.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Risk Factors:</p>
                    {eligibility.riskFlags.slice(0, 3).map((flag, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        {flag}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Consent */}
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Checkbox
                id="consent"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
                className="mt-1"
              />
              <label htmlFor="consent" className="text-sm cursor-pointer">
                I understand that this is a loan simulation for demo purposes. I confirm that I have reviewed the payment terms and understand the monthly payment obligation of{" "}
                <span className="font-medium">{paymentDetails.monthlyPayment.toFixed(0)} TND</span>{" "}
                for {termMonths} months.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {eligibility?.canAutoApprove ? "Submit & Approve" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {wasAutoApproved ? (
                <>
                  <CheckCircle className="w-5 h-5 text-success" />
                  Loan Approved!
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-warning" />
                  Request Submitted
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {wasAutoApproved ? (
              <>
                <Alert className="bg-success/10 border-success/30">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertTitle>Automatically Approved</AlertTitle>
                  <AlertDescription>
                    Your loan of {lastLoan?.amount.toLocaleString()} TND has been automatically approved and is now active.
                  </AlertDescription>
                </Alert>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Payment Schedule</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Payment</p>
                      <p className="font-semibold">{lastLoan?.monthlyPayment.toFixed(0)} TND</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Term</p>
                      <p className="font-semibold">{lastLoan?.termMonths} months</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">First Payment</p>
                      <p className="font-semibold">
                        {lastLoan?.paymentSchedule[0]?.date
                          ? new Date(lastLoan.paymentSchedule[0].date).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Repayment</p>
                      <p className="font-semibold">{lastLoan?.totalRepayment.toFixed(0)} TND</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Your loan payments are now included in your balance projection. Check the main graph to see how this affects your future balance.
                </p>
              </>
            ) : (
              <>
                <Alert className="bg-warning/10 border-warning/30">
                  <Clock className="h-4 w-4 text-warning" />
                  <AlertTitle>Pending Advisor Review</AlertTitle>
                  <AlertDescription>
                    Your loan request of {lastLoan?.amount.toLocaleString()} TND has been submitted and is awaiting advisor review.
                  </AlertDescription>
                </Alert>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">What Happens Next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      An advisor will review your financial profile
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      You will be notified when a decision is made
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      If approved, payments will appear in your projection
                    </li>
                  </ul>
                </div>

                {lastLoan?.riskFlags && lastLoan.riskFlags.length > 0 && (
                  <div className="p-4 rounded-lg border space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      Why Manual Review?
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {lastLoan.riskFlags.map((flag, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <TrendingDown className="w-3 h-3" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
