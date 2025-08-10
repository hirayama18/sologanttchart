import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { TaskDAL } from '@/dal/tasks'

type ReorderBody = {
  orderedIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReorderBody | string[]
    const orderedIds: string[] = Array.isArray(body)
      ? (body as string[])
      : (body as ReorderBody).orderedIds

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const updates = orderedIds.map((id, index) => ({ id, order: index + 1 }))
    await TaskDAL.updateOrder(updates)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error reordering tasks:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}




