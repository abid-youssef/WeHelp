"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import {
  getCustomEventsByUser,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  getGoalsByUser,
} from "@/lib/store"
import type { CustomEvent, Goal } from "@/lib/seed-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  CalendarPlus,
  Plus,
  Calendar,
  Eye,
  EyeOff,
  Link,
  Trash2,
  Edit,
  Repeat,
  Sparkles,
} from "lucide-react"

const CATEGORIES = [
  { value: "celebration", label: "Celebration" },
  { value: "education", label: "Education" },
  { value: "travel", label: "Travel" },
  { value: "healthcare", label: "Healthcare" },
  { value: "family", label: "Family" },
  { value: "home", label: "Home" },
  { value: "car", label: "Car/Vehicle" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
]

export function CustomEvents() {
  const { currentUser, refreshKey, triggerRefresh } = useApp()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [costStd, setCostStd] = useState("")
  const [distributionType, setDistributionType] = useState<"normal" | "uniform">("normal")
  const [category, setCategory] = useState("celebration")
  const [isPrivate, setIsPrivate] = useState(false)
  const [linkedGoalId, setLinkedGoalId] = useState<string>("")
  const [recurrence, setRecurrence] = useState<"none" | "yearly" | "monthly">("none")

  const customEvents = useMemo(
    () => (currentUser ? getCustomEventsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const goals = useMemo(
    () => (currentUser ? getGoalsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  if (!currentUser) return null

  const resetForm = () => {
    setName("")
    setStartDate("")
    setEndDate("")
    setEstimatedCost("")
    setCostStd("")
    setDistributionType("normal")
    setCategory("celebration")
    setIsPrivate(false)
    setLinkedGoalId("")
    setRecurrence("none")
    setEditingEvent(null)
  }

  const openCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEdit = (event: CustomEvent) => {
    setEditingEvent(event)
    setName(event.name)
    setStartDate(event.startDate)
    setEndDate(event.endDate)
    setEstimatedCost(event.estimatedCost.toString())
    setCostStd(event.costStd.toString())
    setDistributionType(event.distributionType || "normal")
    setCategory(event.category)
    setIsPrivate(event.isPrivate)
    setLinkedGoalId(event.linkedGoalId || "")
    setRecurrence(event.recurrence || "none")
    setIsCreateOpen(true)
  }

  const handleSubmit = () => {
    if (!name || !startDate || !endDate || !estimatedCost) return

    const costValue = parseFloat(estimatedCost)
    const stdValue = costStd ? parseFloat(costStd) : costValue * 0.25 // Default 25% std

    if (editingEvent) {
      updateCustomEvent(editingEvent.id, {
        name,
        startDate,
        endDate,
        estimatedCost: costValue,
        costStd: stdValue,
        distributionType,
        category,
        isPrivate,
        linkedGoalId: linkedGoalId || undefined,
        recurrence,
      })
    } else {
      createCustomEvent({
        userId: currentUser.id,
        name,
        startDate,
        endDate,
        estimatedCost: costValue,
        costStd: stdValue,
        distributionType,
        category,
        isPrivate,
        linkedGoalId: linkedGoalId || undefined,
        recurrence,
      })
    }

    setIsCreateOpen(false)
    resetForm()
    triggerRefresh()
  }

  const handleDelete = (eventId: string) => {
    deleteCustomEvent(eventId)
    triggerRefresh()
  }

  const getLinkedGoalName = (goalId?: string) => {
    if (!goalId) return null
    const goal = goals.find((g) => g.id === goalId)
    return goal?.name
  }

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat
  }

  const getMonthsAway = (date: string) => {
    const now = new Date()
    const eventDate = new Date(date)
    return Math.max(
      0,
      (eventDate.getFullYear() - now.getFullYear()) * 12 +
        (eventDate.getMonth() - now.getMonth())
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" />
                My Events
              </CardTitle>
              <CardDescription>Personal events affecting your finances</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {customEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No custom events yet.</p>
              <p className="text-xs mt-1">Add weddings, graduations, or other life events.</p>
            </div>
          ) : (
            customEvents.map((event) => {
              const monthsAway = getMonthsAway(event.startDate)
              const linkedGoalName = getLinkedGoalName(event.linkedGoalId)

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{event.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(event.category)}
                        </Badge>
                        {event.isPrivate ? (
                          <EyeOff className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Eye className="w-3 h-3 text-muted-foreground" />
                        )}
                        {event.recurrence !== "none" && (
                          <Repeat className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {monthsAway > 0 && (
                          <span>{monthsAway} month{monthsAway !== 1 ? "s" : ""} away</span>
                        )}
                      </div>
                      {linkedGoalName && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          Linked to: {linkedGoalName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {event.estimatedCost.toLocaleString()} TND
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +/- {event.costStd.toLocaleString()} TND
                      </p>
                      <div className="flex gap-1 mt-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(event)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Custom Event"}</DialogTitle>
            <DialogDescription>
              Add a personal event that affects your financial planning
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                placeholder="e.g., Wedding, Graduation, Family Reunion"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (!endDate) setEndDate(e.target.value)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (TND)</Label>
              <Input
                id="estimatedCost"
                type="number"
                placeholder="5000"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costStd">Error Margin (+/-)</Label>
                <Input
                  id="costStd"
                  type="number"
                  placeholder={
                    estimatedCost
                      ? (parseFloat(estimatedCost) * 0.25).toFixed(0)
                      : "1000"
                  }
                  value={costStd}
                  onChange={(e) => setCostStd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distributionType">Cost Distribution</Label>
                <Select
                  value={distributionType}
                  onValueChange={(v) => setDistributionType(v as "normal" | "uniform")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (bell curve)</SelectItem>
                    <SelectItem value="uniform">Uniform (flat range)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Event cost shows as {estimatedCost || "amount"} ± {costStd || "margin"} TND in projections
            </p>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedGoal">Link to Goal (Optional)</Label>
              <Select value={linkedGoalId || "none"} onValueChange={setLinkedGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name} ({goal.targetAmount.toLocaleString()} TND)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time event</SelectItem>
                  <SelectItem value="yearly">Repeats yearly</SelectItem>
                  <SelectItem value="monthly">Repeats monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="isPrivate">Private Event</Label>
                <p className="text-xs text-muted-foreground">
                  Hide from advisor view
                </p>
              </div>
              <Switch
                id="isPrivate"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingEvent ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
