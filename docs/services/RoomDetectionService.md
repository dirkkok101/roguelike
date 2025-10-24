# RoomDetectionService

**Location**: `src/services/RoomDetectionService/RoomDetectionService.ts`
**Dependencies**: None
**Test Coverage**: Floodfill, boundary detection, room reveal

---

## Purpose

Detects connected room tiles via 4-directional floodfill. Used by FOVService in room-reveal mode to reveal entire rooms upon entry.

---

## Public API

### detectRoom(position: Position, level: Level): Set<string>
Floodfills from position to find all connected room tiles. Returns Set of position keys ("x,y") including room tiles and boundaries (walls/doors).

**Algorithm**: 4-directional floodfill + boundary detection.

---

## Related Services
- [FOVService](./FOVService.md) - Uses for room-reveal mode
