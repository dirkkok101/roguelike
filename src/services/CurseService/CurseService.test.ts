import { CurseService } from './CurseService'
import { Player, Weapon, Armor, Ring, RingType, ItemType } from '@game/core/core'

describe('CurseService', () => {
  let curseService: CurseService
  let testPlayer: Player

  beforeEach(() => {
    curseService = new CurseService()

    testPlayer = {
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      maxStrength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      armorClass: 10,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      hunger: 1000,
      statusEffects: [],
      energy: 0,
    } as Player
  })

  describe('isCursed', () => {
    test('returns false for null item', () => {
      expect(curseService.isCursed(null)).toBe(false)
    })

    test('returns false for undefined item', () => {
      expect(curseService.isCursed(undefined)).toBe(false)
    })

    test('returns false for uncursed weapon', () => {
      const weapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 0,
        isIdentified: true,
        cursed: false,
        position: { x: 0, y: 0 },
      }

      expect(curseService.isCursed(weapon)).toBe(false)
    })

    test('returns true for cursed weapon', () => {
      const weapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      expect(curseService.isCursed(weapon)).toBe(true)
    })

    test('returns true for cursed armor', () => {
      const armor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -2,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      expect(curseService.isCursed(armor)).toBe(true)
    })

    test('returns true for cursed ring', () => {
      const ring: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring of Protection',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      expect(curseService.isCursed(ring)).toBe(true)
    })

    test('returns false for item without cursed field', () => {
      const weapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 0,
        isIdentified: true,
        position: { x: 0, y: 0 },
        // No cursed field
      }

      expect(curseService.isCursed(weapon)).toBe(false)
    })
  })

  describe('removeCurse', () => {
    test('removes curse from weapon', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const uncursed = curseService.removeCurse(cursedWeapon)

      expect(uncursed.cursed).toBe(false)
      expect(uncursed.name).toBe('Cursed Mace')
      expect(uncursed.bonus).toBe(-1) // Bonus unchanged
    })

    test('does not mutate original item', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const uncursed = curseService.removeCurse(cursedWeapon)

      // Original should still be cursed
      expect(cursedWeapon.cursed).toBe(true)
      // New item should be uncursed
      expect(uncursed.cursed).toBe(false)
    })

    test('removes curse from armor', () => {
      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -2,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const uncursed = curseService.removeCurse(cursedArmor)

      expect(uncursed.cursed).toBe(false)
    })

    test('removes curse from ring', () => {
      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const uncursed = curseService.removeCurse(cursedRing)

      expect(uncursed.cursed).toBe(false)
    })
  })

  describe('removeCursesFromEquipment', () => {
    test('removes curses from all equipped items', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursedItems = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
          armor: cursedArmor,
          leftRing: cursedRing,
        },
      }

      const uncursedPlayer = curseService.removeCursesFromEquipment(playerWithCursedItems)

      expect(uncursedPlayer.equipment.weapon!.cursed).toBe(false)
      expect(uncursedPlayer.equipment.armor!.cursed).toBe(false)
      expect(uncursedPlayer.equipment.leftRing!.cursed).toBe(false)
    })

    test('handles player with no equipped items', () => {
      const uncursedPlayer = curseService.removeCursesFromEquipment(testPlayer)

      expect(uncursedPlayer.equipment.weapon).toBeNull()
      expect(uncursedPlayer.equipment.armor).toBeNull()
      expect(uncursedPlayer.equipment.leftRing).toBeNull()
      expect(uncursedPlayer.equipment.rightRing).toBeNull()
    })

    test('handles mix of cursed and uncursed items', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const normalArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Plate Mail',
        ac: 3,
        bonus: 1,
        isIdentified: true,
        cursed: false,
        position: { x: 0, y: 0 },
      }

      const playerWithMixed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
          armor: normalArmor,
        },
      }

      const uncursedPlayer = curseService.removeCursesFromEquipment(playerWithMixed)

      expect(uncursedPlayer.equipment.weapon!.cursed).toBe(false)
      expect(uncursedPlayer.equipment.armor!.cursed).toBe(false)
    })

    test('does not mutate original player', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const uncursedPlayer = curseService.removeCursesFromEquipment(playerWithCursed)

      // Original player's weapon should still be cursed
      expect(playerWithCursed.equipment.weapon!.cursed).toBe(true)
      // New player's weapon should be uncursed
      expect(uncursedPlayer.equipment.weapon!.cursed).toBe(false)
    })
  })

  describe('hasAnyCursedItems', () => {
    test('returns false when no items equipped', () => {
      expect(curseService.hasAnyCursedItems(testPlayer)).toBe(false)
    })

    test('returns false when all equipped items are uncursed', () => {
      const uncursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 1,
        isIdentified: true,
        cursed: false,
        position: { x: 0, y: 0 },
      }

      const playerWithUncursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: uncursedWeapon,
        },
      }

      expect(curseService.hasAnyCursedItems(playerWithUncursed)).toBe(false)
    })

    test('returns true when weapon is cursed', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      expect(curseService.hasAnyCursedItems(playerWithCursed)).toBe(true)
    })

    test('returns true when armor is cursed', () => {
      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          armor: cursedArmor,
        },
      }

      expect(curseService.hasAnyCursedItems(playerWithCursed)).toBe(true)
    })

    test('returns true when ring is cursed', () => {
      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          leftRing: cursedRing,
        },
      }

      expect(curseService.hasAnyCursedItems(playerWithCursed)).toBe(true)
    })
  })

  describe('getCursedItemNames', () => {
    test('returns empty array when no cursed items', () => {
      expect(curseService.getCursedItemNames(testPlayer)).toEqual([])
    })

    test('returns weapon name when weapon is cursed', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      expect(curseService.getCursedItemNames(playerWithCursed)).toEqual(['Cursed Mace'])
    })

    test('returns all cursed item names', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Armor',
        ac: 3,
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring of Protection',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
          armor: cursedArmor,
          rightRing: cursedRing,
        },
      }

      const cursedNames = curseService.getCursedItemNames(playerWithCursed)

      expect(cursedNames).toContain('Cursed Mace')
      expect(cursedNames).toContain('Cursed Armor')
      expect(cursedNames).toContain('Cursed Ring of Protection')
      expect(cursedNames.length).toBe(3)
    })
  })
})
