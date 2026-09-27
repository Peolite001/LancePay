import { describe, it, expect, vi } from 'vitest'
import crypto from 'crypto'

vi.mock('@/lib/db', () => ({
  prisma: {
    auditEvent: { create: vi.fn() },
  },
}))

import { generateSignature, verifySignature } from '@/lib/audit'

describe('lib/audit verifySignature helper (#1521)', () => {
  const invoiceId = 'inv_123'
  const eventType = 'invoice.created'
  const timestamp = '2026-09-26T10:00:00.000Z'
  const metadata = { ip: '127.0.0.1', userAgent: 'test-agent' }

  it('returns true when signature matches expected HMAC exactly', () => {
    const validSignature = generateSignature(invoiceId, eventType, timestamp, metadata)
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, validSignature)).toBe(true)
  })

  it('returns false when signature has an altered character', () => {
    const validSignature = generateSignature(invoiceId, eventType, timestamp, metadata)
    const altered = validSignature.slice(0, -1) + (validSignature.slice(-1) === 'a' ? 'b' : 'a')
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, altered)).toBe(false)
  })

  it('returns false when signature is shorter than expected without throwing', () => {
    const validSignature = generateSignature(invoiceId, eventType, timestamp, metadata)
    const shortSig = validSignature.slice(0, 10)
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, shortSig)).toBe(false)
  })

  it('returns false when signature is longer than expected without throwing', () => {
    const validSignature = generateSignature(invoiceId, eventType, timestamp, metadata)
    const longSig = validSignature + 'extra_bytes'
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, longSig)).toBe(false)
  })

  it('returns false when signature is empty string or non-string', () => {
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, '')).toBe(false)
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, null as unknown as string)).toBe(false)
    expect(verifySignature(invoiceId, eventType, timestamp, metadata, undefined as unknown as string)).toBe(false)
  })

  it('uses crypto.timingSafeEqual for equal length comparison to prevent timing leak', () => {
    const timingSpy = vi.spyOn(crypto, 'timingSafeEqual')
    const validSignature = generateSignature(invoiceId, eventType, timestamp, metadata)
    
    // Create a fake signature of the exact same length with prefix match
    const fakeSignature = validSignature.slice(0, 16) + '0'.repeat(validSignature.length - 16)
    
    const result = verifySignature(invoiceId, eventType, timestamp, metadata, fakeSignature)
    expect(result).toBe(false)
    expect(timingSpy).toHaveBeenCalled()

    timingSpy.mockRestore()
  })

  it('handles null metadata consistently between generate and verify', () => {
    const sig = generateSignature(invoiceId, eventType, timestamp, null)
    expect(verifySignature(invoiceId, eventType, timestamp, null, sig)).toBe(true)
    expect(verifySignature(invoiceId, eventType, timestamp, { different: true }, sig)).toBe(false)
  })
})
