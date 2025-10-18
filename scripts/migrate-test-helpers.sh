#!/bin/bash

# Script to migrate createTestPlayer() helpers to use shared @test-helpers
# Usage: bash scripts/migrate-test-helpers.sh

set -e

echo "🔄 Migrating test helpers to use PlayerFactory-based shared helper..."

# Find all test files with createTestPlayer (excluding already migrated)
TEST_FILES=$(grep -r "function createTestPlayer" src --include="*.test.ts" -l)

MIGRATED=0
SKIPPED=0
FAILED=0

for file in $TEST_FILES; do
  echo ""
  echo "📝 Processing: $file"

  # Check if already has import from @test-helpers
  if grep -q "from '@test-helpers'" "$file" 2>/dev/null; then
    echo "   ⏭️  Already migrated, skipping..."
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Backup original
  cp "$file" "$file.bak"

  # Try to migrate
  if python3 - "$file" <<'PYTHON'
import sys
import re

file_path = sys.argv[1]

with open(file_path, 'r') as f:
    content = f.read()

# Check if file has createTestPlayer
if 'function createTestPlayer' not in content:
    print("   ⏭️  No createTestPlayer found")
    sys.exit(1)

# Remove the createTestPlayer function definition
# Pattern matches: function createTestPlayer(): Player { ... } up to closing brace
pattern = r'function createTestPlayer\(\): Player \{[^}]*(?:\{[^}]*\}[^}]*)*\}'
content_cleaned = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)

# Add import at top (after existing imports)
if "import { createTestPlayer } from '@test-helpers'" not in content_cleaned:
    # Find last import statement
    import_pattern = r"(import .+ from ['\"].+['\"])"
    imports = list(re.finditer(import_pattern, content_cleaned))

    if imports:
        # Insert after last import
        last_import = imports[-1]
        insert_pos = last_import.end()
        content_cleaned = (
            content_cleaned[:insert_pos] +
            "\nimport { createTestPlayer } from '@test-helpers'" +
            content_cleaned[insert_pos:]
        )
    else:
        # No imports found, add at top
        content_cleaned = "import { createTestPlayer } from '@test-helpers'\n\n" + content_cleaned

# Write back
with open(file_path, 'w') as f:
    f.write(content_cleaned)

print("   ✅ Migrated successfully")
sys.exit(0)
PYTHON
  then
    MIGRATED=$((MIGRATED + 1))
    rm "$file.bak"  # Remove backup on success
  else
    echo "   ❌ Migration failed, restoring backup..."
    mv "$file.bak" "$file"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "========================================="
echo "Migration Summary:"
echo "  ✅ Migrated: $MIGRATED files"
echo "  ⏭️  Skipped: $SKIPPED files"
echo "  ❌ Failed: $FAILED files"
echo "========================================="

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "⚠️  Some files failed migration. Manual review needed."
  exit 1
fi

echo ""
echo "🧪 Running tests to verify migration..."
npm test 2>&1 | tail -20
