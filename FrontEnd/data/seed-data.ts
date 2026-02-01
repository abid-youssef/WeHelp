// Seed data for ATB Life-Companion Digital Twin
// All amounts in TND (Tunisian Dinar)

export interface User {
  id: string
  name: string
  type: "student" | "salaried" | "freelancer" | "family" | "entrepreneur"
  balance: number
  monthlyIncome: number
  hasConsented: boolean
  createdAt: string
  // Enhanced financial profile for realistic projections
  salaryDayOfMonth: number // Day salary is received (e.g., 25)
  salaryFrequency: "monthly" | "biweekly" | "irregular" // How often income arrives
  fixedMonthlyOutflows: number // Rent, utilities, subscriptions
  avgVariableOutflows: number // Discretionary spending average
  variableStdPct: number // Standard deviation as % of variable spending
}

export interface Transaction {
  id: string
  userId: string
  date: string
  amount: number
  category: string
  description: string
  eventTag?: string
}

export interface LifeEvent {
  id: string
  name: string
  nameAr: string
  startDate: string
  endDate: string
  multiplier: number
  categories: string[]
  estimatedCost: number
  costStd: number // Standard deviation for Monte Carlo sampling
  icon: string
  consultationRequested?: boolean
}

export interface Goal {
  id: string
  userId: string
  name: string
  eventId?: string // Optional link to event
  targetAmount: number
  targetDate: string
  currentAmount: number
  monthlyContribution: number
  autoSaveEnabled: boolean
  priority: "high" | "medium" | "low"
  status: "active" | "completed" | "cancelled"
  createdAt: string
  advisorApproved?: boolean
  advisorId?: string
}

// User-created custom events
export interface CustomEvent {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string
  estimatedCost: number
  costStd: number // User-provided error margin (standard deviation)
  errorPct?: number // Alternative: error as percentage (converts to std = mean * pct/100)
  distributionType: "normal" | "uniform" // Default: normal
  category: string
  isPrivate: boolean
  linkedGoalId?: string
  recurrence?: "none" | "yearly" | "monthly"
  createdAt: string
  // Explanation for display
  explanation?: {
    text: string
    drivers: { name: string; contribution: number }[]
    assumptions: string[]
    confidence: "low" | "medium" | "high"
  }
  consultationRequested?: boolean
}

// User-calibrated distribution stats (computed from transaction history)
export interface UserDistribution {
  userId: string
  category: string
  mean: number
  std: number
  median: number
  seasonality: Record<number, number> // month (0-11) -> multiplier
  sampleSize: number
  isReliable: boolean // true if sampleSize >= 6
  lastUpdated: string
}

// Custom stress scenario template
export interface CustomStressTemplate {
  id: string
  userId: string
  name: string
  description: string
  incomeMultiplier: number
  expenseMultiplier: number
  oneOffCost: number
  duration: number
  correlatedExpenseReduction: number // 0-1: how much discretionary spending drops when income drops
  shockProbability: number // probability of shock occurring in simulation
  createdAt: string
}

export interface MonthlyObligation {
  id: string
  userId: string
  name: string
  amount: number
  dueDate: number // Day of month (1-31)
  category: "utility" | "rent" | "subscription" | "debt" | "other"
  status: "active" | "paused"
  lastPaidDate?: string
}

export interface AuditLog {
  id: string
  userId: string
  advisorId: string
  action: "approve" | "reject" | "modify" | "loan_auto_approved" | "loan_approved" | "loan_rejected"
  actionType: "savings" | "micro_loan" | "loan"
  amount: number
  comment: string
  timestamp: string
}

// Loan types with amortization support
export type LoanStatus = "pending_advisor" | "approved_auto" | "approved_by_advisor" | "rejected_by_advisor" | "active" | "completed"

export interface Loan {
  id: string
  userId: string
  amount: number
  termMonths: number
  annualInterestRate: number
  monthlyPayment: number
  totalRepayment: number
  purpose: string
  status: LoanStatus
  createdAt: string
  approvedAt?: string
  eventId?: string
  advisorId?: string
  advisorComment?: string
  // Payment schedule
  paymentSchedule: LoanPayment[]
  // Risk assessment
  eligibilityScore: number
  riskFlags: string[]
}

