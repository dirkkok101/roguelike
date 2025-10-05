import { CorridorGenerationService, GraphNode, Edge } from './CorridorGenerationService'
import { MockRandom, SeededRandom } from '@services/RandomService'
import { Room } from '@game/core/core'

describe('CorridorGenerationService - MST Algorithm', () => {
  let service: CorridorGenerationService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom([])
    service = new CorridorGenerationService(mockRandom)
  })

  const createTestRooms = (): Room[] => [
    { id: 0, x: 5, y: 5, width: 5, height: 5 },
    { id: 1, x: 20, y: 5, width: 5, height: 5 },
    { id: 2, x: 5, y: 15, width: 5, height: 5 },
    { id: 3, x: 20, y: 15, width: 5, height: 5 },
  ]

  describe('buildRoomGraph', () => {
    test('creates graph node for each room', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)

      expect(graph.length).toBe(rooms.length)
    })

    test('creates edges between all room pairs', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)

      // Each node should have edges to all other nodes
      for (const node of graph) {
        expect(node.edges.length).toBe(rooms.length - 1)
      }
    })

    test('creates bidirectional edges', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)

      // Check that edge from 0→1 exists and 1→0 exists
      const node0 = graph[0]
      const node1 = graph[1]

      const edge0to1 = node0.edges.find((e) => e.to === 1)
      const edge1to0 = node1.edges.find((e) => e.to === 0)

      expect(edge0to1).toBeDefined()
      expect(edge1to0).toBeDefined()
      expect(edge0to1?.weight).toBe(edge1to0?.weight)
    })

    test('calculates Manhattan distance as weight', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)

      // Room 0 center: (7, 7), Room 1 center: (22, 7)
      // Distance = |22-7| + |7-7| = 15
      const edge0to1 = graph[0].edges.find((e) => e.to === 1)
      expect(edge0to1?.weight).toBe(15)
    })

    test('handles single room', () => {
      const rooms = [createTestRooms()[0]]
      const graph = service.buildRoomGraph(rooms)

      expect(graph.length).toBe(1)
      expect(graph[0].edges.length).toBe(0)
    })

    test('handles empty room list', () => {
      const graph = service.buildRoomGraph([])

      expect(graph).toEqual([])
    })
  })

  describe('generateMST', () => {
    test('generates N-1 edges for N rooms', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)
      const mst = service.generateMST(graph)

      expect(mst.length).toBe(rooms.length - 1)
    })

    test('connects all rooms (no isolated nodes)', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)
      const mst = service.generateMST(graph)

      // Use BFS to verify all nodes reachable
      const visited = new Set<number>()
      const queue: number[] = [0]
      visited.add(0)

      while (queue.length > 0) {
        const current = queue.shift()!

        for (const edge of mst) {
          if (edge.from === current && !visited.has(edge.to)) {
            visited.add(edge.to)
            queue.push(edge.to)
          } else if (edge.to === current && !visited.has(edge.from)) {
            visited.add(edge.from)
            queue.push(edge.from)
          }
        }
      }

      expect(visited.size).toBe(rooms.length)
    })

    test('creates tree (no cycles)', () => {
      const rooms = createTestRooms()
      const graph = service.buildRoomGraph(rooms)
      const mst = service.generateMST(graph)

      // MST should have exactly N-1 edges (tree property)
      expect(mst.length).toBe(rooms.length - 1)

      // Verify no duplicate edges (different representation of same connection)
      const connections = new Set<string>()
      for (const edge of mst) {
        const key1 = `${edge.from}-${edge.to}`
        const key2 = `${edge.to}-${edge.from}`

        expect(connections.has(key1) || connections.has(key2)).toBe(false)
        connections.add(key1)
      }
    })

    test('handles single room', () => {
      const rooms = [createTestRooms()[0]]
      const graph = service.buildRoomGraph(rooms)
      const mst = service.generateMST(graph)

      expect(mst).toEqual([])
    })

    test('handles empty graph', () => {
      const mst = service.generateMST([])

      expect(mst).toEqual([])
    })

    test('prefers shorter edges (Prim property)', () => {
      // Create rooms where one edge is clearly shorter
      const rooms: Room[] = [
        { id: 0, x: 0, y: 0, width: 5, height: 5 },
        { id: 1, x: 10, y: 0, width: 5, height: 5 }, // Close to 0
        { id: 2, x: 50, y: 50, width: 5, height: 5 }, // Far from all
      ]

      const graph = service.buildRoomGraph(rooms)
      const mst = service.generateMST(graph)

      // MST should connect 0-1 first (shorter), then connect 2
      const edge0to1 = mst.find((e) => (e.from === 0 && e.to === 1) || (e.from === 1 && e.to === 0))
      expect(edge0to1).toBeDefined()

      // Total weight should be minimized
      const totalWeight = mst.reduce((sum, e) => sum + e.weight, 0)
      expect(totalWeight).toBeLessThan(200) // Much less than connecting all far apart
    })
  })
})
