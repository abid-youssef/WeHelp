import { NextResponse } from "next/server"
import {
  getGoalsByUser,
  createGoal,
  updateGoal,
  deleteGoal,
  getUserById,
} from "@/mocks/store"
import type { Goal } from "@/mocks/seed-data"

// GET /api/goals?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const user = getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const goals = getGoalsByUser(userId)
  return NextResponse.json({ goals })
}

// POST /api/goals
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      name,
      targetAmount,
      targetDate,
      monthlyContribution,
      autoSaveEnabled = true,
      priority = "medium",
      eventId,
    } = body

    if (!userId || !name || !targetAmount || !targetDate || !monthlyContribution) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const user = getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validate monthly contribution against income
    if (monthlyContribution > user.monthlyIncome * 0.5) {
      return NextResponse.json(
        {
          error: "Monthly contribution exceeds 50% of income",
          maxRecommended: user.monthlyIncome * 0.5,
        },
        { status: 400 }
      )
    }

    const goal = createGoal({
      userId,
      name,
      targetAmount,
      targetDate,
      monthlyContribution,
      autoSaveEnabled,
      priority,
      eventId,
    })

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// PATCH /api/goals
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { goalId, ...updates } = body

    if (!goalId) {
      return NextResponse.json(
        { error: "goalId is required" },
        { status: 400 }
      )
    }

    const goal = updateGoal(goalId, updates)
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// DELETE /api/goals?goalId=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const goalId = searchParams.get("goalId")

  if (!goalId) {
    return NextResponse.json({ error: "goalId is required" }, { status: 400 })
  }

  const success = deleteGoal(goalId)
  if (!success) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
