import { NextResponse } from "next/server"
import {
  getUserById,
  getTransactionsByUser,
  getEvents,
  getCustomEventsByUser,
  computeUserDistributions,
  getUserDistributions,
  getGoalsByUser,
} from "@/data/store"
import {
  runEnhancedMonteCarlo,
  computeCalibratedDistributions,
  STRESS_PRESETS,
  type EnhancedMonteCarloConfig,
} from "@/data/forecast"

// POST /api/simulate
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      monthlySavings = 0,
      iterations = 100,
      scenarioId,
      correlatedExpenseReduction = 0.3,
      includeCustomEvents = true,
      customScenario,
    } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const user = getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const transactions = getTransactionsByUser(userId)
    const events = getEvents()
    const customEvents = getCustomEventsByUser(userId)

    // Determine stress scenario
    let stressScenario
    if (scenarioId) {
      stressScenario = STRESS_PRESETS.find((s) => s.id === scenarioId)
    } else if (customScenario) {
      stressScenario = {
        id: "custom",
        name: customScenario.name || "Custom Scenario",
        description: customScenario.description || "",
        incomeMultiplier: customScenario.incomeMultiplier || 1,
        expenseMultiplier: customScenario.expenseMultiplier || 1,
        oneOffCost: customScenario.oneOffCost || 0,
        duration: customScenario.duration || 3,
      }
    }

    // Prepare custom event costs for simulation
    const now = new Date()
    const customEventCosts = includeCustomEvents
      ? customEvents.map((e) => {
        const eventDate = new Date(e.startDate)
        const monthsAway = Math.max(
          1,
          (eventDate.getFullYear() - now.getFullYear()) * 12 +
          (eventDate.getMonth() - now.getMonth())
        )
        return {
          month: monthsAway <= 6 ? monthsAway : 0,
          cost: e.estimatedCost,
          costStd: e.costStd,
        }
      }).filter((e) => e.month > 0)
      : []

    const config: EnhancedMonteCarloConfig = {
      iterations,
      monthlySavings,
      stressScenario,
      correlatedExpenseReduction,
      shockProbabilityMultiplier: 1,
      includeCustomEvents,
      customEvents: customEventCosts,
    }

    const result = runEnhancedMonteCarlo(
      user,
      transactions,
      events,
      config
    )

    // Also return user's calibrated distributions for transparency
    const calibrated = computeCalibratedDistributions(transactions, user)

    return NextResponse.json({
      simulation: result,
      calibratedDistributions: {
        income: {
          mean: Math.round(calibrated.income.mean),
          std: Math.round(calibrated.income.std),
          isReliable: calibrated.income.isReliable,
        },
        expense: {
          mean: Math.round(calibrated.expense.mean),
          std: Math.round(calibrated.expense.std),
          isReliable: calibrated.expense.isReliable,
        },
      },
      config: {
        iterations,
        scenarioId,
        correlatedExpenseReduction,
        includeCustomEvents,
        customEventsIncluded: customEventCosts.length,
      },
    })
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json(
      { error: "Simulation failed" },
      { status: 500 }
    )
  }
}

// GET /api/simulate/distributions?userId=xxx
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

  const transactions = getTransactionsByUser(userId)
  const calibrated = computeCalibratedDistributions(transactions, user)

  // Also compute and store user distributions
  const distributions = computeUserDistributions(userId)

  return NextResponse.json({
    calibrated: {
      income: {
        mean: Math.round(calibrated.income.mean),
        std: Math.round(calibrated.income.std),
        seasonality: calibrated.income.seasonality,
        isReliable: calibrated.income.isReliable,
      },
      expense: {
        mean: Math.round(calibrated.expense.mean),
        std: Math.round(calibrated.expense.std),
        seasonality: calibrated.expense.seasonality,
        isReliable: calibrated.expense.isReliable,
      },
      categories: Object.fromEntries(
        Object.entries(calibrated.categoryDistributions).map(([k, v]) => [
          k,
          {
            mean: Math.round(v.mean),
            std: Math.round(v.std),
            isReliable: v.isReliable,
          },
        ])
      ),
    },
    userDistributions: distributions,
  })
}
