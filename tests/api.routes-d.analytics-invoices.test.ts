import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const verifyAuthToken = vi.fn()
const userFindUnique = vi.fn()
const invoiceGroupBy = vi.fn()
const loggerError = vi.fn()

vi.mock('@/lib/auth', () => ({ verifyAuthToken }))
vi.mock('@/lib/logger', () => ({ logger: { error: loggerError } }))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    invoice: { groupBy: invoiceGroupBy },
  },
}))

const URL = 'http://localhost/api/routes-d/analytics/invoices'

function makeRequest(headers: Record<string, string> = { authorization: 'Bearer token' }) {
  return new NextRequest(URL, { headers })
}

describe('GET /api/routes-d/analytics/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the auth token is invalid', async () => {
    verifyAuthToken.mockResolvedValue(null)

    const { GET } = await import('@/app/api/routes-d/analytics/invoices/route')
    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it('returns zeroed analytics when the user has no invoices', async () => {
    verifyAuthToken.mockResolvedValue({ userId: 'privy_1' })
    userFindUnique.mockResolvedValue({ id: 'user_1' })
    invoiceGroupBy.mockResolvedValue([])

    const { GET } = await import('@/app/api/routes-d/analytics/invoices/route')
    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      invoices: {
        total: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        totalInvoiced: 0,
        distribution: {
          pending: { count: 0, percentage: 0 },
          paid: { count: 0, percentage: 0 },
          overdue: { count: 0, percentage: 0 },
          cancelled: { count: 0, percentage: 0 },
        },
      },
    })
  })

  it('returns invoice totals and status distribution for the authenticated user', async () => {
    verifyAuthToken.mockResolvedValue({ userId: 'privy_1' })
    userFindUnique.mockResolvedValue({ id: 'user_1' })
    invoiceGroupBy.mockResolvedValue([
      { status: 'pending', _count: { id: 1 }, _sum: { amount: '125.50' } },
      { status: 'paid', _count: { id: 3 }, _sum: { amount: '300.00' } },
      { status: 'cancelled', _count: { id: 1 }, _sum: { amount: null } },
    ])

    const { GET } = await import('@/app/api/routes-d/analytics/invoices/route')
    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      invoices: {
        total: 5,
        pending: 1,
        paid: 3,
        overdue: 0,
        cancelled: 1,
        totalInvoiced: 425.5,
        distribution: {
          pending: { count: 1, percentage: 20 },
          paid: { count: 3, percentage: 60 },
          overdue: { count: 0, percentage: 0 },
          cancelled: { count: 1, percentage: 20 },
        },
      },
    })
    expect(invoiceGroupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { userId: 'user_1' },
      _count: { id: true },
      _sum: { amount: true },
    })
  })
})
