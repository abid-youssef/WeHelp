// Forecasting and readiness scoring logic
// All explainable, rule-based calculations

import type { Transaction, LifeEvent, User, Loan, CustomEvent } from "./seed-data"

export interface ProjectionMonth {
  month: string
  label: string
  doNothing: number
  withSavings: number
  confidenceLow: number
  confidenceHigh: number
  hasEvent?: boolean
  eventCost?: number
  loanPayment?: number
}



export interface TwinData {
  projection: ProjectionMonth[]
  readiness: ReadinessScore
  eventReadiness: {
    eventId: string
    eventName: string
    readiness: number
    status: "on_track" | "at_risk" | "critical"
    gapAmount: number
    monthsAway: number
  }[]
  insights: {
    savingsRate: number
    expenseVolatility: number
    monthsOfSavings: number
    recurringRatio: number
  }
}

// Stress test scenarios
export interface StressScenario {
  id: string
  name: string
  description: string
  incomeMultiplier: number
  expenseMultiplier: number
  oneOffCost: number
  duration: number // months
}

export const STRESS_PRESETS: StressScenario[] = [
  {
    id: "job_loss",
    name: "Job Loss",
    description: "Complete income loss for 3 months",
    incomeMultiplier: 0,
    expenseMultiplier: 1,
    oneOffCost: 0,
    duration: 3,
  },
  {
    id: "income_drop_30",
    name: "30% Income Drop",
    description: "Sustained 30% reduction in income",
    incomeMultiplier: 0.7,
    expenseMultiplier: 1,
    oneOffCost: 0,
    duration: 6,
  },
  {
    id: "medical_emergency",
    name: "Medical Emergency",
    description: "Unexpected medical bill of 2000 TND",
    incomeMultiplier: 1,
    expenseMultiplier: 1,
    oneOffCost: 2000,
    duration: 1,
  },
  {
    id: "inflation_spike",
    name: "Inflation Spike",
    description: "20% increase in living expenses",
    incomeMultiplier: 1,
    expenseMultiplier: 1.2,
    oneOffCost: 0,
    duration: 6,
  },
  {
    id: "major_travel",
    name: "Major Travel",
    description: "Unplanned travel expense of 1500 TND",
    incomeMultiplier: 1,
    expenseMultiplier: 1,
    oneOffCost: 1500,
    duration: 1,
  },
]

// Monte Carlo simulation result
export interface MonteCarloResult {
  iterations: number
  percentiles: {
    p10: number[]
    p50: number[]
    p90: number[]
  }
  riskOfNegativeBalance: number
  probabilityOfNeedingCredit: number
  resilienceScore: number
  monthlyProjections: {
    month: string
    label: string
    p10: number
    p50: number
    p90: number
    baseline: number
  }[]
}

// Sensitivity analysis result
export interface SensitivityResult {
  variable: string
  currentValue: number
  testValues: number[]
  scores: number[]
  impact: string
}

// User-calibrated distribution for sampling
export interface CalibratedDistribution {
  mean: number
  std: number
  seasonality: Record<number, number>
  isReliable: boolean
}

// Enhanced Monte Carlo config with correlation
export interface EnhancedMonteCarloConfig {
  iterations: number
  monthlySavings: number
  stressScenario?: StressScenario
  correlatedExpenseReduction: number // 0-1: when income drops, reduce discretionary by this factor
  shockProbabilityMultiplier: number // multiply default shock probabilities
  includeCustomEvents: boolean
  customEvents?: Array<{
    month: number
    cost: number
    costStd: number
  }>
}

// Goal shortfall analysis
export interface GoalShortfallResult {
  goalId: string
  goalName: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  probabilityOfAchieving: number
  expectedFinalAmount: number
  shortfallAmount: number
}

