import { NextResponse } from "next/server"
import {
  getEvents,
  getCustomEventsByUser,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  getUserById,
} from "@/mocks/store"
import type { CustomEvent } from "@/mocks/seed-data"

// GET /api/events?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // Return built-in events if no userId
  const builtInEvents = getEvents()

  if (!userId) {
    return NextResponse.json({ events: builtInEvents, customEvents: [] })
  }

  const user = getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const customEvents = getCustomEventsByUser(userId)

  return NextResponse.json({
    events: builtInEvents,
    customEvents,
    combined: [...builtInEvents, ...customEvents].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    ),
  })
}

// POST /api/events (create custom event)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      name,
      startDate,
      endDate,
      estimatedCost,
      costStd,
      category = "other",
      isPrivate = false,
      linkedGoalId,
      recurrence = "none",
    } = body

    if (!userId || !name || !startDate || !endDate || estimatedCost === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const user = getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validate date order
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      )
    }

    const customEvent = createCustomEvent({
      userId,
      name,
      startDate,
      endDate,
      estimatedCost,
      costStd: costStd || estimatedCost * 0.25,
      category,
      isPrivate,
      linkedGoalId,
      recurrence,
    })

    return NextResponse.json({ event: customEvent }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// PATCH /api/events
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { eventId, ...updates } = body

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      )
    }

    const event = updateCustomEvent(eventId, updates)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// DELETE /api/events?eventId=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get("eventId")

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 })
  }

  const success = deleteCustomEvent(eventId)
  if (!success) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
