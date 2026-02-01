// Client-side state management using SWR
// This acts as our data layer for the demo

import {
  users as seedUsers,
  transactions as seedTransactions,
  events as seedEvents,
  goals as seedGoals,
  customEvents as seedCustomEvents,
  customStressTemplates as seedCustomStressTemplates,
  auditLogs as seedAuditLogs,
  advisors as seedAdvisors,
  seedLoans,
  seedMonthlyObligations,
  type User,
  type Transaction,
  type LifeEvent,
  type Goal,
  type CustomEvent,
  type CustomStressTemplate,
  type UserDistribution,
  type AuditLog,
  type Advisor,
  type Loan,
  type LoanStatus,
  type MonthlyObligation,
  calculateMonthlyPayment,
  generatePaymentSchedule,
  AUTO_APPROVAL_THRESHOLD,
  DEFAULT_SEASONAL_MULTIPLIERS,
  EVENT_TEMPLATES,
} from "./seed-data"

// In-memory store (simulates backend)
let store = {
  users: [...seedUsers],
  transactions: [...seedTransactions],
  events: [...seedEvents],
  goals: [...seedGoals],
  customEvents: [...seedCustomEvents],
  customStressTemplates: [...seedCustomStressTemplates],
  userDistributions: [] as UserDistribution[],
  auditLogs: [...seedAuditLogs],
  advisors: [...seedAdvisors],
  loans: [...seedLoans],
  monthlyObligations: [...seedMonthlyObligations],
}

// Reset store to seed data
export function resetStore() {
  store = {
    users: [...seedUsers],
    transactions: [...seedTransactions],
    events: [...seedEvents],
    goals: [...seedGoals],
    customEvents: [...seedCustomEvents],
    customStressTemplates: [...seedCustomStressTemplates],
    userDistributions: [] as UserDistribution[],
    auditLogs: [...seedAuditLogs],
    advisors: [...seedAdvisors],
    loans: [...seedLoans],
    monthlyObligations: [...seedMonthlyObligations],
  }
}

// User operations
export function getUsers(): User[] {
  return store.users
}

export function getUserById(id: string): User | undefined {
  return store.users.find((u) => u.id === id)
}

export function updateUserConsent(userId: string, consent: boolean): User | undefined {
  const user = store.users.find((u) => u.id === userId)
  if (user) {
    user.hasConsented = consent
  }
  return user
}

// Transaction operations
export function getTransactionsByUser(userId: string): Transaction[] {
  return store.transactions.filter((t) => t.userId === userId)
}

// Event operations
export function getEvents(): LifeEvent[] {
  return store.events
}

export function getEventById(id: string): LifeEvent | undefined {
  return store.events.find((e) => e.id === id)
}

export function getAnyEventById(id: string): LifeEvent | CustomEvent | undefined {
  const builtIn = store.events.find((e) => e.id === id)
  if (builtIn) return builtIn
  return store.customEvents.find((e) => e.id === id)
}

export function updateLifeEvent(
  eventId: string,
  updates: Partial<LifeEvent>
): LifeEvent | undefined {
  const event = store.events.find((e) => e.id === eventId)
  if (event) {
    Object.assign(event, updates)
  }
  return event
}

// Custom Event operations
export function getCustomEventsByUser(userId: string): CustomEvent[] {
  return store.customEvents.filter((e) => e.userId === userId)
}

export function getAllEventsForUser(userId: string): (LifeEvent | CustomEvent)[] {
  const builtInEvents = store.events
  const userCustomEvents = store.customEvents.filter((e) => e.userId === userId)
  return [...builtInEvents, ...userCustomEvents]
}

// Monthly Obligation operations
export function getMonthlyObligationsByUser(userId: string): MonthlyObligation[] {
  return store.monthlyObligations.filter((o) => o.userId === userId)
}

