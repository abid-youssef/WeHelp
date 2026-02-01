import { neon } from '@neondatabase/serverless'

// Create a reusable SQL client
export const sql = neon(process.env.DATABASE_URL!)

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
