#!/bin/bash

# Script to update all MoveCommand test files with recorder and randomService

TEST_DIR="/Users/dirkkok/Development/roguelike/.worktrees/storage-replay/src/commands/MoveCommand"

# List of test files to update (excluding movement.test.ts which is already done)
TEST_FILES=(
  "bump-attack.test.ts"
  "collision.test.ts"
  "door-interaction.test.ts"
  "door-slam-detection.test.ts"
  "fov-updates.test.ts"
  "gold-pickup.test.ts"
  "run-continuation.test.ts"
  "starvation-death.test.ts"
)

for file in "${TEST_FILES[@]}"; do
  filepath="$TEST_DIR/$file"
  echo "Updating $file..."

  # Step 1: Add imports (after MockRandom import)
  sed -i '' '/import { MockRandom } from/a\
import { CommandRecorderService } from '\''@services/CommandRecorderService'\''
' "$filepath"

  # Step 2: Add recorder variable declaration (after mockRandom declaration)
  sed -i '' '/let mockRandom: MockRandom$/a\
  let recorder: CommandRecorderService
' "$filepath"

  # Step 3: Initialize recorder in beforeEach (after mockRandom initialization)
  sed -i '' '/mockRandom = new MockRandom()/a\
    recorder = new CommandRecorderService()
' "$filepath"

  # Step 4: Add recorder and mockRandom to MoveCommand calls (multiline format)
  sed -i '' 's/goldService$/goldService,\
        recorder,\
        mockRandom/g' "$filepath"

  # Step 5: Add recorder and mockRandom to MoveCommand calls (single line format)
  # This is more complex - we need to handle lines ending with goldService)
  perl -i -pe 's/goldService\)$/goldService, recorder, mockRandom)/g' "$filepath"

  echo "✓ $file updated"
done

echo ""
echo "All MoveCommand test files updated!"