export interface LoanPayment {
  month: number
  date: string
  principal: number
  interest: number
  payment: number
  remainingBalance: number
}

// Loan purpose options
export const LOAN_PURPOSES = [
  { value: "emergency", label: "Emergency Expenses" },
  { value: "medical", label: "Medical Bills" },
  { value: "education", label: "Education" },
  { value: "home_repair", label: "Home Repair" },
  { value: "vehicle", label: "Vehicle" },
  { value: "event", label: "Life Event (Wedding, etc.)" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
]

// Default loan product rate
export const DEFAULT_LOAN_RATE = 12 // 12% annual rate

// Auto-approval threshold
export const AUTO_APPROVAL_THRESHOLD = 500 // TND

// Seasonal multipliers by month (0-11) for Tunisian context
// These affect discretionary spending based on cultural/seasonal patterns
export const DEFAULT_SEASONAL_MULTIPLIERS: Record<number, number> = {
  0: 1.0,   // January - normal
  1: 1.1,   // February - Ramadan prep (varies by year)
  2: 1.25,  // March - Ramadan spending peak
  3: 1.15,  // April - post-Ramadan, Eid
  4: 1.2,   // May - Eid al-Adha (varies)
  5: 1.1,   // June - summer starts
  6: 1.3,   // July - summer vacation peak
  7: 1.25,  // August - summer + back-to-school prep
  8: 1.4,   // September - back-to-school peak
  9: 1.0,   // October - normal
  10: 1.0,  // November - normal
  11: 1.1,  // December - year-end expenses
}

// Event templates with default costs by user type
export interface EventTemplate {
  id: string
  name: string
  nameAr: string
  defaultCosts: Record<User["type"], { mean: number; std: number }>
  category: string
  seasonalMonth?: number // Primary month this affects (0-11)
  icon: string
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "ramadan",
    name: "Ramadan",
    nameAr: "رمضان",
    defaultCosts: {
      student: { mean: 200, std: 50 },
      salaried: { mean: 600, std: 150 },
      freelancer: { mean: 500, std: 130 },
      family: { mean: 800, std: 200 },
      entrepreneur: { mean: 700, std: 180 },
    },
    category: "holiday",
    seasonalMonth: 2, // March for 2026
    icon: "moon",
  },
  {
    id: "eid_fitr",
    name: "Eid al-Fitr",
    nameAr: "عيد الفطر",
    defaultCosts: {
      student: { mean: 150, std: 40 },
      salaried: { mean: 500, std: 125 },
      freelancer: { mean: 400, std: 100 },
      family: { mean: 600, std: 150 },
      entrepreneur: { mean: 550, std: 140 },
    },
    category: "holiday",
    seasonalMonth: 3, // April for 2026
    icon: "gift",
  },
  {
    id: "eid_adha",
    name: "Eid al-Adha",
    nameAr: "عيد الأضحى",
    defaultCosts: {
      student: { mean: 300, std: 80 },
      salaried: { mean: 1000, std: 300 },
      freelancer: { mean: 800, std: 250 },
      family: { mean: 1200, std: 350 },
      entrepreneur: { mean: 1100, std: 300 },
    },
    category: "holiday",
    seasonalMonth: 5, // June for 2026
    icon: "sheep",
  },
  {
    id: "summer_vacation",
    name: "Summer Vacation",
    nameAr: "العطلة الصيفية",
    defaultCosts: {
      student: { mean: 400, std: 150 },
      salaried: { mean: 1200, std: 400 },
      freelancer: { mean: 1000, std: 350 },
      family: { mean: 1500, std: 500 },
      entrepreneur: { mean: 1400, std: 450 },
    },
    category: "travel",
    seasonalMonth: 7, // August
    icon: "sun",
  },
  {
    id: "back_to_school",
    name: "Back to School",
    nameAr: "العودة المدرسية",
    defaultCosts: {
      student: { mean: 300, std: 80 },
      salaried: { mean: 600, std: 180 },
      freelancer: { mean: 500, std: 150 },
      family: { mean: 900, std: 250 },
      entrepreneur: { mean: 700, std: 200 },
    },
    category: "education",
    seasonalMonth: 8, // September
    icon: "book",
  },
]

