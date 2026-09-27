# Task 2: CSV check rules - Report

## Summary

Implemented comprehensive CSV validation for soil test files following the backend's own validation rules. Created two files with full TDD coverage.

## Implementation

### Files Created

1. **`src/lib/soil-tests/validate.test.ts`** (140 lines)
   - 20 test cases covering all validation rules
   - Tests for date validation, metrics, duplicates, paddock checks, headers
   - All tests pass

2. **`src/lib/soil-tests/validate.ts`** (161 lines)
   - Three main exports:
     - `validateCsv(parsed: ParsedCsv, context: CheckContext): CsvCheck` - main validation function
     - `isImportableDate(text: string): boolean` - date validation helper
     - `sampleKey(fieldId, sampleId): string` - sample key generation (`"42:1001"` format)
   - Complete type definitions for `Issue`, `CsvCheck`, and `CheckContext`

### Key Features Implemented

1. **Header Validation**
   - Checks for required headers: `fieldID`, `id_sample`, `name_sample`, `sample_date`
   - Warns about unknown columns that the backend will ignore
   - Returns early if required headers are missing

2. **Data Row Validation**
   - Row counting starts from header as row 1
   - Required fields: `id_sample`, `fieldID`, `name_sample`, `sample_date` must be non-empty
   - `fieldID` and `id_sample` must be whole numbers
   - Invalid `fieldID` checks against `knownPaddockIds` (skipped if empty set)

3. **Date Validation**
   - Accepts Excel serial date numbers (all digits)
   - Accepts ISO `YYYY-MM-DD` format with optional time component
   - Validates calendar date correctness (e.g., rejects `2024-02-30`)

4. **Metric Cell Validation**
   - Treats blank, `NA`, `n/a`, `null` as empty (case-insensitive)
   - Strips thousands separators (commas) before validation
   - Accepts numbers with scientific notation
   - Warns when a row has no metric values

5. **Duplicate Detection**
   - Detects duplicates within the file on `fieldID` + `id_sample` pair
   - Identifies samples already in system via `existingSamples` context
   - Returns `duplicateSampleIds` list

6. **Preview Generation**
   - Includes first 5 rows in preview
   - Full `rowCount` returned for statistics

## Test Results

### TDD Process

**RED**: Test file created, ran `npx vitest` → "Cannot find module './validate'"
```
FAIL src/lib/soil-tests/validate.test.ts
Error: Cannot find module './validate'
```

**GREEN**: Implementation created, ran tests → all 20 pass
```
Test Files  1 passed (1)
      Tests  20 passed (20)
```

**FULL SUITE**: `npm test` → all tests pass
```
Test Files  27 passed (27)
      Tests  170 passed | 2 expected fail (172)
```

### Test Coverage

- `isImportableDate` tests (6 cases)
  - Valid: `2024-05-01`, `2024-05-01T09:30:00`, `2024-05-01 09:30`, `45888`
  - Invalid: `''`, `01/05/2024`, `2024-02-30`, `2024-13-01`, `May 2024`

- `validateCsv` tests (14 cases)
  - Clean file with preview
  - Lab file with Excel dates
  - Missing headers detection
  - Empty file rejection
  - Multi-error row reporting
  - Empty metric handling
  - Unknown column warnings
  - Duplicate detection (in-file)
  - Existing sample detection
  - Paddock list availability (graceful skip)

## Code Quality

- Prettier formatted: ✓
- All imports used: ✓
- Type safety: ✓
- Comments for complex logic: ✓
- RegEx patterns documented in comments: ✓

## Commit

```
3471237 Check soil test CSVs row by row with the backend's own rules
```

Files changed: 2
Insertions: 301
Status: Clean working tree

## Self-Review Findings

### Correctness
- All validation logic mirrors backend's `normalise_csv_row` behavior
- Date validation correctly handles edge cases (invalid dates like Feb 30)
- Empty metrics correctly identified with case-insensitive matching
- Sample key format `"fieldId:sampleId"` matches backend expectations

### No Concerns
- Implementation follows provided spec exactly
- All test cases pass
- No warnings from ESLint
- Prettier formatting applied
- Type definitions complete and used consistently

### Potential Future Improvements (out of scope)
- Could add additional logging for debugging validation steps
- Could support more date formats if backend requirements change
- Could add performance optimizations for very large CSV files

## Verification Checklist

- [x] Created test file with all required test cases
- [x] TDD approach: RED → GREEN verified
- [x] Created validate.ts with complete implementation
- [x] All 20 tests passing
- [x] Full test suite passes (npm test)
- [x] Prettier formatting applied
- [x] Commit created with proper attribution
- [x] Git status clean
- [x] No ESLint errors added

---

## Review Fix Round 1: Typographic Quotes

**Issue**: Error messages used straight quotes instead of Unicode typographic quotes specified in the brief.

**Analysis**:
The brief spec (task-2-brief.md) uses:
- U+201C (LEFT DOUBLE QUOTATION MARK) = "
- U+201D (RIGHT DOUBLE QUOTATION MARK) = "
- U+2019 (RIGHT SINGLE QUOTATION MARK) = ' (in "isn't", "doesn't")

Initial implementation incorrectly used ASCII straight quotes.

**Solution**:
1. Extracted code blocks from task-2-brief.md directly using Python to preserve exact UTF-8 bytes
2. Replaced both `validate.ts` and `validate.test.ts` with byte-for-byte copies from the brief
3. Verified quotes using `unicodedata.name()`:
   - "fieldID "${fieldText}" isn't a whole number."
   - All messages now use correct typographic quotes

**Changes**:
```
src/lib/soil-tests/validate.ts      14 insertions(+), 14 deletions(-)
src/lib/soil-tests/validate.test.ts 14 insertions(+), 14 deletions(-)
```

**Commands Run**:
```bash
# Extract code from brief preserving UTF-8
python3 -c "...extract lines 173-333 from brief..."

# Extract test from brief
python3 -c "...extract lines 24-164 from brief..."

# Verify quotes
python3 -c "...check Unicode bytes of messages..."

# Run tests
npx vitest run --project server src/lib/soil-tests/validate.test.ts
# Result: ✓ 1 passed (20 tests)

# Full suite
npm test
# Result: ✓ 27 test files, 170 tests passed | 2 expected fail

# Prettier check
npx prettier --check src/lib/soil-tests/
# Result: All matched files use Prettier code style!
```

**Commit**:
```
25ada96 Fix: use typographic quotes in validation error messages
```

**Verification**:
- [x] All 20 validation tests pass
- [x] Full test suite: 170 tests pass
- [x] Prettier check passes
- [x] Quote bytes verified using Python unicodedata
- [x] Messages byte-for-byte match the brief
- [x] Clean working tree
