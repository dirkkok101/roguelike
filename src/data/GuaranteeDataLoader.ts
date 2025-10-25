// ============================================================================
// GUARANTEE DATA LOADER - Loads guarantee configuration from JSON files
// ============================================================================

import { GuaranteeConfig } from '@services/GuaranteeTracker'

/**
 * Load guarantee configuration from guarantees.json
 * @returns Promise with GuaranteeConfig
 * @throws Error if fetch fails or JSON is invalid
 */
export async function loadGuaranteeData(): Promise<GuaranteeConfig> {
  const response = await fetch('/data/guarantees.json')

  if (!response.ok) {
    throw new Error(`Failed to load guarantees.json: ${response.statusText}`)
  }

  const data = await response.json()
  return data as GuaranteeConfig
}
