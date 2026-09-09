# Baratie Development Guide

## Commands

```cmd
:: Apply formatting, then perform static analysis
bun run check

:: Perform static analysis, then execute the test suite
bun run test
```

## Guidelines

- Bun serves as both a runtime environment and a package manager.
- Whenever your work touches anything related to styling, check the conventions established in `./src/app/styles.css`.