// Helper: Calculate monthly payment using amortization formula
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / termMonths
  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  return Math.round(payment * 100) / 100 // Round to 2 decimals
}

// Helper: Generate full amortization schedule
export function generatePaymentSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date = new Date()
): LoanPayment[] {
  const monthlyRate = annualRate / 100 / 12
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths)
  const schedule: LoanPayment[] = []
  let remainingBalance = principal

  for (let month = 1; month <= termMonths; month++) {
    const paymentDate = new Date(startDate)
    paymentDate.setMonth(paymentDate.getMonth() + month)

    const interest = Math.round(remainingBalance * monthlyRate * 100) / 100
    const principalPayment = Math.round((monthlyPayment - interest) * 100) / 100
    remainingBalance = Math.max(0, Math.round((remainingBalance - principalPayment) * 100) / 100)

    // Adjust last payment to account for rounding
    if (month === termMonths && remainingBalance > 0) {
      remainingBalance = 0
    }

    schedule.push({
      month,
      date: paymentDate.toISOString().split("T")[0],
      principal: principalPayment,
      interest,
      payment: monthlyPayment,
      remainingBalance,
    })
  }

  return schedule
}

export interface Advisor {
  id: string
  name: string
  branch: string
}

// Demo users representing different financial profiles
export const users: User[] = [
  {
    id: "user_1",
    name: "Ahmed Ben Ali",
    type: "student",
    balance: 850,
    monthlyIncome: 400,
    hasConsented: true,
    createdAt: "2025-06-01",
    salaryDayOfMonth: 5, // Allowance on 5th
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 150, // Transport, phone
    avgVariableOutflows: 180,
    variableStdPct: 25,
  },
  {
    id: "user_2",
    name: "Fatma Trabelsi",
    type: "salaried",
    balance: 4200,
    monthlyIncome: 2100,
    hasConsented: true,
    createdAt: "2024-01-15",
    salaryDayOfMonth: 25,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 800, // Rent, utilities
    avgVariableOutflows: 900,
    variableStdPct: 20,
  },
  {
    id: "user_3",
    name: "Karim Hammami",
    type: "freelancer",
    balance: 2800,
    monthlyIncome: 1800,
    hasConsented: true,
    createdAt: "2024-03-20",
    salaryDayOfMonth: 15, // Payments around mid-month
    salaryFrequency: "irregular",
    fixedMonthlyOutflows: 600,
    avgVariableOutflows: 750,
    variableStdPct: 35, // Higher variability for freelancer
  },
  {
    id: "user_4",
    name: "Nadia & Mehdi Bouazizi",
    type: "family",
    balance: 6500,
    monthlyIncome: 3500,
    hasConsented: true,
    createdAt: "2023-09-01",
    salaryDayOfMonth: 28,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 1400, // Mortgage, utilities, insurance
    avgVariableOutflows: 1500,
    variableStdPct: 22,
  },
  {
    id: "user_5",
    name: "Youssef Gharbi",
    type: "entrepreneur",
    balance: 12000,
    monthlyIncome: 5000,
    hasConsented: true,
    createdAt: "2024-06-10",
    salaryDayOfMonth: 10,
    salaryFrequency: "irregular",
    fixedMonthlyOutflows: 1800,
    avgVariableOutflows: 2200,
    variableStdPct: 40, // High variability for entrepreneur
  },
  {
    id: "user_6",
    name: "Leila Mansour",
    type: "salaried",
    balance: 1200,
    monthlyIncome: 1600,
    hasConsented: true,
    createdAt: "2024-11-01",
    salaryDayOfMonth: 25,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 650,
    avgVariableOutflows: 700,
    variableStdPct: 18,
  },
  {
    id: "user_7",
    name: "Sami Khlifi",
    type: "student",
    balance: 320,
    monthlyIncome: 300,
    hasConsented: true,
    createdAt: "2025-09-01",
    salaryDayOfMonth: 1,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 100,
    avgVariableOutflows: 150,
    variableStdPct: 30,
  },
  {
    id: "user_8",
    name: "Amira Jaziri",
    type: "freelancer",
    balance: 3500,
    monthlyIncome: 2200,
    hasConsented: true,
    createdAt: "2024-07-15",
    salaryDayOfMonth: 20,
    salaryFrequency: "irregular",
    fixedMonthlyOutflows: 750,
    avgVariableOutflows: 950,
    variableStdPct: 32,
  },
  {
    id: "user_9",
    name: "Rachid Belhaj",
    type: "salaried",
    balance: 2100,
    monthlyIncome: 1900,
    hasConsented: true,
    createdAt: "2024-08-01",
    salaryDayOfMonth: 27,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 700,
    avgVariableOutflows: 850,
    variableStdPct: 20,
  },
  {
    id: "user_10",
    name: "Souad & Omar Cherni",
    type: "family",
    balance: 4800,
    monthlyIncome: 4200,
    hasConsented: true,
    createdAt: "2024-02-15",
    salaryDayOfMonth: 25,
    salaryFrequency: "monthly",
    fixedMonthlyOutflows: 1600,
    avgVariableOutflows: 1800,
    variableStdPct: 24,
  },
]

