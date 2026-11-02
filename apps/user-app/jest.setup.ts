// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Configure fast-check global settings for property-based tests
// Minimum 100 iterations as per design requirements
import fc from 'fast-check';

// Set global configuration for fast-check
// This ensures all property tests run at least 100 iterations
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations for all property tests
  verbose: true, // Show detailed output for debugging
});
