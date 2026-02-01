"use client"

import { useApp } from "./app-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, Lock, Eye, FileText } from "lucide-react"

export function ConsentModal() {
  const { currentUser, hasConsented, setHasConsented } = useApp()

  if (!currentUser || hasConsented) return null

  return (
    <Dialog open={!hasConsented} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Data Privacy Consent</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            To provide personalized financial planning, we need your permission to
            analyze your transaction data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Eye className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">What we access</p>
              <p className="text-sm text-muted-foreground">
                Transaction history, account balances, and spending patterns
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">How we use it</p>
              <p className="text-sm text-muted-foreground">
                Generate projections, readiness scores, and personalized
                recommendations for life events
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Lock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Your data is protected</p>
              <p className="text-sm text-muted-foreground">
                All data is processed locally and never shared with third parties.
                You can revoke access anytime.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setHasConsented(false)}>
            Decline
          </Button>
          <Button onClick={() => setHasConsented(true)}>
            I Agree & Continue
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground">
          This is a demo application. No real financial data is being processed.
        </p>
      </DialogContent>
    </Dialog>
  )
}