// Life events calendar for Tunisia
// costStd represents standard deviation for Monte Carlo sampling
export const events: LifeEvent[] = [
  {
    id: "ramadan_2026",
    name: "Ramadan",
    nameAr: "رمضان",
    startDate: "2026-02-17",
    endDate: "2026-03-18",
    multiplier: 1.4,
    categories: ["groceries", "charity", "food"],
    estimatedCost: 800,
    costStd: 200,
    icon: "moon",
  },
  {
    id: "eid_fitr_2026",
    name: "Eid al-Fitr",
    nameAr: "عيد الفطر",
    startDate: "2026-03-19",
    endDate: "2026-03-22",
    multiplier: 2.0,
    categories: ["clothing", "gifts", "food", "entertainment"],
    estimatedCost: 600,
    costStd: 150,
    icon: "gift",
  },
  {
    id: "eid_adha_2026",
    name: "Eid al-Adha",
    nameAr: "عيد الأضحى",
    startDate: "2026-05-26",
    endDate: "2026-05-29",
    multiplier: 2.5,
    categories: ["sacrifice", "gifts", "food", "travel"],
    estimatedCost: 1200,
    costStd: 350,
    icon: "sheep",
  },
  {
    id: "summer_2026",
    name: "Summer Vacation",
    nameAr: "العطلة الصيفية",
    startDate: "2026-06-15",
    endDate: "2026-08-31",
    multiplier: 1.3,
    categories: ["travel", "entertainment", "clothing"],
    estimatedCost: 1500,
    costStd: 500,
    icon: "sun",
  },
  {
    id: "back_to_school_2026",
    name: "Back to School",
    nameAr: "العودة المدرسية",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    multiplier: 1.8,
    categories: ["education", "clothing", "supplies"],
    estimatedCost: 900,
    costStd: 250,
    icon: "book",
  },
]

// Generate transactions for a user
function generateTransactions(user: User): Transaction[] {
  const transactions: Transaction[] = []
  const categories = {
    income: ["salary", "freelance", "allowance", "business"],
    expense: [
      "groceries",
      "utilities",
      "transport",
      "entertainment",
      "clothing",
      "food",
      "education",
      "healthcare",
      "rent",
    ],
  }

  // Generate 12 months of transaction history
  const startDate = new Date("2025-02-01")
  let txId = 1

  for (let month = 0; month < 12; month++) {
    const currentMonth = new Date(startDate)
    currentMonth.setMonth(startDate.getMonth() + month)

    // Monthly income
    const incomeCategory =
      user.type === "student"
        ? "allowance"
        : user.type === "entrepreneur"
          ? "business"
          : user.type === "freelancer"
            ? "freelance"
            : "salary"

    transactions.push({
      id: `tx_${user.id}_${txId++}`,
      userId: user.id,
      date: new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        5
      ).toISOString(),
      amount: user.monthlyIncome * (0.9 + Math.random() * 0.2),
      category: incomeCategory,
      description: `Monthly ${incomeCategory}`,
    })

    // Generate 8-15 expense transactions per month
    const numExpenses = 8 + Math.floor(Math.random() * 8)
    for (let i = 0; i < numExpenses; i++) {
      const day = 1 + Math.floor(Math.random() * 28)
      const category =
        categories.expense[Math.floor(Math.random() * categories.expense.length)]
      const baseAmount = getBaseAmount(category, user.type)

      // Check if this month overlaps with any event
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`
      const eventTag = getEventTag(monthStr, category)

      transactions.push({
        id: `tx_${user.id}_${txId++}`,
        userId: user.id,
        date: new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          day
        ).toISOString(),
        amount: -baseAmount * (0.7 + Math.random() * 0.6),
        category,
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} expense`,
        eventTag,
      })
    }
  }

  return transactions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

