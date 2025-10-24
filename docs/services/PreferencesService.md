# PreferencesService

**Location**: `src/services/PreferencesService/PreferencesService.ts`
**Dependencies**: None (browser localStorage API)
**Test Coverage**: Get/set preferences, defaults, validation, subscription system

---

## Purpose

Type-safe localStorage wrapper for user preferences with automatic JSON serialization and event notification system. Manages render mode preferences and provides pub/sub pattern for preference changes.

---

## Public API

### Generic Storage Operations

#### `load<T>(key: string): T | null`
Loads and deserializes data from localStorage.

**Parameters**:
- `key` - localStorage key

**Returns**:
```typescript
T | null  // Deserialized object or null if not found/invalid
```

**Rules**:
- Returns `null` if key doesn't exist
- Returns `null` on deserialization error (logs error)
- Type-safe with TypeScript generics

**Example**:
```typescript
interface CustomSettings { theme: string }
const settings = service.load<CustomSettings>('my_settings')
// settings: { theme: 'dark' } or null
```

---

#### `save<T>(key: string, value: T): boolean`
Serializes and saves data to localStorage.

**Parameters**:
- `key` - localStorage key
- `value` - Object to serialize and save

**Returns**:
```typescript
boolean  // true if successful, false on error
```

**Rules**:
- Automatically JSON-serializes value
- Returns `false` on serialization error (logs error)
- Overwrites existing value

**Example**:
```typescript
const success = service.save('my_settings', { theme: 'dark' })
// success: true
```

---

#### `remove(key: string): void`
Removes key from localStorage.

**Parameters**:
- `key` - localStorage key to remove

**Example**:
```typescript
service.remove('my_settings')
// Key removed from localStorage
```

---

#### `has(key: string): boolean`
Checks if key exists in localStorage.

**Parameters**:
- `key` - localStorage key

**Returns**:
```typescript
boolean  // true if key exists, false otherwise
```

**Example**:
```typescript
if (service.has('user_preferences')) {
  const prefs = service.load('user_preferences')
}
```

---

### User Preferences

#### `getDefaultPreferences(): UserPreferences`
Returns default preferences.

**Returns**:
```typescript
interface UserPreferences {
  renderMode: 'ascii' | 'sprites'  // Default: 'sprites'
}
```

**Example**:
```typescript
const defaults = service.getDefaultPreferences()
// defaults: { renderMode: 'sprites' }
```

---

#### `getPreferences(): UserPreferences`
Gets user preferences with fallback to defaults.

**Returns**:
```typescript
UserPreferences  // Never returns null (uses defaults)
```

**Rules**:
- Returns stored preferences if valid
- Returns defaults if no stored preferences
- Validates `renderMode` field (falls back to 'sprites' if invalid)
- Safe to call (never throws, always returns valid preferences)

**Example**:
```typescript
const prefs = service.getPreferences()
// prefs: { renderMode: 'sprites' } or { renderMode: 'ascii' }

// Always safe to destructure
const { renderMode } = service.getPreferences()
```

---

#### `savePreferences(preferences: UserPreferences): boolean`
Saves user preferences and notifies subscribers.

**Parameters**:
- `preferences` - UserPreferences object to save

**Returns**:
```typescript
boolean  // true if successful, false on error
```

**Rules**:
- Saves to `user_preferences` localStorage key
- Notifies all subscribed listeners on success
- Does NOT notify listeners on failure

**Example**:
```typescript
const success = service.savePreferences({ renderMode: 'ascii' })
if (success) {
  console.log('Preferences saved and listeners notified')
}
```

---

### Subscription System

#### `subscribe(listener: (prefs: UserPreferences) => void): () => void`
Subscribes to preference changes.

**Parameters**:
- `listener` - Callback receiving updated preferences

**Returns**:
```typescript
() => void  // Unsubscribe function
```

**Rules**:
- Listener called when `savePreferences()` succeeds
- Multiple listeners supported
- Errors in listeners caught and logged (doesn't break other listeners)

**Example**:
```typescript
const unsubscribe = service.subscribe((prefs) => {
  console.log('Preferences changed:', prefs.renderMode)
  updateUI(prefs)
})

// Later: cleanup
unsubscribe()
```

---

## Integration Notes

**Used By**:
- Main renderer (checks renderMode to switch between ASCII/sprite)
- Settings UI (save/load render mode preference)
- CanvasGameRenderer (sprite rendering toggle)
- ASCIIRenderer (ASCII rendering toggle)

**Usage Pattern**:
```typescript
const prefsService = new PreferencesService()

// Load on startup
const prefs = prefsService.getPreferences()
initializeRenderer(prefs.renderMode)

// Subscribe to changes
prefsService.subscribe((newPrefs) => {
  switchRenderer(newPrefs.renderMode)
})

// Save on user action
function toggleRenderMode() {
  const current = prefsService.getPreferences()
  const newMode = current.renderMode === 'sprites' ? 'ascii' : 'sprites'
  prefsService.savePreferences({ renderMode: newMode })
}
```

---

## Testing

**Test Files**:
- `preferences.test.ts` - Get/set preferences, defaults, validation, subscription

**Coverage**: Comprehensive (all public methods, error cases, validation)

**Test Scenarios**:
- Default preferences
- Save/load cycle
- Invalid renderMode validation
- Subscription notifications
- Generic load/save operations

---

## Related Services

- [CanvasGameRenderer](../systems-core.md#sprite-rendering-system) - Uses renderMode preference
- [ASCIIRenderer](../systems-core.md#ascii-rendering) - Uses renderMode preference
- [ToastNotificationService](./ToastNotificationService.md) - May notify on preference changes

---

## Technical Details

**localStorage Key**:
```typescript
private static readonly PREFERENCES_KEY = 'user_preferences'
```

**UserPreferences Interface**:
```typescript
export interface UserPreferences {
  renderMode: 'ascii' | 'sprites'  // Rendering mode (default: 'sprites')
}
```

**Validation Rules**:
- If `renderMode` is not `'ascii'` or `'sprites'`, falls back to `'sprites'`
- Logs warning when validation fails
- Never throws errors (graceful degradation)

**Event Notification**:
- Pub/sub pattern using `Set<listener>`
- Listeners called synchronously after save
- Listener errors isolated (one failure doesn't affect others)

**Browser Compatibility**:
- All modern browsers support localStorage
- 5-10 MB storage limit per origin (browser-dependent)
- Data persists until explicitly cleared
