"use client"

import { useState } from "react"
import { useApp } from "./app-context"
import { getUsers, getAdvisors } from "@/mocks/store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  Laptop,
  Shield,
  Loader2,
} from "lucide-react"

const userTypeIcons = {
  student: GraduationCap,
  salaried: Briefcase,
  freelancer: Laptop,
  family: Users,
  entrepreneur: Building2,
}

const userTypeLabels = {
  student: "Student",
  salaried: "Salaried",
  freelancer: "Freelancer",
  family: "Family",
  entrepreneur: "Entrepreneur",
}

export function LoginScreen() {
  const { setCurrentUser, setCurrentAdvisor, setIsAdvisorMode, isSessionLoaded } = useApp()
  const [mode, setMode] = useState<"client" | "advisor">("client")

  const users = getUsers()
  const advisors = getAdvisors()

  const handleUserSelect = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setCurrentUser(user)
      setIsAdvisorMode(false)
    }
  }

  const handleAdvisorSelect = (advisorId: string) => {
    const advisor = advisors.find((a) => a.id === advisorId)
    if (advisor) {
      setCurrentAdvisor(advisor)
      setIsAdvisorMode(true)
    }
  }

  // Show loading while checking for persisted session
  if (!isSessionLoaded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">ATB</span>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                ATB
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Life-Companion
          </h1>
          <p className="text-muted-foreground text-lg">
            Digital Twin for Event-Aware Financial Planning
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card
            className={`cursor-pointer transition-all border-2 ${mode === "client" ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50"}`}
            onClick={() => setMode("client")}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className={`w-8 h-8 ${mode === "client" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <CardTitle className="text-xl">Client Portal</CardTitle>
              <CardDescription>Plan your life events and manage your finances</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${mode === "advisor" ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50"}`}
            onClick={() => setMode("advisor")}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className={`w-8 h-8 ${mode === "advisor" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <CardTitle className="text-xl">Bank Advisor</CardTitle>
              <CardDescription>Review loan requests and support your clients</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo account label */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium mb-2">
            {mode === "client" ? "Select a Demo Client Account" : "Select an Advisor Account"}
          </h3>
          <Badge variant="outline" className="text-xs">
            {mode === "client" ? "Multiple Personas" : "Staff Access"}
          </Badge>
        </div>

        {mode === "client" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((user) => {
              const Icon = userTypeIcons[user.type]
              return (
                <Card
                  key={user.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                  onClick={() => handleUserSelect(user.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {userTypeLabels[user.type]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mb-1">{user.name}</CardTitle>
                    <CardDescription className="text-sm">
                      Balance:{" "}
                      <span className="font-medium text-foreground">
                        {user.balance.toLocaleString()} TND
                      </span>
                    </CardDescription>
                    <CardDescription className="text-sm">
                      Income:{" "}
                      <span className="font-medium text-foreground">
                        {user.monthlyIncome.toLocaleString()} TND/mo
                      </span>
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            {advisors.map((advisor) => (
              <Card
                key={advisor.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary w-64"
                onClick={() => handleAdvisorSelect(advisor.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-sidebar flex items-center justify-center">
                      <Shield className="w-6 h-6 text-sidebar-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{advisor.name}</CardTitle>
                      <CardDescription>{advisor.branch}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Demo Mode: Select a user or advisor to explore the Digital Twin
        </p>
      </div>
    </div>
  )
}