// Calculate rolling mean of last N months net flow
function calculateMonthlyAverage(
  transactions: Transaction[],
  months: number = 3
): number {
  const now = new Date()
  const monthlyFlows: number[] = []

  for (let i = 0; i < months; i++) {
    const targetMonth = new Date(now)
    targetMonth.setMonth(now.getMonth() - i - 1)
    const monthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`

    const monthTransactions = transactions.filter(
      (t) => t.date.substring(0, 7) === monthStr
    )
    const flow = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
    monthlyFlows.push(flow)
  }

  return monthlyFlows.length > 0
    ? monthlyFlows.reduce((a, b) => a + b, 0) / monthlyFlows.length
    : 0
}

// Calculate expense standard deviation
function calculateExpenseStd(transactions: Transaction[]): number {
  const expenses = transactions.filter((t) => t.amount < 0).map((t) => Math.abs(t.amount))
  if (expenses.length < 2) return 0

  const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length
  const squaredDiffs = expenses.map((e) => Math.pow(e - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / expenses.length
  return Math.sqrt(variance)
}

// Calculate monthly totals
function getMonthlyTotals(
  transactions: Transaction[]
): { income: number; expense: number }[] {
  const monthlyData: Map<string, { income: number; expense: number }> = new Map()

  transactions.forEach((t) => {
    const month = t.date.substring(0, 7)
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { income: 0, expense: 0 })
    }
    const data = monthlyData.get(month)!
    if (t.amount > 0) {
      data.income += t.amount
    } else {
      data.expense += Math.abs(t.amount)
    }
  })

  return Array.from(monthlyData.values())
}

// Generate 6-month forward projection
export function generateProjection(
  user: User,
  transactions: Transaction[],
  events: LifeEvent[],
  loans: Loan[] = [],
  monthlySavings: number = 0
): ProjectionMonth[] {
  // Robustness check for old calls where 4th param was monthlySavings
  let actualLoans = Array.isArray(loans) ? loans : []
  let actualSavings = typeof loans === 'number' ? loans : monthlySavings
  const monthlyAvg = calculateMonthlyAverage(transactions, 3)
  const expenseStd = calculateExpenseStd(transactions)
  const projection: ProjectionMonth[] = []

  let currentBalance = user.balance
  let balanceWithSavings = user.balance

  const now = new Date()
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  for (let i = 0; i <= 6; i++) {
    const targetDate = new Date(now)
    targetDate.setMonth(now.getMonth() + i)
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`
    const label = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`

    // Calculate event costs and loan payments this month
    let eventCost = 0
    let hasEvent = false
    for (const event of events) {
      if (event.startDate.substring(0, 7) === monthStr) {
        eventCost += event.estimatedCost
        hasEvent = true
      }
    }

    // Active loan payments
    let loanPayment = 0
    for (const loan of actualLoans) {
      if (loan.status === "approved_auto" || loan.status === "approved_by_advisor" || loan.status === "active") {
        // Simple logic: assume payment continues for the duration of projection
        loanPayment += loan.monthlyPayment
      }
    }

    if (i === 0) {
      // Current month
      projection.push({
        month: monthStr,
        label,
        doNothing: currentBalance,
        withSavings: balanceWithSavings,
        confidenceLow: currentBalance - expenseStd,
        confidenceHigh: currentBalance + expenseStd,
        hasEvent,
        eventCost,
        loanPayment,
      })
    } else {
      // Apply monthly flow
      // Substract loan payments and event costs from the "flow"
      const monthlyNet = monthlyAvg - loanPayment - (hasEvent ? eventCost : 0)

      currentBalance += monthlyNet
      balanceWithSavings += monthlyNet + actualSavings

      projection.push({
        month: monthStr,
        label,
        doNothing: Math.round(currentBalance),
        withSavings: Math.round(balanceWithSavings),
        confidenceLow: Math.round(currentBalance - expenseStd * (1 + i * 0.2)),
        confidenceHigh: Math.round(currentBalance + expenseStd * (1 + i * 0.2)),
        hasEvent,
        eventCost,
        loanPayment,
      })
    }
  }

  return projection
}

export interface ReadinessScore {
  score: number
  level: "low" | "medium" | "high"
  drivers: {
    name: string
    value: number
    impact: "positive" | "negative" | "neutral"
    description: string
  }[]
  breakdown: { subject: string; score: number; fullMark: number }[]
}

// Calculate readiness score (New 6-component Model)
export function calculateReadiness(
  user: User,
  transactions: Transaction[],
  event?: LifeEvent | CustomEvent // Optional now, as we calculate general readiness too
): ReadinessScore {
  const monthlyTotals = getMonthlyTotals(transactions)
  if (monthlyTotals.length === 0) return { score: 0, level: "low", drivers: [], breakdown: [] }

  const avgIncome = monthlyTotals.reduce((sum, m) => sum + m.income, 0) / monthlyTotals.length
  const avgExpense = monthlyTotals.reduce((sum, m) => sum + m.expense, 0) / monthlyTotals.length

  // 1. Liquidity (30%) - Months of Buffer
  const monthsOfBuffer = avgExpense > 0 ? user.balance / avgExpense : 0
  const liquidityScore = Math.min(100, (monthsOfBuffer / 6) * 100)

  // 2. Savings Behavior (20%) - Savings Rate
  const savingsRate = avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : 0
  const savingsScore = Math.min(100, Math.max(0, (savingsRate / 0.20) * 100))

  // 3. Income Stability (15%) - CV of Income
  const incomes = monthlyTotals.map(m => m.income)
  const incomeMean = incomes.reduce((a, b) => a + b, 0) / incomes.length
  const incomeStd = Math.sqrt(incomes.reduce((s, x) => s + (x - incomeMean) ** 2, 0) / incomes.length)
  const incomeCv = incomeMean > 0 ? incomeStd / incomeMean : 0
  const incomeScore = Math.max(0, 100 - (incomeCv * 200))

  // 4. Expense Volatility (10%) - CV of Expense
  const expenses = monthlyTotals.map(m => m.expense)
  const expenseMean = expenses.reduce((a, b) => a + b, 0) / expenses.length
  const expenseStd = Math.sqrt(expenses.reduce((s, x) => s + (x - expenseMean) ** 2, 0) / expenses.length)
  const expenseCv = expenseMean > 0 ? expenseStd / expenseMean : 0
  const expenseScore = Math.max(0, 100 - (expenseCv * 150))

  // 5. Event Exposure (15%)
  let exposureScore = 100
  let upcomingCost = 0
  if (event) {
    upcomingCost = event.estimatedCost
  }
  const exposureRatio = avgIncome > 0 ? upcomingCost / avgIncome : 0
  exposureScore = Math.max(0, 100 - (exposureRatio * 33))

  // 6. Debt Load (10%)
  const debtScore = 80

  // Weighted Sum
  const finalScore = Math.round(
    liquidityScore * 0.30 +
    savingsScore * 0.20 +
    incomeScore * 0.15 +
    expenseScore * 0.10 +
    exposureScore * 0.15 +
    debtScore * 0.10
  )

  const breakdown = [
    { subject: "Liquidity", score: Math.round(liquidityScore), fullMark: 100 },
    { subject: "Savings", score: Math.round(savingsScore), fullMark: 100 },
    { subject: "Income Stability", score: Math.round(incomeScore), fullMark: 100 },
    { subject: "Expense Control", score: Math.round(expenseScore), fullMark: 100 },
    { subject: "Event Expo.", score: Math.round(exposureScore), fullMark: 100 },
    { subject: "Debt Load", score: Math.round(debtScore), fullMark: 100 },
  ]

  // Drivers for UI
  const drivers = [
    {
      name: "Liquidity",
      value: parseFloat(monthsOfBuffer.toFixed(1)),
      impact: monthsOfBuffer > 3 ? "positive" : monthsOfBuffer < 1 ? "negative" : "neutral",
      description: `${monthsOfBuffer.toFixed(1)} months of expenses saved (Target: 6m)`
    },
    {
      name: "Savings Rate",
      value: parseFloat((savingsRate * 100).toFixed(1)),
      impact: savingsRate > 0.15 ? "positive" : savingsRate < 0.05 ? "negative" : "neutral",
      description: `Saving ${(savingsRate * 100).toFixed(0)}% of income (Target: 20%)`
    },
    {
      name: "Event Exposure",
      value: parseFloat(exposureRatio.toFixed(1)),
      impact: exposureRatio < 1 ? "positive" : exposureRatio > 3 ? "negative" : "neutral",
      description: `Event cost is ${exposureRatio.toFixed(1)}x monthly income`
    }
  ] as ReadinessScore["drivers"]

  return {
    score: finalScore,
    level: finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low",
    drivers,
    breakdown
  }
}

// Client Classification Logic
export function classifyClient(monthsOfBuffer: number, savingsRate: number): { category: string, color: string } {
  if (monthsOfBuffer >= 6 && savingsRate >= 0.15) return { category: "Smart Saver", color: "green" }
  if (monthsOfBuffer >= 3 && savingsRate >= 0.05) return { category: "Balanced", color: "blue" }
  if (monthsOfBuffer >= 1) return { category: "High Spender", color: "orange" }
  if (monthsOfBuffer > 0) return { category: "Power Spender", color: "red" }
  return { category: "Ultra Spender", color: "darkred" }
}

// Box-Muller transform for normal distribution sampling
function randomNormal(mean: number = 0, std: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * std + mean
}

// Run Monte Carlo simulation
export function runMonteCarloSimulation(
  user: User,
  transactions: Transaction[],
  events: LifeEvent[],
  monthlySavings: number = 0,
  iterations: number = 100,
  stressScenario?: StressScenario,
  onProgress?: (progress: number) => void
): MonteCarloResult {
  const monthlyTotals = getMonthlyTotals(transactions)
  const avgIncome =
    monthlyTotals.reduce((sum, m) => sum + m.income, 0) / monthlyTotals.length || user.monthlyIncome
  const avgExpense =
    monthlyTotals.reduce((sum, m) => sum + m.expense, 0) / monthlyTotals.length || user.monthlyIncome * 0.8
  const expenseStd = calculateExpenseStd(transactions) || avgExpense * 0.15
  const incomeStd = avgIncome * 0.1 // Assume 10% income volatility

  const now = new Date()
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  // Run iterations
  const allPaths: number[][] = []
  let negativeCount = 0
  let needsCreditCount = 0

  for (let i = 0; i < iterations; i++) {
    let balance = user.balance
    const path: number[] = [balance]

    for (let month = 1; month <= 6; month++) {
      const targetDate = new Date(now)
      targetDate.setMonth(now.getMonth() + month)
      const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`

      // Sample income with random variation
      let sampledIncome = randomNormal(avgIncome, incomeStd)
      sampledIncome = Math.max(0, sampledIncome)

      // Sample expenses with random variation
      let sampledExpense = randomNormal(avgExpense, expenseStd)
      sampledExpense = Math.max(avgExpense * 0.5, sampledExpense) // Floor at 50% of avg

      // Apply event multipliers
      let eventMultiplier = 1
      let eventCost = 0
      for (const event of events) {
        const eventStart = event.startDate.substring(0, 7)
        const eventEnd = event.endDate.substring(0, 7)
        if (monthStr >= eventStart && monthStr <= eventEnd) {
          eventMultiplier = Math.max(eventMultiplier, event.multiplier)
          // Random event cost from normal distribution
          const eventMean = event.estimatedCost / 2
          const eventStd = event.estimatedCost * 0.3
          eventCost += Math.max(0, randomNormal(eventMean, eventStd))
        }
      }

      sampledExpense = sampledExpense * eventMultiplier + eventCost

      // Apply stress scenario if provided
      if (stressScenario && month <= stressScenario.duration) {
        sampledIncome *= stressScenario.incomeMultiplier
        sampledExpense *= stressScenario.expenseMultiplier
        if (month === 1) {
          sampledExpense += stressScenario.oneOffCost
        }
      }

      // Calculate new balance
      balance = balance + sampledIncome - sampledExpense + monthlySavings

      path.push(Math.round(balance))
    }

    allPaths.push(path)

    // Check risk conditions
    if (path.some((b) => b < 0)) {
      negativeCount++
    }
    if (path.some((b) => b < -500)) {
      needsCreditCount++
    }

    // Report progress
    if (onProgress && i % 10 === 0) {
      onProgress(Math.round((i / iterations) * 100))
    }
  }

  // Calculate percentiles for each month
  const percentiles: { p10: number[]; p50: number[]; p90: number[] } = {
    p10: [],
    p50: [],
    p90: [],
  }

  for (let month = 0; month <= 6; month++) {
    const monthValues = allPaths.map((path) => path[month]).sort((a, b) => a - b)
    percentiles.p10.push(monthValues[Math.floor(iterations * 0.1)])
    percentiles.p50.push(monthValues[Math.floor(iterations * 0.5)])
    percentiles.p90.push(monthValues[Math.floor(iterations * 0.9)])
  }

  // Generate monthly projections with labels
  const monthlyProjections = []
  for (let i = 0; i <= 6; i++) {
    const targetDate = new Date(now)
    targetDate.setMonth(now.getMonth() + i)
    monthlyProjections.push({
      month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`,
      label: `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`,
      p10: percentiles.p10[i],
      p50: percentiles.p50[i],
      p90: percentiles.p90[i],
      baseline: user.balance + i * (avgIncome - avgExpense + monthlySavings),
    })
  }

  // Calculate resilience score based on Monte Carlo results
  const riskOfNegative = negativeCount / iterations
  const probCredit = needsCreditCount / iterations
  const finalMedian = percentiles.p50[6]
  const finalP10 = percentiles.p10[6]

  // Resilience score: higher is better
  const resilienceScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (1 - riskOfNegative) * 40 +
        (1 - probCredit) * 30 +
        (finalMedian > 0 ? 15 : 0) +
        (finalP10 > 0 ? 15 : 0)
      )
    )
  )

  if (onProgress) {
    onProgress(100)
  }

  return {
    iterations,
    percentiles,
    riskOfNegativeBalance: Math.round(riskOfNegative * 100),
    probabilityOfNeedingCredit: Math.round(probCredit * 100),
    resilienceScore,
    monthlyProjections,
  }
}

// Compute user-calibrated distributions from transaction history
export function computeCalibratedDistributions(
  transactions: Transaction[],
  user: User
): {
  income: CalibratedDistribution
  expense: CalibratedDistribution
  categoryDistributions: Record<string, CalibratedDistribution>
} {
  const monthlyData: Record<string, { income: number; expense: number; byCategory: Record<string, number> }> = {}

  // Group transactions by month
  transactions.forEach((t) => {
    const month = t.date.substring(0, 7)
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0, byCategory: {} }
    }
    if (t.amount > 0) {
      monthlyData[month].income += t.amount
    } else {
      monthlyData[month].expense += Math.abs(t.amount)
      const cat = t.category
      if (!monthlyData[month].byCategory[cat]) {
        monthlyData[month].byCategory[cat] = 0
      }
      monthlyData[month].byCategory[cat] += Math.abs(t.amount)
    }
  })

  const months = Object.keys(monthlyData).sort()
  const n = months.length

  // Compute income distribution
  const incomes = months.map((m) => monthlyData[m].income)
  const incMean = n > 0 ? incomes.reduce((a, b) => a + b, 0) / n : user.monthlyIncome
  const incVariance = n > 1 ? incomes.reduce((sum, x) => sum + Math.pow(x - incMean, 2), 0) / n : Math.pow(incMean * 0.1, 2)
  const incStd = Math.sqrt(incVariance)

  // Compute expense distribution
  const expenses = months.map((m) => monthlyData[m].expense)
  const expMean = n > 0 ? expenses.reduce((a, b) => a + b, 0) / n : user.monthlyIncome * 0.8
  const expVariance = n > 1 ? expenses.reduce((sum, x) => sum + Math.pow(x - expMean, 2), 0) / n : Math.pow(expMean * 0.15, 2)
  const expStd = Math.sqrt(expVariance)

  // Seasonality by calendar month
  const incomeByMonth: Record<number, number[]> = {}
  const expenseByMonth: Record<number, number[]> = {}
  months.forEach((m) => {
    const monthNum = parseInt(m.split("-")[1]) - 1
    if (!incomeByMonth[monthNum]) incomeByMonth[monthNum] = []
    if (!expenseByMonth[monthNum]) expenseByMonth[monthNum] = []
    incomeByMonth[monthNum].push(monthlyData[m].income)
    expenseByMonth[monthNum].push(monthlyData[m].expense)
  })

  const incSeasonality: Record<number, number> = {}
  const expSeasonality: Record<number, number> = {}
  for (let i = 0; i < 12; i++) {
    incSeasonality[i] = incomeByMonth[i] && incMean > 0
      ? (incomeByMonth[i].reduce((a, b) => a + b, 0) / incomeByMonth[i].length) / incMean
      : 1
    expSeasonality[i] = expenseByMonth[i] && expMean > 0
      ? (expenseByMonth[i].reduce((a, b) => a + b, 0) / expenseByMonth[i].length) / expMean
      : 1
  }

  // Compute category-level distributions
  const allCategories: Set<string> = new Set()
  Object.values(monthlyData).forEach((d) => {
    Object.keys(d.byCategory).forEach((c) => allCategories.add(c))
  })

  const categoryDistributions: Record<string, CalibratedDistribution> = {}
  allCategories.forEach((cat) => {
    const catValues = months.map((m) => monthlyData[m].byCategory[cat] || 0)
    const catMean = catValues.reduce((a, b) => a + b, 0) / n
    const catVariance = n > 1 ? catValues.reduce((sum, x) => sum + Math.pow(x - catMean, 2), 0) / n : Math.pow(catMean * 0.2, 2)
    const catStd = Math.sqrt(catVariance)

    categoryDistributions[cat] = {
      mean: catMean,
      std: catStd,
      seasonality: {},
      isReliable: catValues.filter((v) => v > 0).length >= 6,
    }
  })

  return {
    income: {
      mean: incMean,
      std: incStd,
      seasonality: incSeasonality,
      isReliable: n >= 6,
    },
    expense: {
      mean: expMean,
      std: expStd,
      seasonality: expSeasonality,
      isReliable: n >= 6,
    },
    categoryDistributions,
  }
}

// Enhanced Monte Carlo with user-calibrated distributions and correlation
export function runEnhancedMonteCarlo(
  user: User,
  transactions: Transaction[],
  events: LifeEvent[],
  config: EnhancedMonteCarloConfig,
  onProgress?: (progress: number) => void
): MonteCarloResult & { goalShortfalls: GoalShortfallResult[]; usingDefaults: boolean } {
  const calibrated = computeCalibratedDistributions(transactions, user)
  const usingDefaults = !calibrated.income.isReliable || !calibrated.expense.isReliable

  const now = new Date()
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  // Run iterations
  const allPaths: number[][] = []
  let negativeCount = 0
  let needsCreditCount = 0

  for (let i = 0; i < config.iterations; i++) {
    let balance = user.balance
    const path: number[] = [balance]
    let incomeShockActive = false
    let shockMonthsRemaining = 0

    for (let month = 1; month <= 6; month++) {
      const targetDate = new Date(now)
      targetDate.setMonth(now.getMonth() + month)
      const monthNum = targetDate.getMonth()
      const monthStr = `${targetDate.getFullYear()}-${String(monthNum + 1).padStart(2, "0")}`

      // Apply seasonality to sampling
      const incomeSeason = calibrated.income.seasonality[monthNum] || 1
      const expenseSeason = calibrated.expense.seasonality[monthNum] || 1

      // Sample income with user-calibrated distribution
      let sampledIncome = randomNormal(
        calibrated.income.mean * incomeSeason,
        calibrated.income.std
      )
      sampledIncome = Math.max(0, sampledIncome)

      // Sample expenses with user-calibrated distribution
      let sampledExpense = randomNormal(
        calibrated.expense.mean * expenseSeason,
        calibrated.expense.std
      )
      sampledExpense = Math.max(calibrated.expense.mean * 0.5, sampledExpense)

      // Apply event multipliers and costs
      let eventCost = 0
      for (const event of events) {
        const eventStart = event.startDate.substring(0, 7)
        const eventEnd = event.endDate.substring(0, 7)
        if (monthStr >= eventStart && monthStr <= eventEnd) {
          sampledExpense *= event.multiplier
          // Sample event cost from distribution
          eventCost += Math.max(0, randomNormal(event.estimatedCost, event.costStd))
        }
      }

      // Add custom event costs
      if (config.includeCustomEvents && config.customEvents) {
        const customEventThisMonth = config.customEvents.find((e) => e.month === month)
        if (customEventThisMonth) {
          eventCost += Math.max(0, randomNormal(customEventThisMonth.cost, customEventThisMonth.costStd))
        }
      }

      sampledExpense += eventCost

      // Apply stress scenario with correlation modeling
      if (config.stressScenario && shockMonthsRemaining > 0) {
        sampledIncome *= config.stressScenario.incomeMultiplier
        sampledExpense *= config.stressScenario.expenseMultiplier

        // Correlation: if income dropped, reduce discretionary spending
        if (config.stressScenario.incomeMultiplier < 1 && config.correlatedExpenseReduction > 0) {
          const discretionaryCategories = ["entertainment", "clothing", "travel"]
          let discretionaryAmount = 0
          for (const cat of discretionaryCategories) {
            discretionaryAmount += calibrated.categoryDistributions[cat]?.mean || 0
          }
          sampledExpense -= discretionaryAmount * config.correlatedExpenseReduction
        }

        if (month === 1 && config.stressScenario.oneOffCost > 0) {
          sampledExpense += config.stressScenario.oneOffCost
        }

        shockMonthsRemaining--
      } else if (config.stressScenario && month === 1) {
        // Start shock
        shockMonthsRemaining = config.stressScenario.duration
        incomeShockActive = true
      }

      // Calculate new balance
      balance = balance + sampledIncome - sampledExpense + config.monthlySavings

      path.push(Math.round(balance))
    }

    allPaths.push(path)

    // Check risk conditions
    if (path.some((b) => b < 0)) {
      negativeCount++
    }
    if (path.some((b) => b < -500)) {
      needsCreditCount++
    }

    // Report progress
    if (onProgress && i % 10 === 0) {
      onProgress(Math.round((i / config.iterations) * 100))
    }
  }

  // Calculate percentiles
  const percentiles: { p10: number[]; p50: number[]; p90: number[] } = {
    p10: [],
    p50: [],
    p90: [],
  }

  for (let month = 0; month <= 6; month++) {
    const monthValues = allPaths.map((path) => path[month]).sort((a, b) => a - b)
    percentiles.p10.push(monthValues[Math.floor(config.iterations * 0.1)])
    percentiles.p50.push(monthValues[Math.floor(config.iterations * 0.5)])
    percentiles.p90.push(monthValues[Math.floor(config.iterations * 0.9)])
  }

  // Generate monthly projections
  const monthlyProjections = []
  for (let i = 0; i <= 6; i++) {
    const targetDate = new Date(now)
    targetDate.setMonth(now.getMonth() + i)
    monthlyProjections.push({
      month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`,
      label: `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`,
      p10: percentiles.p10[i],
      p50: percentiles.p50[i],
      p90: percentiles.p90[i],
      baseline: user.balance + i * (calibrated.income.mean - calibrated.expense.mean + config.monthlySavings),
    })
  }

  // Calculate resilience score
  const riskOfNegative = negativeCount / config.iterations
  const probCredit = needsCreditCount / config.iterations
  const finalMedian = percentiles.p50[6]
  const finalP10 = percentiles.p10[6]

  const resilienceScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (1 - riskOfNegative) * 40 +
        (1 - probCredit) * 30 +
        (finalMedian > 0 ? 15 : 0) +
        (finalP10 > 0 ? 15 : 0)
      )
    )
  )

  if (onProgress) {
    onProgress(100)
  }

  return {
    iterations: config.iterations,
    percentiles,
    riskOfNegativeBalance: Math.round(riskOfNegative * 100),
    probabilityOfNeedingCredit: Math.round(probCredit * 100),
    resilienceScore,
    monthlyProjections,
    goalShortfalls: [], // Would be computed with goal data
    usingDefaults,
  }
}

