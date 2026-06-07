🎯 **What:** The testing gap for the `sanitizeSession` function in `api/inject.js` has been addressed. The function is now explicitly exported and a dedicated test suite is provided.
📊 **Coverage:** The new test suite covers:
- Happy paths with valid session IDs.
- Trimming and removal of leading/trailing slashes.
- Null, undefined, and empty string handling.
- Conversion of backslashes to forward slashes (and fixing the replace order).
- Checking character validity (returning empty on invalid chars).
- Guarding against directory traversal (`..`).
- Enforcing length limits (120 chars).
✨ **Result:** Enhanced test coverage that guarantees consistent session ID sanitization and allows for more confident refactoring in the future.