export function createCustomEvent(
  event: Omit<CustomEvent, "id" | "createdAt">
): CustomEvent {
  const newEvent: CustomEvent = {
    ...event,
    distributionType: event.distributionType || "normal",
    id: `custom_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  store.customEvents.push(newEvent)
  return newEvent
}

export function updateCustomEvent(
  eventId: string,
  updates: Partial<CustomEvent>
): CustomEvent | undefined {
  const event = store.customEvents.find((e) => e.id === eventId)
  if (event) {
    Object.assign(event, updates)
  }
  return event
}

export function deleteCustomEvent(eventId: string): boolean {
  const index = store.customEvents.findIndex((e) => e.id === eventId)
  if (index !== -1) {
    store.customEvents.splice(index, 1)
    return true
  }
  return false
}

// Goal operations
export function getGoalsByUser(userId: string): Goal[] {
  return store.goals.filter((g) => g.userId === userId)
}

export function createGoal(
  goal: Omit<Goal, "id" | "createdAt" | "currentAmount" | "status">
): Goal {
  const newGoal: Goal = {
    ...goal,
    id: `goal_${Date.now()}`,
    currentAmount: 0,
    status: "active",
    createdAt: new Date().toISOString(),
  }
  store.goals.push(newGoal)
  return newGoal
}

export function deleteGoal(goalId: string): boolean {
  const index = store.goals.findIndex((g) => g.id === goalId)
  if (index !== -1) {
    store.goals.splice(index, 1)
    return true
  }
  return false
}

export function updateGoal(
  goalId: string,
  updates: Partial<Goal>
): Goal | undefined {
  const goal = store.goals.find((g) => g.id === goalId)
  if (goal) {
    Object.assign(goal, updates)
  }
  return goal
}

// Audit log operations
export function getAuditLogs(): AuditLog[] {
  return store.auditLogs
}

export function createAuditLog(
  log: Omit<AuditLog, "id" | "timestamp">
): AuditLog {
  const newLog: AuditLog = {
    ...log,
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
  }
  store.auditLogs.push(newLog)
  return newLog
}

// Advisor operations
export function getAdvisors(): Advisor[] {
  return store.advisors
}

export function getAdvisorById(id: string): Advisor | undefined {
  return store.advisors.find((a) => a.id === id)
}

// User Distribution operations (computed from transaction history)
export function getUserDistributions(userId: string): UserDistribution[] {
  return store.userDistributions.filter((d) => d.userId === userId)
}

export function computeUserDistributions(userId: string): UserDistribution[] {
  const transactions = getTransactionsByUser(userId)
  const distributions: UserDistribution[] = []

  // Group transactions by category
  const categoryGroups: Record<string, Transaction[]> = {}
  transactions.forEach((t) => {
    if (!categoryGroups[t.category]) {
      categoryGroups[t.category] = []
    }
    categoryGroups[t.category].push(t)
  })

  // Compute stats for each category
  Object.entries(categoryGroups).forEach(([category, txns]) => {
    const amounts = txns.map((t) => Math.abs(t.amount))
    const n = amounts.length

    if (n === 0) return

    // Mean
    const mean = amounts.reduce((a, b) => a + b, 0) / n

    // Median
    const sorted = [...amounts].sort((a, b) => a - b)
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]

    // Standard deviation
    const variance = amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n
    const std = Math.sqrt(variance)

    // Seasonality: compute average by month
    const monthlyTotals: Record<number, number[]> = {}
    txns.forEach((t) => {
      const month = new Date(t.date).getMonth()
      if (!monthlyTotals[month]) monthlyTotals[month] = []
      monthlyTotals[month].push(Math.abs(t.amount))
    })

    const seasonality: Record<number, number> = {}
    Object.entries(monthlyTotals).forEach(([m, vals]) => {
      const monthAvg = vals.reduce((a, b) => a + b, 0) / vals.length
      seasonality[parseInt(m)] = mean > 0 ? monthAvg / mean : 1
    })

    // Remove existing distribution for this user/category
    const existingIndex = store.userDistributions.findIndex(
      (d) => d.userId === userId && d.category === category
    )
    if (existingIndex !== -1) {
      store.userDistributions.splice(existingIndex, 1)
    }

    const distribution: UserDistribution = {
      userId,
      category,
      mean: Math.round(mean),
      std: Math.round(std),
      median: Math.round(median),
      seasonality,
      sampleSize: n,
      isReliable: n >= 6,
      lastUpdated: new Date().toISOString(),
    }

    store.userDistributions.push(distribution)
    distributions.push(distribution)
  })

  return distributions
}

// Custom Stress Template operations
export function getCustomStressTemplates(userId: string): CustomStressTemplate[] {
  return store.customStressTemplates.filter((t) => t.userId === userId)
}

export function createCustomStressTemplate(
  template: Omit<CustomStressTemplate, "id" | "createdAt">
): CustomStressTemplate {
  const newTemplate: CustomStressTemplate = {
    ...template,
    id: `template_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  store.customStressTemplates.push(newTemplate)
  return newTemplate
}

export function deleteCustomStressTemplate(templateId: string): boolean {
  const index = store.customStressTemplates.findIndex((t) => t.id === templateId)
  if (index !== -1) {
    store.customStressTemplates.splice(index, 1)
    return true
  }
  return false
}

// Micro-loan operations
export interface MicroLoanRequest {
  id: string
  userId: string
  amount: number
  reason: string
  eventId?: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  advisorComment?: string
}

let loanRequests: MicroLoanRequest[] = []

export function getMicroLoanRequests(): MicroLoanRequest[] {
  return loanRequests
}

export function getMicroLoanRequestsByUser(userId: string): MicroLoanRequest[] {
  return loanRequests.filter((r) => r.userId === userId)
}

export function createMicroLoanRequest(
  request: Omit<MicroLoanRequest, "id" | "createdAt" | "status">
): MicroLoanRequest {
  const newRequest: MicroLoanRequest = {
    ...request,
    id: `loan_${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  loanRequests.push(newRequest)
  return newRequest
}

export function updateMicroLoanRequest(
  requestId: string,
  updates: Partial<MicroLoanRequest>
): MicroLoanRequest | undefined {
  const request = loanRequests.find((r) => r.id === requestId)
  if (request) {
    Object.assign(request, updates)
  }
  return request
}

// ============== LOAN OPERATIONS ==============

// Get all loans for a user
export function getLoansByUser(userId: string): Loan[] {
  return store.loans.filter((l) => l.userId === userId)
}

// Get active loans (approved and not completed)
export function getActiveLoans(userId: string): Loan[] {
  return store.loans.filter(
    (l) =>
      l.userId === userId &&
      (l.status === "approved_auto" ||
        l.status === "approved_by_advisor" ||
        l.status === "active")
  )
}

// Get pending loan requests for advisors
export function getPendingLoanRequests(): Loan[] {
  return store.loans.filter((l) => l.status === "pending_advisor")
}

// Calculate eligibility for a loan
export function calculateLoanEligibility(
  userId: string,
  amount: number
): { score: number; riskFlags: string[]; canAutoApprove: boolean } {
  const user = getUserById(userId)
  if (!user) {
    return { score: 0, riskFlags: ["User not found"], canAutoApprove: false }
  }

  const transactions = getTransactionsByUser(userId)
  const riskFlags: string[] = []
  let score = 100

  // Calculate financial metrics
  const monthlyExpense = Math.abs(
    transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0) /
    Math.max(1, new Set(transactions.map((t) => t.date.substring(0, 7))).size)
  )
  const monthsOfSavings = monthlyExpense > 0 ? user.balance / monthlyExpense : 0
  const savingsRate =
    user.monthlyIncome > 0
      ? (user.monthlyIncome - monthlyExpense) / user.monthlyIncome
      : 0
  const debtToIncome = amount / (user.monthlyIncome * 12)

  // Existing loan burden
  const existingLoans = getActiveLoans(userId)
  const existingMonthlyPayments = existingLoans.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0
  )
  const totalDebtBurden =
    (existingMonthlyPayments + calculateMonthlyPayment(amount, 12, 6)) /
    user.monthlyIncome

  // Risk assessment
  if (monthsOfSavings < 0.5) {
    riskFlags.push("Low emergency buffer (< 0.5 months)")
    score -= 30
  } else if (monthsOfSavings < 1) {
    riskFlags.push("Limited emergency buffer (< 1 month)")
    score -= 15
  }

  if (savingsRate < 0) {
    riskFlags.push("Negative savings rate")
    score -= 25
  } else if (savingsRate < 0.1) {
    riskFlags.push("Low savings rate (< 10%)")
    score -= 10
  }

  if (debtToIncome > 0.3) {
    riskFlags.push("High debt-to-income ratio (> 30%)")
    score -= 20
  }

  if (totalDebtBurden > 0.4) {
    riskFlags.push("Total debt burden exceeds 40% of income")
    score -= 20
  }

  if (existingLoans.length >= 2) {
    riskFlags.push("Multiple existing loans")
    score -= 15
  }

  score = Math.max(0, Math.min(100, score))

  // Auto-approval: amount <= 500 AND no severe risk flags
  const hasSevereRisk = monthsOfSavings < 0.5 || savingsRate < 0 || totalDebtBurden > 0.5
  const canAutoApprove = amount <= AUTO_APPROVAL_THRESHOLD && !hasSevereRisk

  return { score, riskFlags, canAutoApprove }
}

// Create a loan request
export interface CreateLoanInput {
  userId: string
  amount: number
  termMonths: number
  annualInterestRate: number
  purpose: string
  eventId?: string
}

export function createLoanRequest(input: CreateLoanInput): {
  loan: Loan
  autoApproved: boolean
} {
  const { userId, amount, termMonths, annualInterestRate, purpose, eventId } = input

  // Calculate eligibility
  const eligibility = calculateLoanEligibility(userId, amount)

  // Calculate payment details
  const monthlyPayment = calculateMonthlyPayment(
    amount,
    annualInterestRate,
    termMonths
  )
  const totalRepayment = Math.round(monthlyPayment * termMonths * 100) / 100

  // Generate payment schedule (will be used when approved)
  const paymentSchedule = generatePaymentSchedule(
    amount,
    annualInterestRate,
    termMonths
  )

  // Determine status based on auto-approval rules
  const autoApproved = eligibility.canAutoApprove
  const status: LoanStatus = autoApproved ? "approved_auto" : "pending_advisor"

  const loan: Loan = {
    id: `loan_${Date.now()}`,
    userId,
    amount,
    termMonths,
    annualInterestRate,
    monthlyPayment,
    totalRepayment,
    purpose,
    status,
    eventId,
    createdAt: new Date().toISOString(),
    approvedAt: autoApproved ? new Date().toISOString() : undefined,
    paymentSchedule,
    eligibilityScore: eligibility.score,
    riskFlags: eligibility.riskFlags,
  }

  store.loans.push(loan)

  // Create audit log for auto-approved loans
  if (autoApproved) {
    createAuditLog({
      userId,
      advisorId: "system",
      action: "loan_auto_approved",
      actionType: "loan",
      amount,
      comment: `Auto-approved loan of ${amount} TND for ${termMonths} months at ${annualInterestRate}% APR. Eligibility score: ${eligibility.score}`,
    })
  }

  return { loan, autoApproved }
}

// Approve a loan (by advisor)
export function approveLoan(
  loanId: string,
  advisorId: string,
  comment?: string
): Loan | undefined {
  const loan = store.loans.find((l) => l.id === loanId)
  if (!loan || loan.status !== "pending_advisor") return undefined

  loan.status = "approved_by_advisor"
  loan.approvedAt = new Date().toISOString()
  loan.advisorId = advisorId
  loan.advisorComment = comment

  // Regenerate payment schedule from approval date
  loan.paymentSchedule = generatePaymentSchedule(
    loan.amount,
    loan.annualInterestRate,
    loan.termMonths
  )

  createAuditLog({
    userId: loan.userId,
    advisorId,
    action: "loan_approved",
    actionType: "loan",
    amount: loan.amount,
    comment: comment || "Loan approved by advisor",
  })

  return loan
}

// Reject a loan (by advisor)
export function rejectLoan(
  loanId: string,
  advisorId: string,
  comment: string
): Loan | undefined {
  const loan = store.loans.find((l) => l.id === loanId)
  if (!loan || loan.status !== "pending_advisor") return undefined

  loan.status = "rejected_by_advisor"
  loan.advisorId = advisorId
  loan.advisorComment = comment

  createAuditLog({
    userId: loan.userId,
    advisorId,
    action: "loan_rejected",
    actionType: "loan",
    amount: loan.amount,
    comment,
  })

  return loan
}

// Get loan by ID
export function getLoanById(loanId: string): Loan | undefined {
  return store.loans.find((l) => l.id === loanId)
}

// Get future loan payments for projection
export function getFutureLoanPayments(
  userId: string,
  months: number = 6
): { month: string; totalPayment: number; loans: { loanId: string; payment: number }[] }[] {
  const activeLoans = getActiveLoans(userId)
  const now = new Date()
  const result: Map<string, { totalPayment: number; loans: { loanId: string; payment: number }[] }> = new Map()

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now)
    targetDate.setMonth(now.getMonth() + i + 1)
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`
    result.set(monthStr, { totalPayment: 0, loans: [] })
  }

  for (const loan of activeLoans) {
    for (const payment of loan.paymentSchedule) {
      const paymentMonth = payment.date.substring(0, 7)
      if (result.has(paymentMonth)) {
        const monthData = result.get(paymentMonth)!
        monthData.totalPayment += payment.payment
        monthData.loans.push({ loanId: loan.id, payment: payment.payment })
      }
    }
  }

  return Array.from(result.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ============== REALISTIC MONTHLY FLOW CALCULATIONS ==============

export interface MonthlyFlowBreakdown {
  month: string // YYYY-MM format
  monthIndex: number // 0-11
  // Inflows
  scheduledIncome: number
  incomeVariance: number // std for sampling
  // Fixed outflows
  fixedOutflows: number
  // Variable outflows (discretionary)
  variableOutflowMean: number
  variableOutflowStd: number
  seasonalMultiplier: number
  // Event costs
  eventCosts: Array<{
    eventId: string
    eventName: string
    mean: number
    std: number
    distributionType: "normal" | "uniform"
  }>
  totalEventMean: number
  // Loan payments
  loanPayments: Array<{
    loanId: string
    payment: number
  }>
  totalLoanPayments: number
  // Totals
  totalInflowsMean: number
  totalOutflowsMean: number
  netFlowMean: number
}

// Get user's seasonal multiplier for a given month
export function getUserSeasonalMultiplier(userId: string, monthIndex: number): number {
  const distributions = getUserDistributions(userId)
  // Check if user has custom seasonality from their transaction history
  const discretionaryDist = distributions.find(d =>
    ["food", "entertainment", "clothing", "groceries"].includes(d.category)
  )
  if (discretionaryDist?.seasonality?.[monthIndex]) {
    return discretionaryDist.seasonality[monthIndex]
  }
  // Fall back to default Tunisian seasonal patterns
  return DEFAULT_SEASONAL_MULTIPLIERS[monthIndex] || 1.0
}

// Get events affecting a specific month for a user
export function getEventsForMonth(
  userId: string,
  monthStr: string
): Array<{ event: LifeEvent | CustomEvent; isCustom: boolean }> {
  const result: Array<{ event: LifeEvent | CustomEvent; isCustom: boolean }> = []

  // Check built-in events
  for (const event of store.events) {
    const eventStartMonth = event.startDate.substring(0, 7)
    const eventEndMonth = event.endDate.substring(0, 7)
    if (monthStr >= eventStartMonth && monthStr <= eventEndMonth) {
      result.push({ event, isCustom: false })
    }
  }

  // Check custom events
  const customEvents = getCustomEventsByUser(userId)
  for (const event of customEvents) {
    const eventStartMonth = event.startDate.substring(0, 7)
    const eventEndMonth = event.endDate.substring(0, 7)
    if (monthStr >= eventStartMonth && monthStr <= eventEndMonth) {
      result.push({ event, isCustom: true })
    }
  }

  return result
}

// Calculate detailed monthly flow breakdown for projection
export function calculateMonthlyFlowBreakdown(
  userId: string,
  months: number = 6
): MonthlyFlowBreakdown[] {
  const user = getUserById(userId)
  if (!user) return []

  const now = new Date()
  const result: MonthlyFlowBreakdown[] = []
  const loanPayments = getFutureLoanPayments(userId, months)

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now)
    targetDate.setMonth(now.getMonth() + i + 1)
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`
    const monthIndex = targetDate.getMonth()

    // Calculate income (with variance for irregular earners)
    const incomeVariance = user.salaryFrequency === "irregular"
      ? user.monthlyIncome * 0.25 // 25% variance for irregular
      : user.monthlyIncome * 0.05 // 5% variance for regular

    // Get seasonal multiplier for this month
    const seasonalMultiplier = getUserSeasonalMultiplier(userId, monthIndex)

    // Calculate variable outflows with seasonality
    const variableOutflowMean = user.avgVariableOutflows * seasonalMultiplier
    const variableOutflowStd = variableOutflowMean * (user.variableStdPct / 100)

    // Get events for this month
    const monthEvents = getEventsForMonth(userId, monthStr)
    const eventCosts = monthEvents.map(({ event }) => {
      // Use the actual event's estimated cost and std
      // This allows for per-event customization (Ramadan cost for Ahmed vs Fatma)
      return {
        eventId: event.id,
        eventName: event.name,
        mean: event.estimatedCost,
        std: event.costStd,
        distributionType: ('distributionType' in event ? event.distributionType : 'normal') as "normal" | "uniform",
      }
    })
    const totalEventMean = eventCosts.reduce((sum, e) => sum + e.mean, 0)

    // Get loan payments for this month
    const monthLoanData = loanPayments.find(lp => lp.month === monthStr)
    const loanPaymentsList = monthLoanData?.loans || []
    const totalLoanPayments = monthLoanData?.totalPayment || 0

    // Calculate totals
    const totalInflowsMean = user.monthlyIncome
    const totalOutflowsMean = user.fixedMonthlyOutflows + variableOutflowMean + totalEventMean + totalLoanPayments

    result.push({
      month: monthStr,
      monthIndex,
      scheduledIncome: user.monthlyIncome,
      incomeVariance,
      fixedOutflows: user.fixedMonthlyOutflows,
      variableOutflowMean,
      variableOutflowStd,
      seasonalMultiplier,
      eventCosts,
      totalEventMean,
      loanPayments: loanPaymentsList,
      totalLoanPayments,
      totalInflowsMean,
      totalOutflowsMean,
      netFlowMean: totalInflowsMean - totalOutflowsMean,
    })
  }

  return result
}

// Generate explanation for a month's projection
export function generateMonthExplanation(
  breakdown: MonthlyFlowBreakdown,
  user: User
): { text: string; drivers: { name: string; contribution: number }[]; confidence: "low" | "medium" | "high" } {
  const drivers: { name: string; contribution: number }[] = []
  const explanationParts: string[] = []

  // Income driver
  drivers.push({ name: "Income", contribution: breakdown.scheduledIncome })

  // Fixed outflows
  if (breakdown.fixedOutflows > 0) {
    drivers.push({ name: "Fixed expenses (rent, utilities)", contribution: -breakdown.fixedOutflows })
  }

  // Variable outflows with seasonal context
  const seasonalNote = breakdown.seasonalMultiplier > 1.1
    ? ` (${((breakdown.seasonalMultiplier - 1) * 100).toFixed(0)}% seasonal increase)`
    : ""
  drivers.push({ name: `Discretionary spending${seasonalNote}`, contribution: -breakdown.variableOutflowMean })

  // Events
  for (const event of breakdown.eventCosts) {
    drivers.push({ name: event.eventName, contribution: -event.mean })
    explanationParts.push(
      `${event.eventName} is expected to cost ${event.mean.toLocaleString()} TND (±${event.std.toLocaleString()}).`
    )
  }

  // Loans
  if (breakdown.totalLoanPayments > 0) {
    drivers.push({ name: "Loan payments", contribution: -breakdown.totalLoanPayments })
    explanationParts.push(
      `You have ${breakdown.loanPayments.length} loan payment(s) totaling ${breakdown.totalLoanPayments.toFixed(0)} TND.`
    )
  }

  // Calculate confidence based on variability
  const totalVariance = breakdown.incomeVariance + breakdown.variableOutflowStd +
    breakdown.eventCosts.reduce((sum, e) => sum + e.std, 0)
  const coefficientOfVariation = totalVariance / Math.abs(breakdown.netFlowMean || 1)
  const confidence: "low" | "medium" | "high" =
    coefficientOfVariation > 0.5 ? "low" : coefficientOfVariation > 0.25 ? "medium" : "high"

  // Build main text
  let text = `For ${new Date(breakdown.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}, `
  text += `we project income of ${breakdown.scheduledIncome.toLocaleString()} TND `
  text += `and total outflows of ${breakdown.totalOutflowsMean.toFixed(0)} TND. `
  if (explanationParts.length > 0) {
    text += explanationParts.join(" ")
  }

  return { text, drivers, confidence }
}

// Get all pending actions for advisors
export interface AdvisorAction {
  type: "goal" | "loan"
  id: string
  userId: string
  userName: string
  userType: User["type"]
  amount: number
  description: string
  eventName?: string
  riskLevel: "low" | "medium" | "high"
  createdAt: string
}

export function getPendingAdvisorActions(): AdvisorAction[] {
  const actions: AdvisorAction[] = []

  // Pending goals needing approval (for amounts > 500 TND)
  store.goals
    .filter((g) => !g.advisorApproved && g.status === "active")
    .forEach((goal) => {
      const user = getUserById(goal.userId)
      const event = goal.eventId ? getEventById(goal.eventId) : undefined
      if (user && goal.targetAmount >= 500) {
        actions.push({
          type: "goal",
          id: goal.id,
          userId: goal.userId,
          userName: user.name,
          userType: user.type,
          amount: goal.targetAmount,
          description: `Savings goal: ${goal.monthlyContribution} TND/month`,
          eventName: event?.name,
          riskLevel:
            goal.monthlyContribution > user.monthlyIncome * 0.3
              ? "high"
              : goal.monthlyContribution > user.monthlyIncome * 0.15
                ? "medium"
                : "low",
          createdAt: goal.createdAt,
        })
      }
    })

  // Pending loan requests (old micro-loans)
  loanRequests
    .filter((r) => r.status === "pending")
    .forEach((request) => {
      const user = getUserById(request.userId)
      const event = request.eventId ? getEventById(request.eventId) : undefined
      if (user) {
        actions.push({
          type: "loan",
          id: request.id,
          userId: request.userId,
          userName: user.name,
          userType: user.type,
          amount: request.amount,
          description: request.reason,
          eventName: event?.name,
          riskLevel:
            request.amount > user.monthlyIncome
              ? "high"
              : request.amount > user.monthlyIncome * 0.5
                ? "medium"
                : "low",
          createdAt: request.createdAt,
        })
      }
    })

  // Pending loan requests (new loans with amortization)
  store.loans
    .filter((l) => l.status === "pending_advisor")
    .forEach((loan) => {
      const user = getUserById(loan.userId)
      if (user) {
        const riskLevel = loan.eligibilityScore >= 70 ? "low" : loan.eligibilityScore >= 40 ? "medium" : "high"
        actions.push({
          type: "loan",
          id: loan.id,
          userId: loan.userId,
          userName: user.name,
          userType: user.type,
          amount: loan.amount,
          description: `Loan: ${loan.purpose} - ${loan.termMonths} months at ${loan.annualInterestRate}% APR (${loan.monthlyPayment.toFixed(0)} TND/mo)`,
          riskLevel,
          createdAt: loan.createdAt,
        })
      }
    })

  // Sort by risk level and creation date
  return actions.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 }
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export { Loan }
