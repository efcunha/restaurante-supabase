import React, { ReactNode } from 'react'

interface LicenseGateProps {
  children: ReactNode
  isBillingScreen?: boolean
}

export function LicenseGate({ children }: LicenseGateProps) {
  return <>{children}</>
}

export function TrialBanner() {
  return null
}

export default LicenseGate
