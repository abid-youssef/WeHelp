// User types
export type UserType = 'student' | 'salaried' | 'freelancer' | 'family' | 'entrepreneur'

export interface User {
  id: string
  name: string
  email: string | null
  userType: UserType
  currentBalance: number
  monthlyIncome: number
  currency: string
  createdAt: Date
  updatedAt: Date
}

// Transaction types
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  userId: string
  amount: number
  type: TransactionType
  category: string
  description: string | null
  date: Date
  isRecurring: boolean
  recurrenceRule: string | null
  createdAt: Date
}

// Event types
export type EventType = 'cultural' | 'personal' | 'financial' | 'health' | 'education' | 'other'
export type DistributionType = 'normal' | 'uniform' | 'fixed'
export type ReadinessStatus = 'on_track' | 'at_risk' | 'critical' | 'pending'

export interface LifeEvent {
  id: string
  userId: string
  name: string
  nameAr: string | null
  type: EventType
  date: Date
  estimatedCost: number
  costStdDev: number
  distributionType: DistributionType
  isBuiltIn: boolean
  isRecurring: boolean
  recurrenceRule: string | null
  icon: string | null
  color: string | null
  notes: string | null
  readinessStatus: ReadinessStatus
  createdAt: Date
  updatedAt: Date
}

// Goal types
export type GoalPriority = 'low' | 'medium' | 'high'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'

export interface Goal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date
  monthlyContribution: number
  priority: GoalPriority
  status: GoalStatus
  autoSaveEnabled: boolean
  linkedEventId: string | null
  icon: string | null
  color: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type ContributionType = 'manual' | 'auto' | 'adjustment'

export interface GoalContribution {
  id: string
  goalId: string
  amount: number
  date: Date
  type: ContributionType
  notes: string | null
  createdAt: Date
}

// Stress test types
export type StressType = 'income_shock' | 'expense_spike' | 'combined' | 'custom'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface StressTemplate {
  id: string
  userId: string | null
  name: string
  description: string | null
  type: StressType
  incomeMultiplier: number
  expenseMultiplier: number
  durationMonths: number
  isSystemTemplate: boolean
  icon: string | null
  severity: Severity
  createdAt: Date
}

export interface StressResult {
  id: string
  userId: string
  templateId: string | null
  runAt: Date
  iterations: number
  resilienceScore: number | null
  probabilityNegative: number | null
  minBalance: number | null
  p10Balance: number | null
  p50Balance: number | null
  p90Balance: number | null
  parameters: Record<string, unknown> | null
  resultsSummary: Record<string, unknown> | null
}

// Settings types
export type ThemePreference = 'light' | 'dark' | 'system'
export type Language = 'en' | 'ar' | 'fr'

export interface UserSettings {
  userId: string
  monthlySavingsRate: number
  notificationEnabled: boolean
  notificationDaysBefore: number
  theme: ThemePreference
  language: Language
  showConfidenceBands: boolean
  monteCarloIterations: number
  createdAt: Date
  updatedAt: Date
}

// Projection types for charts
export interface ProjectionPoint {
  date: string
  balance: number
  p10?: number
  p50?: number
  p90?: number
  events?: string[]
}

export interface MonteCarloResult {
  projections: ProjectionPoint[]
  statistics: {
    finalBalance: { p10: number; p50: number; p90: number }
    minBalance: { p10: number; p50: number; p90: number }
    probabilityNegative: number
  }
}

// Dashboard summary
export interface DashboardSummary {
  currentBalance: number
  projectedBalance6Months: number
  savingsRate: number
  upcomingEvents: LifeEvent[]
  activeGoals: Goal[]
  readinessScore: number
  nextEvent: LifeEvent | null
}
