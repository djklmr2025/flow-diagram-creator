# 🧪 Add unit tests and bugfix for `sanitizeFolder`

### 🎯 What
This PR addresses the testing gap for the `sanitizeFolder` function in `api/publish.js`, which is crucial for ensuring security against path traversal attacks. In the process of writing the tests, a subtle logic bug was discovered where backslashes were being normalized *after* the function stripped leading/trailing slashes. This meant inputs like `\folder\` resulted in `/folder/` rather than the intended `folder`. This PR fixes that issue and adds a complete suite of tests.

### 📊 Coverage
The new tests are implemented using the native Node.js test runner (`node:test`) and assert module. They cover the following scenarios:
- Falsy inputs (null, undefined, empty string) are safely returning empty strings.
- Whitespace is trimmed properly.
- Leading and trailing slashes are successfully stripped.
- Backslashes are appropriately normalized to forward slashes.
- Allowlisted valid characters (`a-z`, `A-Z`, `0-9`, `/`, `_`, `-`) are preserved correctly.
- Invalid or special characters (e.g. `!`, spaces, `?`) result in an empty string.
- Path traversal sequences (`..`) are firmly rejected.

### ✨ Result
Test coverage for this security-critical function has significantly increased. The logic is more robust against edge cases (like Windows-style backslash paths) and we can confidently refactor the underlying code in the future without risk of introducing regressions. All new test suites pass (`100%`).
