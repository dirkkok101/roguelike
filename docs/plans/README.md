# [Feature Name] Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Owner**: [Your Name]
**Related Docs**: [Game Design](../game-design/README.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
[One sentence describing what this plan achieves and why it's important]

### Design Philosophy
- **[Principle 1]**: [Brief explanation]
- **[Principle 2]**: [Brief explanation]
- **[Principle 3]**: [Brief explanation]

### Success Criteria
- [ ] [Criterion 1 - functional requirement]
- [ ] [Criterion 2 - technical requirement]
- [ ] [Criterion 3 - quality requirement]
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles
- [ ] Documentation updated

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Link to specific game design document section]
- [Link to related mechanic documentation]

### Related Systems
- **[System Name]**: [How it relates to this plan]
- **[System Name]**: [How it relates to this plan]

### Research Summary (if applicable)
[Brief summary of research from classic roguelikes, similar games, or algorithms used]

---

## 3. Phases & Tasks

### Phase 1: [Phase Name] (Priority: HIGH/MEDIUM/LOW)

**Objective**: [What this phase achieves]

#### Task 1.1: [Task Name]

**Context**: [Why this task is needed, what problem it solves]

**Files to create/modify**:
- `src/services/ServiceName/ServiceName.ts`
- `src/services/ServiceName/scenario-name.test.ts`
- `src/services/ServiceName/index.ts`

##### Subtasks:
- [ ] Create service interface and type definitions
- [ ] Implement core logic with dependency injection
- [ ] Write unit tests (aim for >90% coverage)
- [ ] Create barrel export (`index.ts`)
- [ ] Update path aliases if needed
- [ ] Git commit: "feat: implement ServiceName core logic (Phase 1.1)"

---

#### Task 1.2: [Task Name]

**Context**: [Why this task is needed]

##### Subtasks:
- [ ] Subtask 1 description
- [ ] Subtask 2 description
- [ ] Git commit: "feat: [descriptive message] (Phase 1.2)"

---

### Phase 2: [Phase Name] (Priority: HIGH/MEDIUM/LOW)

**Objective**: [What this phase achieves]

#### Task 2.1: [Task Name]

**Context**: [Why this task is needed]

##### Subtasks:
- [ ] Subtask 1 description
- [ ] Subtask 2 description
- [ ] Git commit: "feat: [descriptive message] (Phase 2.1)"

---

## 4. Technical Design

### Data Structures

```typescript
// Key interfaces and types used in this feature
interface ExampleInterface {
  id: string
  name: string
  // ... other fields
}
```

### Service Architecture

**New Services**:
- **ServiceName**: [Responsibility and key methods]

**Modified Services**:
- **ExistingService**: [What modifications are needed]

**Service Dependencies**:
```
ServiceA
  ├─ depends on → ServiceB
  └─ depends on → ServiceC
```

### Algorithms & Formulas

**[Algorithm Name]**:
```
Step 1: [Description]
Step 2: [Description]
Result: [What it produces]
```

**[Formula Name]**:
```
result = formula_here
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- Services: >90%
- Commands: >80%
- Overall: >80%

**Test Files**:
- `scenario-name.test.ts` - [What it tests]
- `edge-cases.test.ts` - [What it tests]
- `integration.test.ts` - [What it tests]

### Test Scenarios

**Scenario 1: [Name]**
- Given: [Initial state]
- When: [Action]
- Then: [Expected result]

**Scenario 2: [Name]**
- Given: [Initial state]
- When: [Action]
- Then: [Expected result]

---

## 6. Integration Points

### Commands

**New Commands**:
- **CommandName**: [What it does, when it's triggered]

**Modified Commands**:
- **ExistingCommand**: [What changes are needed]

### UI Changes

**Renderer Updates**:
- [What visual changes are needed]

**Input Handling**:
- [What new keyboard/mouse inputs are needed]

### State Updates

**GameState Changes**:
```typescript
interface GameState {
  // ... existing fields
  newField: Type  // ← Added for this feature
}
```

**Player/Level Changes**:
- [What changes to Player or Level interfaces]

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Create `docs/services/ServiceName.md` - Full service documentation
- [ ] Update `docs/game-design/XX-topic.md` - Add feature to game design
- [ ] Update `docs/architecture.md` - Add to service catalog
- [ ] Update `docs/systems-core.md` or `systems-advanced.md` - System details
- [ ] Update `CLAUDE.md` - If new patterns or principles introduced

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: [Name]**
- **Problem**: [Description]
- **Mitigation**: [How to address it]

**Issue 2: [Name]**
- **Problem**: [Description]
- **Mitigation**: [How to address it]

### Breaking Changes
- [List any breaking changes to existing APIs or behavior]
- [How to handle migration if needed]

### Performance Considerations
- [Any performance concerns]
- [How to optimize if needed]

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: [What must be completed first]
- **Blocks**: [What depends on this being completed]

### Estimated Timeline
- Phase 1: [X hours/days]
- Phase 2: [X hours/days]
- **Total**: [X hours/days]

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated
- [ ] Manual testing completed

### Follow-Up Tasks
- [ ] [Future enhancement 1]
- [ ] [Future enhancement 2]

---

**Last Updated**: YYYY-MM-DD
**Status**: [🚧 In Progress | ✅ Complete | 📦 Archived]
