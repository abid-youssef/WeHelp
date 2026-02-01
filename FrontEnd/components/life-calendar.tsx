"use client"

import { useMemo } from "react"
import { useApp } from "./app-context"
import { getEvents, getTransactionsByUser, getCustomEventsByUser, getLoansByUser } from "@/data/store"
import type { LifeEvent, CustomEvent } from "@/data/seed-data"
import { generateTwinData } from "@/data/forecast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Moon, Gift, Sun, BookOpen, Sparkles, Star, Heart, GraduationCap, Home, Car, Briefcase, Plane } from "lucide-react"

const eventIcons: Record<string, typeof Moon> = {
  moon: Moon,
  gift: Gift,
  sun: Sun,
  book: BookOpen,
  sheep: Sparkles,
  celebration: Heart,
  education: GraduationCap,
  travel: Plane,
  home: Home,
  car: Car,
  business: Briefcase,
  family: Heart,
  healthcare: Star,
  other: Sparkles,
}

interface LifeCalendarProps {
  onEventSelect: (eventId: string) => void
  selectedEventId?: string
}

export function LifeCalendar({ onEventSelect, selectedEventId }: LifeCalendarProps) {
  const { currentUser, refreshKey } = useApp()
  const events = getEvents()
  const customEvents = useMemo(
    () => (currentUser ? getCustomEventsByUser(currentUser.id) : []),
    [currentUser, refreshKey]
  )

  const twinData = useMemo(() => {
    if (!currentUser) return null
    const transactions = getTransactionsByUser(currentUser.id)
    const loans = getLoansByUser(currentUser.id)
    return generateTwinData(currentUser, transactions, events, loans, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, refreshKey])

  if (!currentUser || !twinData) return null

  const now = new Date()

  // Combine built-in and custom events
  const allEvents: Array<(LifeEvent | CustomEvent) & { isCustom?: boolean }> = [
    ...events.map((e) => ({ ...e, isCustom: false })),
    ...customEvents.map((e) => ({ ...e, isCustom: true })),
  ]

  const upcomingEvents = allEvents
    .filter((e) => new Date(e.startDate) > now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Moon className="w-5 h-5 text-primary" />
          Life Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming events in the next 6 months.
          </p>
        ) : (
          upcomingEvents.map((event) => {
            const eventReadiness = twinData.eventReadiness.find(
              (e) => e.eventId === event.id
            )
            // For custom events, use category as icon key; for built-in, use icon field
            const iconKey = 'icon' in event ? (event as LifeEvent).icon : ('category' in event ? (event as CustomEvent).category : 'other')
            const Icon = eventIcons[iconKey] || Sparkles
            const isSelected = selectedEventId === event.id
            const isCustom = event.isCustom

            return (
              <div
                key={event.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
                  }`}
                onClick={() => onEventSelect(event.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${eventReadiness?.status === "on_track"
                        ? "bg-success/10"
                        : eventReadiness?.status === "at_risk"
                          ? "bg-warning/10"
                          : "bg-destructive/10"
                        }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${eventReadiness?.status === "on_track"
                          ? "text-success"
                          : eventReadiness?.status === "at_risk"
                            ? "text-warning"
                            : "text-destructive"
                          }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {event.name}
                        {isCustom && (
                          <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {eventReadiness && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {eventReadiness.monthsAway} month
                          {eventReadiness.monthsAway !== 1 ? "s" : ""} away
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        eventReadiness?.status === "on_track"
                          ? "default"
                          : eventReadiness?.status === "at_risk"
                            ? "secondary"
                            : "destructive"
                      }
                      className={`text-xs ${eventReadiness?.status === "on_track"
                        ? "bg-success text-success-foreground"
                        : eventReadiness?.status === "at_risk"
                          ? "bg-warning text-warning-foreground"
                          : ""
                        }`}
                    >
                      {eventReadiness?.status === "on_track"
                        ? "On Track"
                        : eventReadiness?.status === "at_risk"
                          ? "At Risk"
                          : "Critical"}
                    </Badge>
                    <p className="text-sm font-medium mt-1">
                      {event.estimatedCost.toLocaleString()} TND
                    </p>
                    {eventReadiness && eventReadiness.gapAmount > 0 && (
                      <p className="text-xs text-destructive">
                        Gap: {eventReadiness.gapAmount.toLocaleString()} TND
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
