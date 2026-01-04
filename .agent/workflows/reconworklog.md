---
description: Recon the worklog vs git history
---

1. Fetch the git history for the project

   - `git log --date=short --pretty=format:"%ad | %s" | head -n 50`

2. Read the current worklog file

   - Read `docs/journals/worklog.md`

3. Compare the dates and activities in the git log against the headers in the worklog file.

   - Ensure every day with significant code commits has a corresponding `## YYYY-MM-DD (Day X)` header.
   - Ensure the "Day X" count is sequential and accurate.

4. If mismatches are found, update `docs/journals/worklog.md` to align with the Git history.

   - Correct dates.
   - Insert missing day headers.
   - Fix "Day X" numbering.

5. Verify the final timeline tells a coherent story of the project's evolution.
