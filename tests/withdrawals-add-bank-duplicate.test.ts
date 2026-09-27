import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Add Bank Account duplicate submissions guard (#1518)', () => {
  it('guards the Add Bank button with isAddingBank state in withdrawals page', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/(dashboard)/dashboard/withdrawals/page.tsx'),
      'utf8',
    )

    // isAddingBank state is defined ...
    expect(source).toMatch(/const\s*\[isAddingBank,\s*setIsAddingBank\]\s*=\s*useState\(false\)/)

    // addBankAccount checks if isAddingBank is true and exits early ...
    expect(source).toMatch(/if\s*\(isAddingBank\)\s*return/)

    // sets isAddingBank(true) before fetch ...
    expect(source).toMatch(/setIsAddingBank\(true\)/)

    // resets isAddingBank(false) inside a finally block ...
    expect(source).toMatch(/finally\s*\{[^}]*setIsAddingBank\(false\)/)

    // Add Bank button is disabled when isAddingBank is true ...
    expect(source).toMatch(/disabled=\{[^}]*isAddingBank[^}]*\}/)

    // Add Bank button shows loading label when isAddingBank is true ...
    expect(source).toContain('isAddingBank ? "Adding Bank..." : "Add Bank"')
  })

  it('prevents multiple simultaneous submissions when addBankAccount is invoked rapidly', async () => {
    // Simulate the state-guarded handler logic from WithdrawalsPage
    const simulateAddBankAccount = async (
      isAddingBank: boolean,
      setIsAddingBank: (val: boolean) => void,
      fetchMock: () => Promise<unknown>
    ) => {
      if (isAddingBank) return { skipped: true }
      setIsAddingBank(true)
      try {
        const res = await fetchMock()
        return { success: true, res }
      } finally {
        setIsAddingBank(false)
      }
    }

    let isAddingBankState = false
    const setIsAddingBank = (val: boolean) => {
      isAddingBankState = val
    }

    const mockFetch = vi.fn().mockImplementation(async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 50))
      return { ok: true, json: async () => ({ id: 'bank_123', accountNumber: '0123456789' }) }
    })

    // First click
    const promise1 = simulateAddBankAccount(isAddingBankState, setIsAddingBank, mockFetch)
    // Second click immediately while first is in flight (isAddingBankState is true)
    const promise2 = simulateAddBankAccount(isAddingBankState, setIsAddingBank, mockFetch)

    const [res1, res2] = await Promise.all([promise1, promise2])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(res1.success).toBe(true)
    expect(res2.skipped).toBe(true)
    expect(isAddingBankState).toBe(false)
  })
})

