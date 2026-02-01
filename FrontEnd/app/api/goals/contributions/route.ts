import { sql, generateId, formatDate, parseNumeric } from '@/data/db'
import type { GoalContribution, ContributionType } from '@/data/types'
import { NextResponse } from 'next/server'

function mapRowToContribution(row: Record<string, unknown>): GoalContribution {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    amount: parseNumeric(row.amount as string),
    date: new Date(row.date as string),
    type: row.type as ContributionType,
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    const rows = await sql`
      SELECT * FROM goal_contributions 
      WHERE goal_id = ${goalId}
      ORDER BY date DESC
    `

    return NextResponse.json(rows.map(mapRowToContribution))
  } catch (error) {
    console.error('Error fetching contributions:', error)
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = generateId()

    // Insert the contribution
    await sql`
      INSERT INTO goal_contributions (id, goal_id, amount, date, type, notes)
      VALUES (
        ${id}, ${body.goalId}, ${body.amount},
        ${formatDate(new Date(body.date || Date.now()))},
        ${body.type || 'manual'}, ${body.notes || null}
      )
    `

    // Update the goal's current amount
    await sql`
      UPDATE goals SET
        current_amount = current_amount + ${body.amount},
        updated_at = NOW()
      WHERE id = ${body.goalId}
    `

    // Check if goal is now completed
    await sql`
      UPDATE goals SET
        status = 'completed'
      WHERE id = ${body.goalId} AND current_amount >= target_amount
    `

    const rows = await sql`SELECT * FROM goal_contributions WHERE id = ${id}`
    return NextResponse.json(mapRowToContribution(rows[0]), { status: 201 })
  } catch (error) {
    console.error('Error creating contribution:', error)
    return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 })
  }
}
