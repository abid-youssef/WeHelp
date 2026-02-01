"use client"

import { AppProvider, useApp } from "@/components/app-context"
import { LoginScreen } from "@/components/login-screen"
import { ConsentModal } from "@/components/consent-modal"
import { BalanceFirstDashboard } from "@/components/balance-first-dashboard"
import { AdvisorDashboard } from "@/components/advisor-dashboard"

function AppContent() {
  const { currentUser, currentAdvisor, isAdvisorMode, hasConsented } = useApp()

  // Show login if no user/advisor is selected
  if (!currentUser && !currentAdvisor) {
    return <LoginScreen />
  }

  // Show advisor dashboard if in advisor mode
  if (isAdvisorMode && currentAdvisor) {
    return <AdvisorDashboard />
  }

  // Show client dashboard with consent modal - balance projection graph first!
  if (currentUser) {
    return (
      <>
        {!hasConsented && <ConsentModal />}
        {hasConsented && <BalanceFirstDashboard />}
        {!hasConsented && (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <p className="text-muted-foreground">
              Please accept the data privacy consent to continue.
            </p>
          </div>
        )}
      </>
    )
  }

  return null
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
