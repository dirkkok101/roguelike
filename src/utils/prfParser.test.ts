import { parsePrfFile, hexToPixel, prfEntryToCoordinate, buildLookupMap } from './prfParser'
import { PrfEntry } from '@assets/assets'

describe('prfParser', () => {
  describe('hexToPixel', () => {
    it('converts base offset 0x80 to pixel 0', () => {
      expect(hexToPixel(0x80, 32)).toBe(0)
    })

    it('converts 0x81 to pixel 32 (one tile over)', () => {
      expect(hexToPixel(0x81, 32)).toBe(32)
    })

    it('converts 0x96 to pixel 704 (22 tiles down)', () => {
      expect(hexToPixel(0x96, 32)).toBe(704)
    })

    it('handles different tile sizes', () => {
      expect(hexToPixel(0x82, 16)).toBe(32) // (0x82 - 0x80) * 16 = 32
      expect(hexToPixel(0x85, 8)).toBe(40) // (0x85 - 0x80) * 8 = 40
    })
  })

  describe('parsePrfFile', () => {
    it('parses feature entries (5 parts)', () => {
      const content = `
# Comment line
feat:FLOOR:torch:0x96:0x80
feat:CLOSED:lit:0x96:0x84
      `.trim()

      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(2)
      expect(entries[0]).toMatchObject({
        type: 'feat',
        name: 'FLOOR',
        condition: 'torch',
        hexY: 0x96,
        hexX: 0x80,
      })
      expect(entries[1]).toMatchObject({
        type: 'feat',
        name: 'CLOSED',
        condition: 'lit',
        hexY: 0x96,
        hexX: 0x84,
      })
    })

    it('parses monster entries (4 parts)', () => {
      const content = `
monster:Bat:0x8B:0x81
monster:Kobold:0x8B:0x8A
      `.trim()

      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(2)
      expect(entries[0]).toMatchObject({
        type: 'monster',
        name: 'Bat',
        hexY: 0x8b,
        hexX: 0x81,
      })
      expect(entries[1]).toMatchObject({
        type: 'monster',
        name: 'Kobold',
        hexY: 0x8b,
        hexX: 0x8a,
      })
    })

    it('parses object entries (5 parts)', () => {
      const content = `
object:potion:Healing:0x82:0x80
object:scroll:Light:0x82:0x81
object:sword:Dagger:0x8a:0x83
      `.trim()

      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(3)
      expect(entries[0]).toMatchObject({
        type: 'object',
        category: 'potion',
        name: 'Healing',
        hexY: 0x82,
        hexX: 0x80,
      })
      expect(entries[2]).toMatchObject({
        type: 'object',
        category: 'sword',
        name: 'Dagger',
        hexY: 0x8a,
        hexX: 0x83,
      })
    })

    it('parses trap entries (5 parts)', () => {
      const content = `
trap:poison gas trap:*:0x87:0xB8
      `.trim()

      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        type: 'trap',
        name: 'poison gas trap',
        condition: '*',
        hexY: 0x87,
        hexX: 0xb8,
      })
    })

    it('skips empty lines and comments', () => {
      const content = `
# This is a comment

feat:FLOOR:torch:0x96:0x80

# Another comment
monster:Bat:0x8B:0x81
      `.trim()

      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(2)
      expect(entries[0].type).toBe('feat')
      expect(entries[1].type).toBe('monster')
    })

    it('handles malformed lines gracefully', () => {
      const content = `
feat:FLOOR:torch:0x96:0x80
invalid line without enough parts
monster:Bat:0x8B:0x81
      `.trim()

      // Should skip invalid line and continue
      const entries = parsePrfFile(content)

      expect(entries).toHaveLength(2)
      expect(entries[0].type).toBe('feat')
      expect(entries[1].type).toBe('monster')
    })

    it('preserves raw line for debugging', () => {
      const content = 'feat:FLOOR:torch:0x96:0x80'
      const entries = parsePrfFile(content)

      expect(entries[0].rawLine).toBe('feat:FLOOR:torch:0x96:0x80')
    })
  })

  describe('prfEntryToCoordinate', () => {
    it('converts PrfEntry to pixel coordinates', () => {
      const entry: PrfEntry = {
        type: 'feat',
        name: 'FLOOR',
        condition: 'torch',
        hexY: 0x96,
        hexX: 0x80,
        rawLine: 'feat:FLOOR:torch:0x96:0x80',
      }

      const coord = prfEntryToCoordinate(entry, 32)

      expect(coord).toEqual({
        x: 0, // (0x80 - 0x80) * 32 = 0
        y: 704, // (0x96 - 0x80) * 32 = 704
        hexX: 0x80,
        hexY: 0x96,
      })
    })

    it('converts with different tile sizes', () => {
      const entry: PrfEntry = {
        type: 'monster',
        name: 'Bat',
        hexY: 0x81,
        hexX: 0x83,
        rawLine: 'monster:Bat:0x81:0x83',
      }

      const coord = prfEntryToCoordinate(entry, 16)

      expect(coord).toEqual({
        x: 48, // (0x83 - 0x80) * 16 = 48
        y: 16, // (0x81 - 0x80) * 16 = 16
        hexX: 0x83,
        hexY: 0x81,
      })
    })
  })

  describe('buildLookupMap', () => {
    it('creates map from feature entries with condition keys', () => {
      const entries: PrfEntry[] = [
        {
          type: 'feat',
          name: 'FLOOR',
          condition: 'torch',
          hexY: 0x96,
          hexX: 0x80,
          rawLine: 'feat:FLOOR:torch:0x96:0x80',
        },
        {
          type: 'feat',
          name: 'CLOSED',
          condition: 'lit',
          hexY: 0x96,
          hexX: 0x84,
          rawLine: 'feat:CLOSED:lit:0x96:0x84',
        },
      ]

      const map = buildLookupMap(entries, 32)

      // Should have condition-specific keys
      expect(map.has('FLOOR:torch')).toBe(true)
      expect(map.has('CLOSED:lit')).toBe(true)

      // Should also have fallback keys without condition
      expect(map.has('FLOOR')).toBe(true)
      expect(map.has('CLOSED')).toBe(true)

      // Verify coordinates
      const floorCoord = map.get('FLOOR:torch')
      expect(floorCoord).toEqual({
        x: 0,
        y: 704,
        hexX: 0x80,
        hexY: 0x96,
      })
    })

    it('creates map from monster entries', () => {
      const entries: PrfEntry[] = [
        {
          type: 'monster',
          name: 'Bat',
          hexY: 0x8b,
          hexX: 0x81,
          rawLine: 'monster:Bat:0x8B:0x81',
        },
      ]

      const map = buildLookupMap(entries, 32)

      expect(map.has('Bat')).toBe(true)
      const batCoord = map.get('Bat')
      expect(batCoord).toEqual({
        x: 32, // (0x81 - 0x80) * 32
        y: 352, // (0x8B - 0x80) * 32
        hexX: 0x81,
        hexY: 0x8b,
      })
    })

    it('creates map from object entries with category keys', () => {
      const entries: PrfEntry[] = [
        {
          type: 'object',
          category: 'potion',
          name: 'Healing',
          hexY: 0x82,
          hexX: 0x80,
          rawLine: 'object:potion:Healing:0x82:0x80',
        },
      ]

      const map = buildLookupMap(entries, 32)

      // Should have category:name key
      expect(map.has('potion:Healing')).toBe(true)

      // Should also have fallback name key
      expect(map.has('Healing')).toBe(true)
    })

    it('does not overwrite existing keys (first entry wins)', () => {
      const entries: PrfEntry[] = [
        {
          type: 'feat',
          name: 'FLOOR',
          condition: 'torch',
          hexY: 0x96,
          hexX: 0x80,
          rawLine: 'feat:FLOOR:torch:0x96:0x80',
        },
        {
          type: 'feat',
          name: 'FLOOR',
          condition: 'lit',
          hexY: 0x96,
          hexX: 0x81,
          rawLine: 'feat:FLOOR:lit:0x96:0x81',
        },
      ]

      const map = buildLookupMap(entries, 32)

      // First "FLOOR" entry should be preserved
      const floorCoord = map.get('FLOOR')
      expect(floorCoord?.hexX).toBe(0x80) // First entry
    })
  })
})
