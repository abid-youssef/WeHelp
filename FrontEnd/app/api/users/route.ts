import { sql, generateId, parseNumeric } from '@/mocks/db'
import type { User, UserType } from '@/mocks/types'
import { NextResponse } from 'next/server'

function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string | null,
    userType: row.user_type as UserType,
    currentBalance: parseNumeric(row.current_balance as string),
    monthlyIncome: parseNumeric(row.monthly_income as string),
    currency: row.currency as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (userId) {
      const rows = await sql`SELECT * FROM users WHERE id = ${userId}`
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json(mapRowToUser(rows[0]))
    }

    const rows = await sql`SELECT * FROM users ORDER BY name`
    return NextResponse.json(rows.map(mapRowToUser))
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = generateId()

    await sql`
      INSERT INTO users (id, name, email, user_type, current_balance, monthly_income, currency)
      VALUES (${id}, ${body.name}, ${body.email || null}, ${body.userType}, ${body.currentBalance || 0}, ${body.monthlyIncome || 0}, ${body.currency || 'TND'})
    `

    // Create default settings for the user
    await sql`
      INSERT INTO user_settings (user_id)
      VALUES (${id})
    `

    const rows = await sql`SELECT * FROM users WHERE id = ${id}`
    return NextResponse.json(mapRowToUser(rows[0]), { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    await sql`
      UPDATE users SET
        name = COALESCE(${updates.name}, name),
        email = COALESCE(${updates.email}, email),
        user_type = COALESCE(${updates.userType}, user_type),
        current_balance = COALESCE(${updates.currentBalance}, current_balance),
        monthly_income = COALESCE(${updates.monthlyIncome}, monthly_income),
        updated_at = NOW()
      WHERE id = ${id}
    `

    const rows = await sql`SELECT * FROM users WHERE id = ${id}`
    return NextResponse.json(mapRowToUser(rows[0]))
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
