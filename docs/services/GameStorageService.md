# GameStorageService

Handles saving and loading games to/from IndexedDB.

## Responsibilities

- Save game state with embedded replay data
- Load game state by gameId
- List all games for leaderboard
- Calculate game status and score
- Delegate to IndexedDBService for persistence

## API

### saveGame(state: GameState): Promise<void>

Saves game state to IndexedDB with:
- Full game state (compressed via Web Workers)
- Embedded replay data (initialState, commands, seed)
- Metadata (character name, turn count, level, status, score)

Status calculation:
- 'ongoing': Game in progress (!isGameOver)
- 'won': Player retrieved Amulet and escaped (isGameOver && hasWon)
- 'died': Player died (isGameOver && !hasWon)

Score calculation:
```
score = gold + (monstersKilled × 100) + (maxDepth × 1000)
```

### loadGame(gameId: string): Promise<GameState | null>

Loads game state by ID. Returns null if not found.

Restores replay data if available (enables replay from turn 0).

### listGames(): Promise<SaveSummary[]>

Returns all saved games sorted by score (descending).

Used by LeaderboardState to display game list.

### deleteSave(gameId: string): Promise<void>

Deletes a save file. Used when player manually deletes from leaderboard.

### hasSave(gameId?: string): Promise<boolean>

Checks if a save exists. If no gameId provided, checks continue pointer.

### getContinueGameId(): Promise<string | null>

Gets the game ID of the most recent save (continue pointer).

### getQuota(): Promise<{usage: number, quota: number, percentUsed: number}>

Returns storage quota information.

## Architecture Notes

- **No LocalStorage**: All saves use IndexedDB
- **No Migration**: Old LocalStorage saves are not migrated (fresh start)
- **No Deletion on Death**: Saves preserved after player dies
- **Automatic Score**: Calculated on every save

## Dependencies

- IndexedDBService: Database operations
- CommandRecorderService: Provides replay data
- CompressionWorkerService: Compresses game state
- SerializationWorkerService: Serializes Maps/Sets to arrays

## Used By

- AutoSaveMiddleware: Auto-saves during gameplay
- SaveCommand: Manual save via 'S' key
- QuitCommand: Save before quitting
- LeaderboardState: Lists all games
- MainMenuState: Load game from continue