// Run sensitivity analysis
export function runSensitivityAnalysis(
  user: User,
  transactions: Transaction[],
  events: LifeEvent[],
  baselineSavings: number = 0
): SensitivityResult[] {
  const results: SensitivityResult[] = []

  // Test savings rate sensitivity
  const savingsValues = [0, 50, 100, 150, 200, 250, 300]
  const savingsScores = savingsValues.map((savings) => {
    const result = runMonteCarloSimulation(user, transactions, events, savings, 50)
    return result.resilienceScore
  })

  results.push({
    variable: "Monthly Savings",
    currentValue: baselineSavings,
    testValues: savingsValues,
    scores: savingsScores,
    impact: `+${savingsScores[savingsScores.length - 1] - savingsScores[0]} points at max savings`,
  })

  // Test income drop sensitivity
  const incomeDrops = [0, 10, 20, 30, 40, 50]
  const incomeScores = incomeDrops.map((drop) => {
    const scenario: StressScenario = {
      id: "income_test",
      name: "Income Drop Test",
      description: "",
      incomeMultiplier: 1 - drop / 100,
      expenseMultiplier: 1,
      oneOffCost: 0,
      duration: 6,
    }
    const result = runMonteCarloSimulation(
      user,
      transactions,
      events,
      baselineSavings,
      50,
      scenario
    )
    return result.resilienceScore
  })

  results.push({
    variable: "Income Drop %",
    currentValue: 0,
    testValues: incomeDrops,
    scores: incomeScores,
    impact: `${incomeScores[incomeScores.length - 1] - incomeScores[0]} points at 50% drop`,
  })

  return results
}

