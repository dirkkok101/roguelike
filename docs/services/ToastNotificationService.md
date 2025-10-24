# ToastNotificationService

**Location**: `src/services/ToastNotificationService/ToastNotificationService.ts`
**Dependencies**: None
**Test Coverage**: None (simple pub/sub implementation)

---

## Purpose

Manages global toast notifications for async operations (save success/failure, storage warnings). Separate from NotificationService which handles in-game contextual messages.

---

## Public API

### Subscription

#### `subscribe(listener: ToastListener): () => void`
Registers listener for toast notifications.

**Parameters**:
- `listener` - Callback function receiving Toast objects

**Returns**:
```typescript
() => void  // Unsubscribe function
```

**Rules**:
- Multiple listeners supported
- Listeners called in registration order
- Errors in listeners caught and logged (doesn't break other listeners)

**Example**:
```typescript
const unsubscribe = service.subscribe((toast) => {
  console.log(`[${toast.type}] ${toast.message}`)
  displayToastUI(toast)
})

// Later: cleanup
unsubscribe()
```

---

### Toast Display

#### `showToast(message: string, type: ToastType = 'info'): void`
Sends toast notification to all subscribers.

**Parameters**:
- `message` - Toast message text
- `type` - Toast type (`'success'`, `'error'`, `'warning'`, `'info'`)

**Toast Object**:
```typescript
interface Toast {
  id: string       // Unique ID (e.g., 'toast-1', 'toast-2')
  message: string  // Message text
  type: ToastType  // Toast type
  timestamp: number // Unix timestamp (Date.now())
}
```

**Example**:
```typescript
service.showToast('Game saved successfully', 'success')
// All subscribers receive: { id: 'toast-1', message: '...', type: 'success', timestamp: 1234567890 }
```

---

### Convenience Methods

#### `success(message: string): void`
Shorthand for `showToast(message, 'success')`.

**Example**:
```typescript
service.success('Game saved!')
```

---

#### `error(message: string): void`
Shorthand for `showToast(message, 'error')`.

**Example**:
```typescript
service.error('Failed to save game')
```

---

#### `warning(message: string): void`
Shorthand for `showToast(message, 'warning')`.

**Example**:
```typescript
service.warning('Storage quota at 90%')
```

---

#### `info(message: string): void`
Shorthand for `showToast(message, 'info')`.

**Example**:
```typescript
service.info('Replay exported to downloads')
```

---

## Integration Notes

**Used By**:
- GameStorageService (save success/failure)
- AutoSaveMiddleware (autosave notifications)
- DownloadService (export notifications)
- UI layer (toast display components)

**Usage Pattern**:
```typescript
// Service layer: emit toasts
const toastService = new ToastNotificationService()

try {
  await saveGame()
  toastService.success('Game saved successfully')
} catch (error) {
  toastService.error(`Save failed: ${error.message}`)
}

// UI layer: subscribe to display
const unsubscribe = toastService.subscribe((toast) => {
  const el = document.createElement('div')
  el.className = `toast toast-${toast.type}`
  el.textContent = toast.message
  document.body.appendChild(el)

  setTimeout(() => el.remove(), 3000)
})
```

---

## Testing

**Test Files**: None (simple pub/sub pattern)

**Coverage**: Manually tested via UI integration

**Note**: Could benefit from unit tests covering:
- Subscription/unsubscription
- Multiple listeners
- Error handling in listeners
- Toast ID generation

---

## Related Services

- [NotificationService](./NotificationService.md) - In-game contextual messages (different from toasts)
- [MessageService](./MessageService.md) - Game log messages (in-game text)
- [GameStorageService](./GameStorageService.md) - Uses toasts for save/load feedback

---

## Technical Details

**Toast Types**:
```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info'
```

**Visual Guidelines** (UI implementation):
- **success**: Green background, checkmark icon (3s duration)
- **error**: Red background, X icon (5s duration)
- **warning**: Yellow background, warning icon (4s duration)
- **info**: Blue background, info icon (3s duration)

**Differences from NotificationService**:
| Feature | ToastNotificationService | NotificationService |
|---------|-------------------------|---------------------|
| **Purpose** | Global async operations | In-game contextual messages |
| **Display** | Temporary overlay toasts | Game log + message area |
| **Timing** | Async (save/load/export) | Turn-based (combat, items) |
| **Persistence** | Auto-dismiss (3-5s) | Scrollable log history |
| **Examples** | "Game saved", "Export complete" | "You hit the Orc", "The Dragon breathes fire" |
