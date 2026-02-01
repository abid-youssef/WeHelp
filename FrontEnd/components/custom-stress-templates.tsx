"use client"

import { useState, useMemo } from "react"
import { useApp } from "./app-context"
import {
  getCustomStressTemplates,
  createCustomStressTemplate,
  deleteCustomStressTemplate,
} from "@/lib/store"
import type { CustomStressTemplate } from "@/lib/seed-data"
import { STRESS_PRESETS } from "@/lib/forecast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  AlertTriangle,
  Plus,
  Trash2,
  Zap,
  TrendingDown,
  DollarSign,
  Clock,
} from "lucide-react"

export function CustomStressTemplates() {
  const { currentUser, refreshKey, triggerRefresh } = useApp()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [incomeMultiplier, setIncomeMultiplier] = useState(100)
  const [expenseMultiplier, setExpenseMultiplier] = useState(100)
  const [oneOffCost, setOneOffCost] = useState("")
  const [duration, setDuration] = useState(3)
  const [correlatedReduction, setCorrelatedReduction] = useState(30)

  const customTemplates = useMemo(
    () => (currentUser ? getCustomStressTemplates(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  if (!currentUser) return null

  const resetForm = () => {
    setName("")
    setDescription("")
    setIncomeMultiplier(100)
    setExpenseMultiplier(100)
    setOneOffCost("")
    setDuration(3)
    setCorrelatedReduction(30)
  }

  const openCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const handleSubmit = () => {
    if (!name) return

    createCustomStressTemplate({
      userId: currentUser.id,
      name,
      description: description || `${name} stress scenario`,
      incomeMultiplier: incomeMultiplier / 100,
      expenseMultiplier: expenseMultiplier / 100,
      oneOffCost: oneOffCost ? parseFloat(oneOffCost) : 0,
      duration,
      correlatedExpenseReduction: correlatedReduction / 100,
      shockProbability: 0.2,
    })

    setIsCreateOpen(false)
    resetForm()
    triggerRefresh()
  }

  const handleDelete = (templateId: string) => {
    deleteCustomStressTemplate(templateId)
    triggerRefresh()
  }

  const getSeverityBadge = (template: CustomStressTemplate) => {
    const severity =
      (1 - template.incomeMultiplier) * 0.5 +
      (template.expenseMultiplier - 1) * 0.3 +
      (template.oneOffCost / 5000) * 0.2

    if (severity >= 0.4)
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          Severe
        </Badge>
      )
    if (severity >= 0.2)
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          Moderate
        </Badge>
      )
    return <Badge variant="secondary">Mild</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Stress Templates
              </CardTitle>
              <CardDescription>Custom scenarios for stress testing</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Built-in Presets */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Built-in Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              {STRESS_PRESETS.slice(0, 4).map((preset) => (
                <div
                  key={preset.id}
                  className="p-2 rounded-lg bg-muted/50 border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-warning" />
                    <span className="font-medium">{preset.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {preset.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Your Templates</h4>
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{template.name}</h3>
                        {getSeverityBadge(template)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {template.incomeMultiplier < 1 && (
                          <span className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-destructive" />
                            Income: -{Math.round((1 - template.incomeMultiplier) * 100)}%
                          </span>
                        )}
                        {template.oneOffCost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {template.oneOffCost.toLocaleString()} TND
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.duration} months
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Stress Template</DialogTitle>
            <DialogDescription>
              Define a custom stress scenario for testing financial resilience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Business Slowdown, Medical Emergency"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDesc">Description</Label>
              <Input
                id="templateDesc"
                placeholder="Brief description of the scenario"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Income Level</Label>
                <span className="text-muted-foreground">{incomeMultiplier}%</span>
              </div>
              <Slider
                value={[incomeMultiplier]}
                onValueChange={(v) => setIncomeMultiplier(v[0])}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                {incomeMultiplier === 0
                  ? "Complete income loss"
                  : incomeMultiplier < 100
                    ? `${100 - incomeMultiplier}% reduction in income`
                    : "No income change"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Expense Level</Label>
                <span className="text-muted-foreground">{expenseMultiplier}%</span>
              </div>
              <Slider
                value={[expenseMultiplier]}
                onValueChange={(v) => setExpenseMultiplier(v[0])}
                min={100}
                max={150}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                {expenseMultiplier > 100
                  ? `${expenseMultiplier - 100}% increase in expenses`
                  : "No expense change"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="oneOffCost">One-Time Cost (TND)</Label>
                <Input
                  id="oneOffCost"
                  type="number"
                  placeholder="0"
                  value={oneOffCost}
                  onChange={(e) => setOneOffCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={12}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Behavioral Response</Label>
                <span className="text-muted-foreground">{correlatedReduction}%</span>
              </div>
              <Slider
                value={[correlatedReduction]}
                onValueChange={(v) => setCorrelatedReduction(v[0])}
                min={0}
                max={80}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                How much discretionary spending will be cut in response to income loss
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
