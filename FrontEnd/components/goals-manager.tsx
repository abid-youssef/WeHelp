"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import {
  getGoalsByUser,
  createGoal,
  updateGoal,
  deleteGoal,
  getEvents,
  getCustomEventsByUser,
} from "@/lib/store"
import type { Goal, LifeEvent, CustomEvent } from "@/lib/seed-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  Target,
  Plus,
  PiggyBank,
  Calendar,
  Shield,
  Trash2,
  Edit,
  Link,
  TrendingUp,
} from "lucide-react"

interface GoalsManagerProps {
  onGoalSelect?: (goalId: string) => void
}

export function GoalsManager({ onGoalSelect }: GoalsManagerProps) {
  const { currentUser, refreshKey, triggerRefresh } = useApp()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [monthlyContribution, setMonthlyContribution] = useState("")
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium")
  const [linkedEventId, setLinkedEventId] = useState<string>("none")

  const goals = useMemo(
    () => (currentUser ? getGoalsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const builtInEvents = getEvents()
  const customEvents = useMemo(
    () => (currentUser ? getCustomEventsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )
  const allEvents = [...builtInEvents, ...customEvents]

  if (!currentUser) return null

  const resetForm = () => {
    setName("")
    setTargetAmount("")
    setTargetDate("")
    setMonthlyContribution("")
    setAutoSaveEnabled(true)
    setPriority("medium")
    setLinkedEventId("none")
    setEditingGoal(null)
  }

  const openCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setName(goal.name)
    setTargetAmount(goal.targetAmount.toString())
    setTargetDate(goal.targetDate)
    setMonthlyContribution(goal.monthlyContribution.toString())
    setAutoSaveEnabled(goal.autoSaveEnabled)
    setPriority(goal.priority)
    setLinkedEventId(goal.eventId || "none")
    setIsCreateOpen(true)
  }

  const handleSubmit = () => {
    if (!name || !targetAmount || !targetDate || !monthlyContribution) return

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate,
        monthlyContribution: parseFloat(monthlyContribution),
        autoSaveEnabled,
        priority,
        eventId: linkedEventId === "none" ? undefined : linkedEventId,
      })
    } else {
      createGoal({
        userId: currentUser.id,
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate,
        monthlyContribution: parseFloat(monthlyContribution),
        autoSaveEnabled,
        priority,
        eventId: linkedEventId === "none" ? undefined : linkedEventId,
      })
    }

    setIsCreateOpen(false)
    resetForm()
    triggerRefresh()
  }

  const handleDelete = (goalId: string) => {
    deleteGoal(goalId)
    triggerRefresh()
  }

  const getLinkedEventName = (eventId?: string) => {
    if (!eventId || eventId === "none") return null
    const event = allEvents.find((e) => e.id === eventId)
    return event?.name
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-success"
    if (progress >= 40) return "bg-warning"
    return "bg-primary"
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "high":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>
      case "medium":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const calculateMonthsToGoal = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount
    if (goal.monthlyContribution <= 0) return Infinity
    return Math.ceil(remaining / goal.monthlyContribution)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Goals Manager
              </CardTitle>
              <CardDescription>Track your financial goals</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="w-4 h-4" />
              New Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No goals yet. Create your first goal!</p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100)
              const monthsLeft = calculateMonthsToGoal(goal)
              const linkedEventName = getLinkedEventName(goal.eventId)

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => onGoalSelect?.(goal.id)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{goal.name}</h3>
                        {getPriorityBadge(goal.priority)}
                        {goal.advisorApproved && (
                          <Badge className="bg-success/10 text-success border-success/20 gap-1">
                            <Shield className="w-3 h-3" />
                            Approved
                          </Badge>
                        )}
                      </div>
                      {linkedEventName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          Linked to {linkedEventName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(goal)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(goal.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} TND
                      </span>
                    </div>
                    <Progress value={progress} className={`h-2 ${getProgressColor(progress)}`} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress}% complete</span>
                      {monthsLeft < Infinity && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {monthsLeft} months to go
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Target: {new Date(goal.targetDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-muted-foreground">
                      {goal.monthlyContribution.toLocaleString()} TND/mo
                      {goal.autoSaveEnabled && (
                        <Badge variant="secondary" className="ml-2 text-xs">Auto</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Goal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            <DialogDescription>
              Set up a savings goal to track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input
                id="name"
                placeholder="e.g., Wedding Fund, Car Down Payment"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount (TND)</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="10000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Monthly Contribution (TND)</Label>
              <Input
                id="monthlyContribution"
                type="number"
                placeholder="500"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
              {targetAmount && monthlyContribution && parseFloat(monthlyContribution) > 0 && (
                <p className="text-xs text-muted-foreground">
                  At this rate, you will reach your goal in approximately{" "}
                  {Math.ceil(parseFloat(targetAmount) / parseFloat(monthlyContribution))} months
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedEvent">Link to Event (Optional)</Label>
              <Select value={linkedEventId} onValueChange={setLinkedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked event</SelectItem>
                  {allEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {new Date(event.startDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="autoSave">Auto-Save</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically transfer funds each month
                </p>
              </div>
              <Switch
                id="autoSave"
                checked={autoSaveEnabled}
                onCheckedChange={setAutoSaveEnabled}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
