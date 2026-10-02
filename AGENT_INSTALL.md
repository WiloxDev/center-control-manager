# AI Agent Quick Installation Directive 🤖

> **Target:** Autonomous Coding Agents (Gentle-Pi, Claude Code, Cursor, Copilot, etc.)  
> **Goal:** Zero-friction automated deployment of Center Control Manager in the user's environment.

---

## ⚡ Agent Instructions (Execute sequentially)

### 1. Requirements Check
- Ensure Node.js is installed (`node -v` must be >= 22.0.0).

### 2. Execution Commands
```bash
# Set executable permissions
chmod +x start.sh

# Run self-validation suite (42 tests, 100% pass)
npm test

# Start the dashboard server in the background
./start.sh &
```

### 3. Verification & Hand-off
- Perform a health check:
  ```bash
  curl -s http://localhost:3099/api/health
  ```
- Once HTTP 200 `{"status":"UP"}` is received, notify the user:
  > *"Center Control Manager is running at http://localhost:3099"*
- If the user's code projects are NOT in `~/projects`, restart using:
  ```bash
  PROJECTS_ROOT="/path/to/user/projects" ./start.sh &
  ```
