"use client"

import { useState } from "react"
import { useApp } from "./app-context"
import { getUsers, getAdvisors } from "@/lib/store"
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
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Select Your Role</h2>
          <p className="text-muted-foreground text-sm">
            Choose how you want to access the system
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={mode === "client" ? "default" : "outline"}
            onClick={() => setMode("client")}
            className="gap-2 px-6 py-3"
            size="lg"
          >
            <User className="w-5 h-5" />
            Sign in as Client
          </Button>
          <Button
            variant={mode === "advisor" ? "default" : "outline"}
            onClick={() => setMode("advisor")}
            className="gap-2 px-6 py-3"
            size="lg"
          >
            <Shield className="w-5 h-5" />
            Sign in as Advisor
          </Button>
        </div>

        {/* Demo account label */}
        <div className="text-center mb-4">
          <Badge variant="outline" className="text-xs">
            {mode === "client" ? "10 Demo Client Accounts" : "2 Demo Advisor Accounts"}
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
