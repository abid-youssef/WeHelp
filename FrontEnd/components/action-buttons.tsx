"use client"

import { useState } from "react"
import { useApp } from "./app-context"
import {
  createGoal,
  createMicroLoanRequest,
  getEventById,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PiggyBank, Banknote, CheckCircle, AlertCircle } from "lucide-react"
import { events } from "@/lib/seed-data"

interface ActionButtonsProps {
  selectedEventId?: string
  monthlySavings: number
  onActionComplete: () => void
}

export function ActionButtons({
  selectedEventId,
  monthlySavings,
  onActionComplete,
}: ActionButtonsProps) {
  const { currentUser, triggerRefresh } = useApp()
  const [savingsModalOpen, setSavingsModalOpen] = useState(false)
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [successModal, setSuccessModal] = useState<{
    open: boolean
    type: "savings" | "loan"
    needsApproval: boolean
  }>({ open: false, type: "savings", needsApproval: false })

  const [loanAmount, setLoanAmount] = useState("500")
  const [loanReason, setLoanReason] = useState("")
  const [selectedEvent, setSelectedEvent] = useState(selectedEventId || "")

  if (!currentUser) return null

  const event = selectedEventId ? getEventById(selectedEventId) : null

  const handleScheduleSavings = () => {
    if (!selectedEventId || monthlySavings <= 0) return

    const event = getEventById(selectedEventId)
    if (!event) return

    const goal = createGoal({
      userId: currentUser.id,
      eventId: selectedEventId,
      targetAmount: event.estimatedCost,
      currentAmount: 0,
      monthlyContribution: monthlySavings,
      status: "active",
      advisorApproved: event.estimatedCost < 500,
    })

    setSavingsModalOpen(false)
    setSuccessModal({
      open: true,
      type: "savings",
      needsApproval: event.estimatedCost >= 500,
    })
    triggerRefresh()
    onActionComplete()
  }

  const handleRequestLoan = () => {
    const amount = parseInt(loanAmount, 10)
    if (isNaN(amount) || amount <= 0) return

    createMicroLoanRequest({
      userId: currentUser.id,
      amount,
      reason: loanReason || "Event preparation",
      eventId: selectedEvent || undefined,
    })

    setLoanModalOpen(false)
    setLoanAmount("500")
    setLoanReason("")
    setSuccessModal({
      open: true,
      type: "loan",
      needsApproval: amount >= 500,
    })
    triggerRefresh()
    onActionComplete()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => setSavingsModalOpen(true)}
          disabled={!selectedEventId || monthlySavings <= 0}
          className="gap-2"
        >
          <PiggyBank className="w-4 h-4" />
          Schedule Savings
        </Button>
        <Button
          variant="outline"
          onClick={() => setLoanModalOpen(true)}
          className="gap-2"
        >
          <Banknote className="w-4 h-4" />
          Request Micro-Loan
        </Button>
      </div>

      {/* Schedule Savings Modal */}
      <Dialog open={savingsModalOpen} onOpenChange={setSavingsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              Confirm Savings Schedule
            </DialogTitle>
            <DialogDescription>
              Set up automatic monthly transfers to your savings goal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Event</span>
                <span className="text-sm font-medium">{event?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Target Amount</span>
                <span className="text-sm font-medium">
                  {event?.estimatedCost.toLocaleString()} TND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Monthly Contribution
                </span>
                <span className="text-sm font-medium text-primary">
                  {monthlySavings} TND
                </span>
              </div>
            </div>

            {(event?.estimatedCost ?? 0) >= 500 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                <p className="text-sm text-warning-foreground">
                  Goals over 500 TND require advisor approval. Your request will
                  be reviewed within 24 hours.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSavingsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSavings}>Confirm Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Micro-Loan Request Modal */}
      <Dialog open={loanModalOpen} onOpenChange={setLoanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Request Micro-Loan
            </DialogTitle>
            <DialogDescription>
              Submit a loan request for event preparation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loan-amount">Loan Amount (TND)</Label>
              <Input
                id="loan-amount"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                min={100}
                max={5000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-event">Related Event (Optional)</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-reason">Reason for Request</Label>
              <Textarea
                id="loan-reason"
                value={loanReason}
                onChange={(e) => setLoanReason(e.target.value)}
                placeholder="Describe how you plan to use the funds..."
                rows={3}
              />
            </div>

            {parseInt(loanAmount, 10) >= 500 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                <p className="text-sm text-warning-foreground">
                  Loans of 500 TND or more require advisor approval.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestLoan}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={successModal.open}
        onOpenChange={(open) => setSuccessModal((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <DialogTitle>
                {successModal.type === "savings"
                  ? "Savings Plan Created"
                  : "Loan Request Submitted"}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {successModal.needsApproval
                  ? "Your request has been sent to an advisor for approval. You'll be notified once it's reviewed."
                  : successModal.type === "savings"
                    ? "Your automatic savings transfers have been scheduled."
                    : "Your micro-loan has been approved."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setSuccessModal((s) => ({ ...s, open: false }))}
              className="w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
