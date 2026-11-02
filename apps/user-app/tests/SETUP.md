# Testing Infrastructure Setup

This document describes the testing infrastructure set up for the EasePay user-app.

## Installed Dependencies

### Testing Frameworks
- **jest** (v30.4.2) - JavaScript testing framework
- **fast-check** (v4.8.0) - Property-based testing library
- **ts-jest** (v29.4.9) - TypeScript preprocessor for Jest

### Testing Utilities
- **@testing-library/react** (v16.3.2) - React component testing utilities
- **@testing-library/jest-dom** (v6.9.1) - Custom Jest matchers for DOM
- **jest-environment-jsdom** (v30.4.1) - DOM environment for Jest
- **ts-node** (v10.9.2) - TypeScript execution for Jest config

## Directory Structure

```
apps/user-app/
├── tests/
│   ├── properties/          # Property-based tests
│   │   ├── README.md        # Property testing documentation
│   │   └── setup.test.ts    # Setup verification tests
│   └── SETUP.md             # This file
├── jest.config.ts           # Jest configuration
└── jest.setup.ts            # Jest setup with fast-check config
```

## Configuration

### Jest Configuration (`jest.config.ts`)
- Test environment: jsdom (for React component testing)
- Module name mapping: `@/*` → `<rootDir>/*`
- Test match patterns: `**/__tests__/**`, `**/*.{spec,test}.{js,jsx,ts,tsx}`, `**/tests/**`
- Coverage collection from: `app/`, `components/`, `lib/`

### fast-check Configuration (`jest.setup.ts`)
- **Minimum iterations**: 100 (as per design requirements)
- **Verbose mode**: Enabled for detailed output
- Global configuration applied to all property tests

## Available Scripts

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run only property-based tests
pnpm test:properties
```

## Verification

The setup has been verified with three passing tests:
1. ✓ Property tests run with at least 100 iterations
2. ✓ Basic property testing works (array reversal)
3. ✓ String property testing works (concatenation)

## Next Steps

Property-based tests should be written for:
- Validation utilities (phone, password, email, amount, name)
- Formatting utilities (amount, date, time)
- Transaction operations (sorting, filtering, counting)
- Transfer atomicity (balance conservation)
- CSV export (completeness and formatting)
- Pagination logic
- Webhook idempotency

See the design document for the complete list of 21 correctness properties to implement.

## References

- Design Document: `/.kiro/specs/payment-app-overhaul/design.md`
- Requirements: `/.kiro/specs/payment-app-overhaul/requirements.md`
- Tasks: `/.kiro/specs/payment-app-overhaul/tasks.md`