function getBaseAmount(
  category: string,
  userType: User["type"]
): number {
  const multiplier =
    userType === "student"
      ? 0.4
      : userType === "family"
        ? 1.5
        : userType === "entrepreneur"
          ? 1.3
          : 1

  const baseAmounts: Record<string, number> = {
    groceries: 150,
    utilities: 80,
    transport: 60,
    entertainment: 50,
    clothing: 100,
    food: 40,
    education: 120,
    healthcare: 70,
    rent: 400,
  }

  return (baseAmounts[category] || 50) * multiplier
}

function getEventTag(monthStr: string, category: string): string | undefined {
  for (const event of events) {
    const eventStart = event.startDate.substring(0, 7)
    const eventEnd = event.endDate.substring(0, 7)
    if (
      monthStr >= eventStart &&
      monthStr <= eventEnd &&
      event.categories.includes(category)
    ) {
      return event.id
    }
  }
  return undefined
}

// Generate all transactions
export const transactions: Transaction[] = users.flatMap(generateTransactions)

// Sample goals for demo users
export const goals: Goal[] = [
  {
    id: "goal_1",
    userId: "user_4",
    name: "Wedding Fund",
    eventId: undefined,
    targetAmount: 15000,
    targetDate: "2026-09-15",
    currentAmount: 4500,
    monthlyContribution: 800,
    autoSaveEnabled: true,
    priority: "high",
    status: "active",
    createdAt: "2025-06-01",
    advisorApproved: true,
    advisorId: "advisor_1",
  },
  {
    id: "goal_2",
    userId: "user_4",
    name: "Car Down Payment",
    eventId: undefined,
    targetAmount: 8000,
    targetDate: "2027-03-01",
    currentAmount: 1200,
    monthlyContribution: 300,
    autoSaveEnabled: true,
    priority: "medium",
    status: "active",
    createdAt: "2025-08-01",
    advisorApproved: false,
  },
  {
    id: "goal_3",
    userId: "user_2",
    name: "Emergency Fund",
    eventId: undefined,
    targetAmount: 5000,
    targetDate: "2026-12-31",
    currentAmount: 2100,
    monthlyContribution: 200,
    autoSaveEnabled: true,
    priority: "high",
    status: "active",
    createdAt: "2025-01-15",
    advisorApproved: true,
    advisorId: "advisor_2",
  },
  {
    id: "goal_4",
    userId: "user_5",
    name: "Business Expansion",
    eventId: undefined,
    targetAmount: 25000,
    targetDate: "2027-06-01",
    currentAmount: 8000,
    monthlyContribution: 1500,
    autoSaveEnabled: true,
    priority: "high",
    status: "active",
    createdAt: "2025-03-01",
    advisorApproved: true,
    advisorId: "advisor_1",
  },
]

// Sample custom events created by users
export const customEvents: CustomEvent[] = [
  {
    id: "custom_1",
    userId: "user_4",
    name: "Family Wedding",
    startDate: "2026-09-10",
    endDate: "2026-09-15",
    estimatedCost: 12000,
    costStd: 3000,
    category: "celebration",
    isPrivate: false,
    linkedGoalId: "goal_1",
    recurrence: "none",
    distributionType: "normal",
    createdAt: "2025-06-01",
  },
  {
    id: "custom_2",
    userId: "user_2",
    name: "Graduation Ceremony",
    startDate: "2026-06-20",
    endDate: "2026-06-25",
    estimatedCost: 1500,
    costStd: 400,
    category: "education",
    isPrivate: false,
    recurrence: "none",
    distributionType: "normal",
    createdAt: "2025-09-01",
  },
  {
    id: "custom_3",
    userId: "user_10",
    name: "Family Reunion",
    startDate: "2026-07-15",
    endDate: "2026-07-20",
    estimatedCost: 2500,
    costStd: 600,
    category: "travel",
    isPrivate: true,
    recurrence: "yearly",
    distributionType: "normal",
    createdAt: "2025-04-01",
  },
]

