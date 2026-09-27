import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BalanceCard } from '@/components/dashboard/balance-card'

describe('BalanceCard with string XLM balance (#1516)', () => {
  it('renders without throwing when xlm arrives as a string from the API', () => {
    const balance = {
      available: { display: '$100.00' },
      localEquivalent: { display: '₦160,000', rate: 1600 },
      // app/api/user/balance/route.ts returns xlm as a string (e.g. "25.5")
      xlm: '25.5',
    }

    let html: string = ''
    expect(() => {
      html = renderToStaticMarkup(
        createElement(BalanceCard, { balance, isLoading: false } as never),
      )
    }).not.toThrow()
    // 25.5 coerced to a number and formatted with toFixed(2)
    expect(html).toContain('25.50 XLM')
  })

  it('renders without throwing when xlmBalance prop arrives as a string', () => {
    let html: string = ''
    expect(() => {
      html = renderToStaticMarkup(
        createElement(
          BalanceCard,
          { balance: null, isLoading: false, xlmBalance: '3.14159' } as never,
        ),
      )
    }).not.toThrow()
    expect(html).toContain('3.14 XLM')
  })

  it('falls back to 0.00 XLM for non-numeric values instead of throwing', () => {
    let html: string = ''
    expect(() => {
      html = renderToStaticMarkup(
        createElement(BalanceCard, { balance: { xlm: 'not-a-number' }, isLoading: false } as never),
      )
    }).not.toThrow()
    expect(html).toContain('0.00 XLM')
  })
})

describe('BalanceCard live exchange rate fallback branches (#1520)', () => {
  it('computes Naira equivalent using provided live exchangeRate prop in usdc fallback path', () => {
    const balance = { usdc: '50.00' }
    const html = renderToStaticMarkup(
      createElement(BalanceCard, {
        balance,
        isLoading: false,
        exchangeRate: 1450,
      } as never),
    )
    // 50 * 1450 = 72,500
    expect(html).toContain('₦72,500')
    expect(html).toContain('@ ₦1,450/$1')
    expect(html).not.toContain('₦80,000') // 50 * 1600 (hardcoded rate) must not appear
  })

  it('computes Naira equivalent using provided live exchangeRate prop in totalValue fallback path', () => {
    const balance = { totalValue: 120 }
    const html = renderToStaticMarkup(
      createElement(BalanceCard, {
        balance,
        isLoading: false,
        exchangeRate: 1550,
      } as never),
    )
    // 120 * 1550 = 186,000
    expect(html).toContain('₦186,000')
    expect(html).toContain('@ ₦1,550/$1')
    expect(html).not.toContain('₦192,000') // 120 * 1600 must not appear
  })

  it('does not display a hardcoded 1600 rate if no rate is available', () => {
    const balance = { usdc: '100.00' }
    const html = renderToStaticMarkup(
      createElement(BalanceCard, {
        balance,
        isLoading: false,
      } as never),
    )
    expect(html).not.toContain('1,600')
    expect(html).not.toContain('1600')
  })
})

