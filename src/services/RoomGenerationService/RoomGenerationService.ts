import { Room } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// ROOM GENERATION SERVICE - Generates non-overlapping rooms for dungeon
// ============================================================================

export interface RoomGenerationConfig {
  dungeonWidth: number
  dungeonHeight: number
  minRoomCount: number
  maxRoomCount: number
  minRoomSize: number
  maxRoomSize: number
  minSpacing: number
}

export class RoomGenerationService {
  constructor(private random: IRandomService) {}

  /**
   * Generate N random rooms without overlap
   */
  generateRooms(config: RoomGenerationConfig): Room[] {
    const rooms: Room[] = []
    const numRooms = this.random.nextInt(config.minRoomCount, config.maxRoomCount)
    const maxAttempts = 100

    for (let i = 0; i < numRooms; i++) {
      let placed = false
      let attempts = 0

      while (!placed && attempts < maxAttempts) {
        const width = this.random.nextInt(config.minRoomSize, config.maxRoomSize)
        const height = this.random.nextInt(config.minRoomSize, config.maxRoomSize)

        // Check if room can fit in dungeon
        const maxX = config.dungeonWidth - width - 1
        const maxY = config.dungeonHeight - height - 1

        if (maxX < 1 || maxY < 1) {
          // Room is too big for dungeon, skip this attempt
          attempts++
          continue
        }

        const x = this.random.nextInt(1, maxX)
        const y = this.random.nextInt(1, maxY)

        const newRoom: Room = { id: i, x, y, width, height }

        if (this.canPlaceRoom(newRoom, rooms, config.minSpacing)) {
          rooms.push(newRoom)
          placed = true
        }

        attempts++
      }
    }

    return rooms
  }

  /**
   * Check if room can be placed without overlap
   */
  canPlaceRoom(room: Room, existingRooms: Room[], minSpacing: number): boolean {
    for (const existing of existingRooms) {
      if (this.roomsOverlap(room, existing, minSpacing)) {
        return false
      }
    }
    return true
  }

  /**
   * Check if two rooms overlap with spacing buffer
   */
  roomsOverlap(room1: Room, room2: Room, spacing: number): boolean {
    return (
      room1.x - spacing < room2.x + room2.width + spacing &&
      room1.x + room1.width + spacing > room2.x - spacing &&
      room1.y - spacing < room2.y + room2.height + spacing &&
      room1.y + room1.height + spacing > room2.y - spacing
    )
  }
}