// Custom stress templates created by users
export const customStressTemplates: CustomStressTemplate[] = [
  {
    id: "template_1",
    userId: "user_4",
    name: "Wedding Cost Overrun",
    description: "Wedding costs 50% more than estimated",
    incomeMultiplier: 1,
    expenseMultiplier: 1,
    oneOffCost: 6000,
    duration: 1,
    correlatedExpenseReduction: 0.3,
    shockProbability: 0.3,
    createdAt: "2025-06-01",
  },
  {
    id: "template_2",
    userId: "user_5",
    name: "Business Slowdown",
    description: "Revenue drops 40% for 4 months",
    incomeMultiplier: 0.6,
    expenseMultiplier: 1,
    oneOffCost: 0,
    duration: 4,
    correlatedExpenseReduction: 0.5,
    shockProbability: 0.2,
    createdAt: "2025-03-01",
  },
]

// Audit logs (empty initially)
// Audit logs (mock data for history)
export const auditLogs: AuditLog[] = [
  {
    id: "log_hist_1",
    userId: "user_1",
    advisorId: "system",
    action: "loan_auto_approved",
    actionType: "loan",
    amount: 300,
    comment: "Auto-approved small emergency loan. Repayment completed successfully.",
    timestamp: "2024-10-15T10:00:00Z"
  },
  {
    id: "log_hist_2",
    userId: "user_2",
    advisorId: "advisor_1",
    action: "loan_approved",
    actionType: "loan",
    amount: 1500,
    comment: "Approved for education pursuit. Payments currently on track.",
    timestamp: "2025-01-10T14:30:00Z"
  },
  {
    id: "log_hist_3",
    userId: "user_3",
    advisorId: "advisor_2",
    action: "loan_rejected",
    actionType: "loan",
    amount: 2000,
    comment: "Insufficient emergency buffer for this amount. Client needs to build savings first.",
    timestamp: "2024-12-05T09:15:00Z"
  },
  {
    id: "log_hist_4",
    userId: "user_4",
    advisorId: "system",
    action: "loan_auto_approved",
    actionType: "loan",
    amount: 500,
    comment: "Auto-approved medical loan. Fully repaid.",
    timestamp: "2024-08-20T11:45:00Z"
  }
]

// Demo advisors
export const advisors: Advisor[] = [
  { id: "advisor_1", name: "Mounir Haddad", branch: "Tunis Centre" },
  { id: "advisor_2", name: "Salma Rezgui", branch: "Sousse" },
]
// Seed loans for history
export const seedLoans: Loan[] = [
  {
    id: "hist_loan_1",
    userId: "user_1",
    amount: 300,
    termMonths: 3,
    annualInterestRate: 12,
    monthlyPayment: 102.01,
    totalRepayment: 306.03,
    purpose: "emergency",
    status: "completed",
    createdAt: "2024-10-15",
    approvedAt: "2024-10-15",
    advisorId: "system",
    paymentSchedule: [],
    eligibilityScore: 85,
    riskFlags: [],
  },
  {
    id: "hist_loan_2",
    userId: "user_2",
    amount: 1500,
    termMonths: 12,
    annualInterestRate: 12,
    monthlyPayment: 133.27,
    totalRepayment: 1599.24,
    purpose: "education",
    status: "active",
    createdAt: "2025-01-10",
    approvedAt: "2025-01-10",
    advisorId: "advisor_1",
    paymentSchedule: [],
    eligibilityScore: 72,
    riskFlags: ["High loan-to-income"],
  },
  {
    id: "hist_loan_3",
    userId: "user_3",
    amount: 2000,
    termMonths: 6,
    annualInterestRate: 14,
    monthlyPayment: 347.16,
    totalRepayment: 2082.96,
    purpose: "wedding",
    status: "rejected_by_advisor",
    createdAt: "2024-12-05",
    advisorId: "advisor_2",
    advisorComment: "Insufficient emergency buffer for this amount",
    paymentSchedule: [],
    eligibilityScore: 35,
    riskFlags: ["Negative savings rate", "Low liquidity"],
  },
  {
    id: "hist_loan_4",
    userId: "user_4",
    amount: 500,
    termMonths: 4,
    annualInterestRate: 10,
    monthlyPayment: 127.63,
    totalRepayment: 510.52,
    purpose: "medical",
    status: "completed",
    createdAt: "2024-08-20",
    approvedAt: "2024-08-20",
    advisorId: "system",
    paymentSchedule: [],
    eligibilityScore: 90,
    riskFlags: [],
  }
]

