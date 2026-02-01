"use client"

import React from "react"

import { useState } from "react"
import { useApp } from "./app-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, PiggyBank, Sparkles } from "lucide-react"

interface ScenarioSimulatorProps {
  monthlySavings: number
  onSavingsChange: (amount: number) => void
  onScheduleSavings: () => void
  maxSavings: number
}

export function ScenarioSimulator({
  monthlySavings,
  onSavingsChange,
  onScheduleSavings,
  maxSavings,
}: ScenarioSimulatorProps) {
  const { currentUser } = useApp()
  const [inputValue, setInputValue] = useState(monthlySavings.toString())

  if (!currentUser) return null

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0]
    onSavingsChange(newValue)
    setInputValue(newValue.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxSavings) {
      onSavingsChange(numValue)
    }
  }

  const suggestedAmounts = [50, 100, 150, 200, 250]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Scenario Simulator
        </CardTitle>
        <CardDescription>
          Adjust your monthly savings to see how it affects your projection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="savings-input" className="text-sm font-medium">
              Monthly Savings
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="savings-input"
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-24 text-right"
                min={0}
                max={maxSavings}
              />
              <span className="text-sm text-muted-foreground">TND</span>
            </div>
          </div>

          <Slider
            value={[monthlySavings]}
            onValueChange={handleSliderChange}
            max={maxSavings}
            step={10}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 TND</span>
            <span>{maxSavings} TND</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            {suggestedAmounts.map((amount) => (
              <Button
                key={amount}
                variant={monthlySavings === amount ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onSavingsChange(amount)
                  setInputValue(amount.toString())
                }}
              >
                {amount} TND
              </Button>
            ))}
          </div>
        </div>

        {monthlySavings > 0 && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI Recommendation</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Saving {monthlySavings} TND/month represents{" "}
              <span className="font-medium text-foreground">
                {Math.round((monthlySavings / currentUser.monthlyIncome) * 100)}%
              </span>{" "}
              of your monthly income. This is{" "}
              {monthlySavings / currentUser.monthlyIncome > 0.3
                ? "aggressive but achievable"
                : monthlySavings / currentUser.monthlyIncome > 0.15
                  ? "a healthy savings rate"
                  : "a good start"}
              .
            </p>
          </div>
        )}

        <Button
          onClick={onScheduleSavings}
          disabled={monthlySavings === 0}
          className="w-full gap-2"
        >
          <PiggyBank className="w-4 h-4" />
          Schedule Savings Plan
        </Button>
      </CardContent>
    </Card>
  )
}
