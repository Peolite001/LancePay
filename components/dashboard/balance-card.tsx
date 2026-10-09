'use client'

import { Info } from 'lucide-react'
import { useState, useEffect } from 'react'

interface BalanceCardProps {
  balance: {
    available?: { display: string }
    localEquivalent?: { display: string; rate: number }
    xlm?: number | string
    usdc?: string | number
    usd?: string | number
    totalValue?: number
    assets?: any[]
  } | null
  isLoading: boolean
  xlmBalance?: number | string
  exchangeRate?: number
}

export function BalanceCard({ balance, isLoading, xlmBalance, exchangeRate }: BalanceCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [fetchedRate, setFetchedRate] = useState<number | null>(null)
  const rawXlm = xlmBalance ?? balance?.xlm ?? 0
  const numericXlm = Number(rawXlm)
  const displayXlm = Number.isFinite(numericXlm) ? numericXlm : 0

  useEffect(() => {
    // If rate is provided via prop or balance object, don't fetch
    if (exchangeRate !== undefined || balance?.localEquivalent?.rate !== undefined) {
      return
    }

    // Otherwise fetch live rate from the existing exchange-rate endpoint
    let isMounted = true
    fetch('/api/exchange-rate')
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data) => {
        if (isMounted && data?.rate && typeof data.rate === 'number') {
          setFetchedRate(data.rate)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [exchangeRate, balance?.localEquivalent?.rate])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
    );
  }

  // Determine effective rate without hardcoding
  const rate = balance?.localEquivalent?.rate ?? exchangeRate ?? fetchedRate ?? 0;

  // Handle different balance formats
  let displayBalance = "$0.00";
  let localEquivalent = "₦0";

  if (balance) {
    // Format 1: { available: { display: string }, localEquivalent: { display: string, rate: number } }
    if (balance.available?.display) {
      displayBalance = balance.available.display;
      localEquivalent =
        balance.localEquivalent?.display ||
        (rate > 0
          ? `₦${(
              parseFloat(balance.available.display.replace(/[^0-9.]/g, '') || '0') * rate
            ).toLocaleString()}`
          : "₦0");
    }
    // Format 2: { usdc: string, usd: string }
    else if (balance.usdc || balance.usd) {
      const amount = parseFloat(String(balance.usdc || balance.usd || "0"));
      displayBalance = `$${amount.toFixed(2)}`;
      localEquivalent = rate > 0 ? `₦${(amount * rate).toLocaleString()}` : "—";
    }
    // Format 3: { totalValue: number } (Portfolio structure)
    else if (balance.totalValue !== undefined) {
      displayBalance = `$${balance.totalValue.toFixed(2)}`;
      localEquivalent = rate > 0 ? `₦${(balance.totalValue * rate).toLocaleString()}` : "—";
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6">
      <p className="text-sm text-brand-gray font-medium mb-1">Total Portfolio Value</p>
      <h2 className="text-4xl font-bold text-brand-black mb-2">
        {displayBalance}
      </h2>
      <p className="text-sm text-brand-gray mb-3">
        ≈ {localEquivalent}
        {rate > 0 && (
          <span className="text-xs ml-1">@ ₦{rate.toLocaleString()}/$1</span>
        )}
      </p>

      {/* XLM Reserve Display */}
      <div className="flex items-center gap-1.5 relative">
        <p className="text-xs text-gray-500">
          XLM Reserve: {displayXlm.toFixed(2)} XLM
        </p>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
            aria-label="XLM reserve information"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-0 bottom-full mb-2 w-64 sm:w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
              <p>
                XLM reserves keep your Stellar account active. This amount is locked but recoverable if you close your account.
              </p>
              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