export const seedMonthlyObligations: MonthlyObligation[] = [
  // Ahmed (Student)
  { id: "obl_1", userId: "user_1", name: "Rent (Shared)", amount: 350, dueDate: 5, category: "rent", status: "active" },
  { id: "obl_2", userId: "user_1", name: "Mobile & Data", amount: 35, dueDate: 10, category: "subscription", status: "active" },
  { id: "obl_3", userId: "user_1", name: "Gym Membership", amount: 45, dueDate: 15, category: "subscription", status: "active" },

  // Fatma (Salaried)
  { id: "obl_4", userId: "user_2", name: "Apartment Rent", amount: 750, dueDate: 1, category: "rent", status: "active" },
  { id: "obl_5", userId: "user_2", name: "STEG (Elec/Gas)", amount: 120, dueDate: 12, category: "utility", status: "active" },
  { id: "obl_6", userId: "user_2", name: "SONEDE (Water)", amount: 40, dueDate: 18, category: "utility", status: "active" },
  { id: "obl_7", userId: "user_2", name: "VDSL Internet", amount: 55, dueDate: 5, category: "subscription", status: "active" },

  // Karim (Freelancer)
  { id: "obl_8", userId: "user_3", name: "Studio Rent", amount: 500, dueDate: 1, category: "rent", status: "active" },
  { id: "obl_9", userId: "user_3", name: "Adobe Creative Cloud", amount: 180, dueDate: 14, category: "subscription", status: "active" },
  { id: "obl_10", userId: "user_3", name: "Coworking Space", amount: 250, dueDate: 10, category: "subscription", status: "active" },

  // Nadia & Mehdi (Family)
  { id: "obl_11", userId: "user_4", name: "Home Loan / Mortgage", amount: 1100, dueDate: 1, category: "debt", status: "active" },
  { id: "obl_12", userId: "user_4", name: "Family Insurance", amount: 200, dueDate: 5, category: "subscription", status: "active" },
  { id: "obl_13", userId: "user_4", name: "School Fees", amount: 450, dueDate: 2, category: "subscription", status: "active" },
  { id: "obl_14", userId: "user_4", name: "Utilities Bundle", amount: 280, dueDate: 15, category: "utility", status: "active" },

  // Youssef (Entrepreneur)
  { id: "obl_15", userId: "user_5", name: "Office Lease", amount: 1500, dueDate: 1, category: "rent", status: "active" },
  { id: "obl_16", userId: "user_5", name: "Car Lease", amount: 800, dueDate: 10, category: "debt", status: "active" },
  { id: "obl_17", userId: "user_5", name: "Professional Insurance", amount: 300, dueDate: 5, category: "subscription", status: "active" },

  // Leila (Salaried)
  { id: "obl_18", userId: "user_6", name: "Rent", amount: 600, dueDate: 1, category: "rent", status: "active" },
  { id: "obl_19", userId: "user_6", name: "Netflix & Spotify", amount: 45, dueDate: 8, category: "subscription", status: "active" },
  { id: "obl_20", userId: "user_6", name: "Electricity", amount: 90, dueDate: 20, category: "utility", status: "active" },

  // Sami (Student)
  { id: "obl_21", userId: "user_7", name: "Dorm Fee", amount: 120, dueDate: 1, category: "rent", status: "active" },
  { id: "obl_22", userId: "user_7", name: "Mobile Credit", amount: 20, dueDate: 15, category: "subscription", status: "active" },
  { id: "obl_23", userId: "user_7", name: "Library Subscription", amount: 15, dueDate: 5, category: "subscription", status: "active" },
]
