# Service Documentation Plan

**Created**: 2025-01-24
**Status**: Ready for Implementation
**Objective**: Document all 22 missing services following strict template standards
**Approach**: Sequential Deep-Dive with dependency ordering

---

## Overview

Complete documentation for all 22 undocumented services in `src/services/`, following the established LightingService.md template structure. This will achieve 100% service documentation coverage (63/63 services documented).

---

## Goals

1. **Completeness**: Document all 22 missing services
2. **Consistency**: Follow LightingService.md template strictly
3. **Accuracy**: Validate documentation against actual implementation
4. **Quality**: Include working examples for all public methods
5. **Integration**: Update docs/services/README.md with new services

---

## Missing Services (22 Total)

### Tier 1 - Foundation (4 services, no dependencies)
1. IndexedDBService
2. ToastNotificationService
3. PreferencesService
4. TerrainSpriteService

### Tier 2 - Storage & Workers (4 services)
5. CompressionWorkerService
6. SerializationWorkerService
7. LeaderboardStorageService
8. ScoreCalculationService

### Tier 3 - Core Services (5 services)
9. CommandRecorderService
10. ReplayDebuggerService
11. CommandFactory
12. GameStorageService (verify if needed)
13. DownloadService

### Tier 4 - Domain Services (6 services)
14. RestService
15. StairsNavigationService
16. RoomDetectionService
17. ItemSpawnService
18. DungeonGenerationService
19. LeaderboardService

### Tier 5 - Specialized/High-Level (4 services)
20. AutoSaveMiddleware
21. DeathService
22. DisturbanceService
23. CurseService

---

## Documentation Template

All services follow this structure (based on LightingService.md):

```markdown
# ServiceName

**Location**: `src/services/ServiceName/ServiceName.ts`
**Dependencies**: [List of injected dependencies]
**Test Coverage**: [Brief description of test scenarios]

---

## Purpose

[1-2 sentence description of what this service does and why it exists]

---

## Public API

### [Functional Group 1]

#### `methodName(param: Type): ReturnType`
[Description of what the method does]

**Parameters**:
- `param` - [Description]

**Returns**:
```typescript
interface ReturnType {
  field: Type  // Description
}
```

**Rules/Behavior**:
- [Key rule 1]
- [Key rule 2]

**Example**:
```typescript
const result = service.methodName(value)
// result.field: expected output
```

---

## Integration Notes

**Used By**: [List of commands/services that use this]
**Usage Pattern**: [Common usage example]

---

## Testing

**Test Files**:
- `scenario-1.test.ts` - [Description]
- `scenario-2.test.ts` - [Description]

**Coverage**: [Percentage or note about coverage level]

---

## Related Services

- [Service1] - [Relationship description]
- [Service2] - [Relationship description]
```

---

## Quality Standards

Each service documentation must meet:

1. **Accuracy**: All method signatures match actual implementation
2. **Completeness**: All public methods documented (no omissions)
3. **Examples**: Every method has at least one working code example
4. **Consistency**: Exact same format across all 22 services
5. **Cross-references**: Links to related services and commands
6. **Test Coverage**: Document actual test file locations and scenarios

---

## Execution Workflow

### Per-Service Process (10-15 minutes each)

**Step 1: Code Analysis (5-7 minutes)**
```bash
# Read implementation
Read src/services/ServiceName/ServiceName.ts

# Check barrel export
Read src/services/ServiceName/index.ts

# Review tests
Glob src/services/ServiceName/*.test.ts
```

Extract:
- Constructor signature → Dependencies
- Public methods → API surface
- Exported types → API documentation
- Test files → Testing section

**Step 2: Draft Documentation (3-5 minutes)**
- Create `docs/services/ServiceName.md`
- Fill template from code analysis
- Write Purpose from class comments/usage
- Document each public method
- Add examples

**Step 3: Cross-Validation (2-3 minutes)**
- Verify method signatures
- Check dependencies
- Validate examples
- Confirm test references

**Step 4: Update Index (1 minute)**
- Add to `docs/services/README.md` table
- Place in correct category
- Update dependency graph

---

## Batching Strategy

Process in **dependency tier batches** with commits:

### Batch 1: Foundation Services (Tier 1)
- IndexedDBService
- ToastNotificationService
- PreferencesService
- TerrainSpriteService

**Commit**: `docs: add foundation service documentation (4 services)`

---

### Batch 2: Storage & Workers (Tier 2)
- CompressionWorkerService
- SerializationWorkerService
- LeaderboardStorageService
- ScoreCalculationService

**Commit**: `docs: add storage & worker service documentation (4 services)`

---

### Batch 3: Core Services (Tier 3)
- CommandRecorderService
- ReplayDebuggerService
- CommandFactory
- GameStorageService (verify)
- DownloadService

**Commit**: `docs: add core service documentation (5 services)`

---

### Batch 4: Domain Services (Tier 4)
- RestService
- StairsNavigationService
- RoomDetectionService
- ItemSpawnService
- DungeonGenerationService
- LeaderboardService

**Commit**: `docs: add domain service documentation (6 services)`

---

### Batch 5: Specialized Services (Tier 5)
- AutoSaveMiddleware
- DeathService
- DisturbanceService
- CurseService

**Commit**: `docs: add specialized service documentation (4 services)`

---

### Final: Index Update
- Update `docs/services/README.md` with all 22 services
- Add to quick reference table
- Update category lists
- Update dependency graph

**Commit**: `docs: update service index with 22 new services`

---

## Timeline

**Total Estimated Time**: 3.5 - 5.5 hours

**Breakdown**:
- 10-15 minutes per service × 22 = 220-330 minutes
- Index updates: ~30 minutes
- Review & validation: ~30 minutes

**Suggested Schedule**:
- **Day 1**: Batches 1-2 (8 services, ~2 hours)
- **Day 2**: Batches 3-4 (11 services, ~2.5 hours)
- **Day 3**: Batch 5 + Index (4 services + final, ~1.5 hours)

---

## Success Criteria

- [ ] All 22 services have documentation files in `docs/services/`
- [ ] All docs follow LightingService.md template structure
- [ ] All public methods are documented with examples
- [ ] All dependencies are listed correctly
- [ ] `docs/services/README.md` updated with all 22 services
- [ ] All documentation committed with descriptive messages
- [ ] 100% service documentation coverage (63/63 services)

---

## Related Documentation

- **Template Example**: [docs/services/LightingService.md](../services/LightingService.md)
- **Service Index**: [docs/services/README.md](../services/README.md)
- **Creation Guide**: [docs/services/creation-guide.md](../services/creation-guide.md)
- **Architecture**: [docs/architecture.md](../architecture.md)

---

## Notes

**Dependency Ordering Rationale**:
- Documenting foundational services first (Tier 1) ensures their APIs are clear before documenting dependent services
- This makes cross-referencing easier and catches API misunderstandings early
- Services in later tiers can reference earlier documentation

**Template Strictness**:
- Strict adherence to template ensures consistency
- Makes documentation predictable and easy to navigate
- Simplifies maintenance and updates

**Batch Commit Strategy**:
- Smaller, logical commits (by tier) rather than one massive commit
- Easier to review and validate
- Allows for incremental progress tracking
- Facilitates rollback if needed

---

**Last Updated**: 2025-01-24
**Author**: Claude (with Dirk Kok)
