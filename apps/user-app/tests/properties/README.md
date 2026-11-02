# Property-Based Testing

This directory contains property-based tests using [fast-check](https://github.com/dubzzz/fast-check).

## Overview

Property-based testing verifies that universal properties hold across all inputs, rather than testing specific examples. This approach helps discover edge cases and ensures correctness across the entire input space.

## Configuration

- **Framework**: Jest + fast-check
- **Minimum Iterations**: 100 (configured in `jest.setup.ts`)
- **Test Location**: `tests/properties/`

## Running Tests

```bash
# Run all tests
pnpm test

# Run only property tests
pnpm test:properties

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Writing Property Tests

Property tests should follow this structure:

```typescript
import fc from 'fast-check';

describe('Feature Name', () => {
  it('Property: Description of the property', () => {
    fc.assert(
      fc.property(
        fc.arbitrary(), // Define your input generator
        (input) => {
          // Test the property
          const result = functionUnderTest(input);
          return expectedCondition(result);
        }
      )
    );
  });
});
```

## Property Test Guidelines

1. **Property Names**: Use descriptive names that explain what invariant is being tested
2. **Generators**: Use appropriate fast-check arbitraries that match your input domain
3. **Assertions**: Properties should return boolean values or throw errors
4. **Documentation**: Add comments explaining the property being tested
5. **Requirements**: Link properties to acceptance criteria using `**Validates: Requirements X.Y**`

## Example Properties

- **Validation**: For any input, validator accepts only valid inputs
- **Formatting**: For any valid input, formatter produces expected output format
- **Atomicity**: For any valid operation, system state remains consistent
- **Idempotency**: For any operation, repeating it produces the same result

## Resources

- [fast-check Documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/1-Guides/PropertyBasedTesting.md)
- [Design Document](/.kiro/specs/payment-app-overhaul/design.md) - See "Correctness Properties" section