// Generate complete twin data
export function generateTwinData(
  user: User,
  transactions: Transaction[],
  events: LifeEvent[],
  loans: Loan[] = [],
  monthlySavings: number = 0
): TwinData {
  // Robustness check for old calls
  const actualLoans = Array.isArray(loans) ? loans : []
  const actualSavings = typeof loans === 'number' ? loans : monthlySavings

  const projection = generateProjection(user, transactions, events, actualLoans, actualSavings)
  const monthlyTotals = getMonthlyTotals(transactions)

  const avgIncome =
    monthlyTotals.reduce((sum, m) => sum + m.income, 0) / monthlyTotals.length || 0
  const avgExpense =
    monthlyTotals.reduce((sum, m) => sum + m.expense, 0) / monthlyTotals.length || 0

  // Calculate insights
  const savingsRate = avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : 0
  const expenseVolatility = calculateExpenseStd(transactions) / avgExpense || 0
  const monthsOfSavings = avgExpense > 0 ? user.balance / avgExpense : 0

  const incomeTransactions = transactions.filter((t) => t.amount > 0)
  const uniqueCategories = new Set(incomeTransactions.map((t) => t.category))
  const recurringRatio = uniqueCategories.size <= 2 ? 0.8 : 0.5

  // Calculate readiness for each upcoming event
  const now = new Date()
  const upcomingEvents = events.filter((e) => new Date(e.startDate) > now)

  const eventReadiness = upcomingEvents.map((event) => {
    const readiness = calculateReadiness(user, transactions, event)
    const eventDate = new Date(event.startDate)
    const monthsAway = Math.max(
      0,
      (eventDate.getFullYear() - now.getFullYear()) * 12 +
      (eventDate.getMonth() - now.getMonth())
    )

    const projectedSavings = (avgIncome - avgExpense) * monthsAway
    const totalAvailable = user.balance + projectedSavings

    // Safety buffer: we want the user to have at least 1.5 months of expenses left AFTER the event
    const safetyBuffer = avgExpense * 1.5
    const gapAmount = Math.max(0, event.estimatedCost + safetyBuffer - totalAvailable)

    return {
      eventId: event.id,
      eventName: event.name,
      readiness: readiness.score,
      status:
        readiness.score >= 70
          ? ("on_track" as const)
          : readiness.score >= 40
            ? ("at_risk" as const)
            : ("critical" as const),
      gapAmount: Math.round(gapAmount),
      monthsAway,
    }
  })

  // Get first event's readiness as primary
  const primaryReadiness =
    upcomingEvents.length > 0
      ? calculateReadiness(user, transactions, upcomingEvents[0])
      : {
        score: 50,
        level: "medium" as const,
        drivers: [],
        breakdown: [
          { subject: "Liquidity", score: 50, fullMark: 100 },
          { subject: "Savings", score: 50, fullMark: 100 },
          { subject: "Income Stability", score: 50, fullMark: 100 },
          { subject: "Expense Control", score: 50, fullMark: 100 },
          { subject: "Event Expo.", score: 50, fullMark: 100 },
          { subject: "Debt Load", score: 50, fullMark: 100 },
        ]
      }

  return {
    projection,
    readiness: primaryReadiness,
    eventReadiness: eventReadiness.sort((a, b) => a.monthsAway - b.monthsAway),
    insights: {
      savingsRate: Math.round(savingsRate * 100),
      expenseVolatility: Math.round(expenseVolatility * 100),
      monthsOfSavings: Math.round(monthsOfSavings * 10) / 10,
      recurringRatio: Math.round(recurringRatio * 100),
    },
  }
}

