---
description: restart dev server with cache cleanup
---

# Restart Dashboard Dev Server

Use this workflow when the dev server becomes unresponsive or shows stale code.

## Steps

1. Kill any running Node processes for this project:

```bash
pkill -f "node.*personametry" 2>/dev/null || true
```

2. Wait for processes to terminate:

```bash
sleep 2
```

// turbo 3. Clean up caches (Umi, Turbo, node_modules cache):

```bash
cd /Users/khanmjk/Documents/GitHub/personametry/dashboard && rm -rf node_modules/.cache .umi dist 2>/dev/null || true
```

// turbo 4. Start the dev server:

```bash
cd /Users/khanmjk/Documents/GitHub/personametry/dashboard && npm run dev
```

5. Wait for server to be ready (watch for "App listening at" message) - typically 15-20 seconds.

6. Access the dashboard at: **http://localhost:8000**

## Notes

- The dev server runs on port **8000** by default
- If port 8000 is occupied, check for orphan processes with `lsof -i :8000`
- Hash routing is enabled, so use URLs like `http://localhost:8000/#/dashboard`
