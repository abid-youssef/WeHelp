import { neon } from '@neondatabase/serverless'

// Create a reusable SQL client with a fallback for build time
const connectionString = process.env.DATABASE_URL
export const sql = connectionString
  ? neon(connectionString)
  : ((...args: any[]) => {
    if (typeof window === 'undefined') {
      console.warn('⚠️ DATABASE_URL is not set. Using mock SQL client.')
    }
    return Promise.resolve([])
  }) as any

// Helper to generate UUIDs
export function generateId(): string {
  return crypto.randomUUID()
}

// Helper to format dates for PostgreSQL
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper to parse numeric values from PostgreSQL
export function parseNumeric(value: string | number | null): number {
  if (value === null) return 0
  return typeof value === 'string' ? parseFloat(value) : value
}