// Loan Request Risk Scoring (0-100, Higher is Riskier)
export interface LoanRiskScore {
  score: number
  level: "low" | "medium" | "high" | "critical"
  drivers: { name: string; impact: "positive" | "negative"; contribution: number }[]
  recommendation: string
}

export function calculateLoanRiskScore(
  user: User,
  transactions: Transaction[],
  loanAmount: number
): LoanRiskScore {
  const readiness = calculateReadiness(user, transactions)
  const monthlyTotals = getMonthlyTotals(transactions)
  const avgIncome = monthlyTotals.reduce((sum, m) => sum + m.income, 0) / monthlyTotals.length || 1

  // Features
  const loanToIncome = loanAmount / avgIncome
  const monthsOfSavings = readiness.drivers.find(d => d.name === "Liquidity")?.value || 0
  const savingsRate = (readiness.drivers.find(d => d.name === "Savings Rate")?.value || 0) / 100
  const readinessScore = readiness.score

  // Risk Components (0-100 scale where 100 is MAX RISK)
  // 1. Readiness Inverse (Low readiness = High risk)
  const readinessRisk = 100 - readinessScore

  // 2. Loan Burden (loan > 3x income is risky)
  const burdenRisk = Math.min(100, (loanToIncome / 3) * 100)

  // 3. Liquidity Risk (0 months = 100 risk)
  const liquidityRisk = Math.min(100, Math.max(0, (1 - monthsOfSavings / 3) * 100))

  // 4. Savings Behavior Risk (negative savings = 100 risk)
  const savingsRisk = savingsRate < 0 ? 100 : Math.max(0, (0.2 - savingsRate) * 200)

  // Weighted Sum for Risk Score
  const riskScore = Math.round(
    readinessRisk * 0.4 +
    burdenRisk * 0.3 +
    liquidityRisk * 0.15 +
    savingsRisk * 0.15
  )

  // Drivers
  const drivers: LoanRiskScore["drivers"] = []
  if (readinessRisk > 50) drivers.push({ name: "Low Financial Readiness", impact: "negative", contribution: readinessRisk * 0.4 })
  if (burdenRisk > 60) drivers.push({ name: "High Loan-to-Income", impact: "negative", contribution: burdenRisk * 0.3 })
  if (liquidityRisk > 70) drivers.push({ name: "Low Liquidity Buffer", impact: "negative", contribution: liquidityRisk * 0.15 })
  if (readinessRisk < 30) drivers.push({ name: "Strong Readiness Score", impact: "positive", contribution: (100 - readinessRisk) * 0.4 })
  if (burdenRisk < 30) drivers.push({ name: "Manageable Loan Amount", impact: "positive", contribution: (100 - burdenRisk) * 0.3 })

  let level: LoanRiskScore["level"] = "low"
  let recommendation = "Approve"

  if (riskScore >= 80) { level = "critical"; recommendation = "Reject"; }
  else if (riskScore >= 60) { level = "high"; recommendation = "Reject or Require Guarantor"; }
  else if (riskScore >= 40) { level = "medium"; recommendation = "Approve with Conditions"; }

  return { score: riskScore, level, drivers, recommendation }
}
