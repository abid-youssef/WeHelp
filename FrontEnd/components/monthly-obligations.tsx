"use client"

import { useMemo, useState } from "react"
import { useApp } from "./app-context"
import { getMonthlyObligationsByUser } from "@/data/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Zap,
    Droplets,
    Wifi,
    Home,
    CreditCard,
    Plus,
    Calendar,
    AlertCircle
} from "lucide-react"

export function MonthlyObligations() {
    const { currentUser, refreshKey } = useApp()

    const obligations = useMemo(
        () => (currentUser ? getMonthlyObligationsByUser(currentUser.id) : []),
        [currentUser, refreshKey]
    )

    if (!currentUser) return null

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "utility":
                return <Zap className="w-4 h-4 text-warning" />
            case "rent":
                return <Home className="w-4 h-4 text-primary" />
            case "subscription":
                return <Wifi className="w-4 h-4 text-chart-2" />
            case "debt":
                return <CreditCard className="w-4 h-4 text-destructive" />
            default:
                return <Plus className="w-4 h-4 text-muted-foreground" />
        }
    }

    const totalMonthly = obligations.reduce((sum, o) => sum + o.amount, 0)
    const daysInMonth = 30
    const currentDay = new Date().getDate()

    // Sorting obligations by due date
    const sortedObligations = [...obligations].sort((a, b) => a.dueDate - b.dueDate)

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Fixed Obligations</CardTitle>
                            <CardDescription>Recurring monthly commitments</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                            <Plus className="w-4 h-4" />
                            Add Bill
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sortedObligations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No monthly obligations tracked yet.</p>
                                </div>
                            ) : (
                                sortedObligations.map((obl) => (
                                    <div
                                        key={obl.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                                {getCategoryIcon(obl.category)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{obl.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Due on day {obl.dueDate} of the month
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{obl.amount.toLocaleString()} TND</p>
                                            {obl.dueDate < currentDay ? (
                                                <Badge variant="secondary" className="text-[10px] h-4 bg-success/10 text-success border-success/20">
                                                    Paid
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-4 text-warning border-warning/20">
                                                    Upcoming
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3 text-center">
                        <CardTitle className="text-lg">Monthly Budget Impact</CardTitle>
                        <CardDescription>Total fixed outflows</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center space-y-1">
                            <p className="text-3xl font-bold">{totalMonthly.toLocaleString()} TND</p>
                            <p className="text-xs text-muted-foreground">
                                {Math.round((totalMonthly / currentUser.monthlyIncome) * 100)}% of monthly income
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Fixed Costs Burden</span>
                                    <span className="font-medium">{Math.round((totalMonthly / currentUser.monthlyIncome) * 100)}%</span>
                                </div>
                                <Progress
                                    value={(totalMonthly / currentUser.monthlyIncome) * 100}
                                    className="h-2"
                                    indicatorClassName={
                                        (totalMonthly / currentUser.monthlyIncome) > 0.5 ? "bg-destructive" :
                                            (totalMonthly / currentUser.monthlyIncome) > 0.3 ? "bg-warning" :
                                                "bg-success"
                                    }
                                />
                            </div>

                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-medium">Timeline View</span>
                                </div>
                                <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="absolute h-full bg-primary/30"
                                        style={{ width: `${(currentDay / daysInMonth) * 100}%` }}
                                    />
                                    {sortedObligations.map((obl) => (
                                        <div
                                            key={obl.id}
                                            className="absolute w-1 h-full bg-primary"
                                            style={{ left: `${(obl.dueDate / daysInMonth) * 100}%` }}
                                            title={obl.name}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Today is day {currentDay} of {daysInMonth}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
