// ============================================================================
// ITEM DATA LOADER - Loads item data from JSON files
// ============================================================================

export interface WeaponData {
  name: string
  spriteName: string
  damage: string
  rarity: string
}

export interface ArmorData {
  name: string
  spriteName: string
  ac: number
  rarity: string
}

export interface LightSourceData {
  type: string
  name: string
  spriteName: string
  radius: number
  fuel?: number
  isPermanent: boolean
  rarity: string
}

export interface PotionData {
  type: string
  effect: string
  power: string
  rarity: string
  descriptors: string[]
}

export interface ScrollData {
  type: string
  effect: string
  rarity: string
  labels: string[]
}

export interface RingData {
  type: string
  effect: string
  power: string
  hungerModifier: number
  rarity: string
  materials: string[]
}

export interface WandData {
  type: string
  damage: string
  charges: string
  rarity: string
  woods: string[]
}

export interface FoodData {
  name: string
  spriteName: string
  nutrition: string
  rarity: string
}

export interface ConsumableData {
  name: string
  spriteName: string
  type: string
  fuelAmount: number
  rarity: string
}

export interface ItemData {
  weapons: WeaponData[]
  armor: ArmorData[]
  lightSources: LightSourceData[]
  potions: PotionData[]
  scrolls: ScrollData[]
  rings: RingData[]
  wands: WandData[]
  food: FoodData[]
  consumables: ConsumableData[]
}

/**
 * Load item data from items.json
 * @returns Promise with ItemData
 * @throws Error if fetch fails or JSON is invalid
 */
export async function loadItemData(): Promise<ItemData> {
  const response = await fetch('/data/items.json')

  if (!response.ok) {
    throw new Error(`Failed to load items.json: ${response.statusText}`)
  }

  const data = await response.json()
  return data as ItemData
}
