# Git Workflow & Conventions

**Type**: Procedure  
**Audience**: All Engineers  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each major workflow change or quarterly  
**Owner**: Governor Ω

---

## Purpose

Standard Git workflow and commit message conventions for the EURO AI repository. This ensures clean commit history and clear communication about what changed and why.

---

## Branch Strategy

### Branch Naming

**Format**: `[category]/[description]`

**Categories**:

- `feat/` — New feature (e.g., `feat/evidence-linking`)
- `fix/` — Bug fix (e.g., `fix/assessment-validation`)
- `refactor/` — Code refactoring without behavior change (e.g., `refactor/extract-obligation-logic`)
- `docs/` — Documentation only (e.g., `docs/api-reference`)
- `test/` — Test improvements (e.g., `test/add-inventory-coverage`)
- `chore/` — Build/tooling/dependencies (e.g., `chore/upgrade-typescript`)
- `style/` — Formatting/style (e.g., `style/prettier-formatting`)
- `perf/` — Performance improvements (e.g., `perf/optimize-assessment-queries`)

**Description**:

- Lowercase
- Use hyphens (not underscores)
- Descriptive but concise (3-5 words)
- Examples:
  - ✅ `feat/add-evidence-linking`
  - ✅ `fix/validate-assessment-input`
  - ❌ `feature/adding_evidence_linking_functionality`
  - ❌ `bug/issue`

**Current Naming** (for institutional work):

- All work uses: `claude/[roadmap-identifier]`
- Example: `claude/alpha-cathedral-roadmap-2tea9o`

### Creating a Feature Branch

```bash
# Fetch latest from remote
git fetch origin

# Create branch from main
git checkout -b feat/your-feature-name origin/main

# Verify you're on correct branch
git branch
```

### Keeping Branch Up-to-Date

**If main has changed**:

```bash
# Fetch latest
git fetch origin

# Rebase (preferred: keeps history linear)
git rebase origin/main

# If conflicts: resolve them, then continue
git rebase --continue

# Re-run tests after rebase
npm test
```

**Never use merge** (creates merge commits):

```bash
# ❌ Don't do this
git merge origin/main

# ✅ Do this instead
git rebase origin/main
```

---

## Commit Messages

### Format

```
[type]: [subject]

[body - optional, for detailed explanation]

[footer - optional, for issue references or breaking changes]
```

### Types

- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code refactoring
- `docs` — Documentation changes
- `test` — Test additions/changes
- `perf` — Performance improvements
- `style` — Code style/formatting
- `chore` — Build/dependencies/tooling

### Subject Line Rules

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at end
- <50 characters
- Reference decision or issue if applicable

**Good**:

- `feat: add evidence linking to obligations`
- `fix: validate assessment input before saving`
- `refactor: extract obligation calculation logic`
- `docs: document risk assessment algorithm`

**Bad**:

- `Added feature for evidence linking` (past tense, no type)
- `Fix Bug` (vague, capitalized)
- `REFACTOR: Code cleanup.` (period, all caps)

### Body (Optional)

Use for detailed explanation when WHY is non-obvious:

```
feat: add evidence linking to obligations

This allows users to associate evidence artifacts with specific
obligations, enabling compliance teams to track remediation progress
against required controls. Evidence can have status (submitted, approved)
and link multiple times to the same obligation.

Implements requirement from compliance review: "Track evidence against
obligations for audit trail."
```

### Common Examples

```
feat: create evidence linking API endpoint

fix: validate assessment answer input length

refactor: extract risk calculation to separate module

docs: add API reference for evidence endpoints

test: add integration tests for workspace isolation

perf: optimize assessment query with index

style: run prettier formatting

chore: upgrade typescript to 5.0
```

### References in Commit

If work tracks to GitHub issue or decision:

```
fix: validate assessment input

Fixes #123 (GitHub issue number)
Related: DR-0105 (Decision record)
```

---

## Creating Commits

### Good Commit Practices

**Atomic commits**: Each commit should be a logical unit

❌ Bad:

```
git add . && git commit -m "lots of changes"
# Mixes 5 unrelated features, 10 bug fixes, doc updates
```

✅ Good:

```
# Commit 1: Add evidence linking feature
git add app/api/evidence/[id]/link.ts
git commit -m "feat: add evidence linking endpoint"

# Commit 2: Add validation to evidence
git add lib/validators/evidence.ts
git commit -m "refactor: extract evidence validation"

# Commit 3: Add tests
git add tests/evidence.test.ts
git commit -m "test: add evidence linking tests"
```

### Staging & Committing

```bash
# See what changed
git status

# Stage specific files (preferred)
git add app/api/evidence/route.ts lib/evidence.ts

# Or stage by type
git add -p  # Interactive staging (pick hunks)

# Review what you're about to commit
git diff --staged

# Commit with message
git commit -m "feat: add evidence endpoint"

# Or use interactive if needed
git commit  # Opens editor for detailed message
```

### Fixing Commits

**If you made a typo in the commit message**:

```bash
git commit --amend -m "correct message"
```

**If you forgot to add a file**:

```bash
git add forgotten_file.ts
git commit --amend  # No `-m` — keeps original message
```

⚠️ **Only amend before pushing**. After pushing, don't amend (it rewrites history).

---

## Pull Requests & Code Review

### Creating a Pull Request

**After commits are pushed**:

```bash
# Push your branch
git push -u origin feat/your-feature-name
```

**On GitHub**:

1. Create PR (GitHub may show "Compare & pull request" button)
2. Title: Same as main commit message
3. Description: Explain changes, why they matter, how to test
4. Reference issues: "Fixes #123" or "Related: DR-0105"
5. Mark as Draft if still WIP

### Addressing Review Feedback

**If reviewer requests changes**:

1. **Make the change locally**

   ```bash
   git checkout feat/your-feature-name
   # ... edit files ...
   git add changed_files.ts
   git commit -m "Address review feedback"
   git push origin feat/your-feature-name
   ```

2. **Don't force-push after review started**
   - Use new commits instead
   - Reviewer can see conversation history

3. **Reply to each comment**
   - Acknowledge the feedback
   - Link to commit that addresses it

### Merging a PR

**Preferred method: Squash Merge**

Before merging, ensure:

- [ ] All checks pass (CI/CD green)
- [ ] All conversations resolved
- [ ] At least one approval
- [ ] Updated docs (if needed)

```bash
# Use GitHub UI or:
gh pr merge <pr-number> --squash
```

This squashes all commits into one, keeping history clean.

**Alternative: Rebase Merge** (if commits are already atomic)

```bash
gh pr merge <pr-number> --rebase
```

**Never: Create merge commit**

```bash
# ❌ Don't do this
git merge feat/branch-name  # Creates merge commit
```

---

## Reviewing Git History

### Viewing Commits

```bash
# See last 5 commits
git log --oneline -n 5

# See commits on this branch vs main
git log --oneline main..HEAD

# See commits by author
git log --author="name"

# See what changed in a commit
git show 1a2b3c4

# See diff between two branches
git diff main..feat/your-feature
```

### Clean History

Before pushing, ensure:

- No unnecessary merge commits
- Commits are logical units
- Commit messages are clear

**To squash commits before pushing**:

```bash
# See how many commits ahead of main
git log --oneline main..HEAD

# Rebase to squash last 5 commits
git rebase -i HEAD~5

# In editor: Change "pick" to "squash" for commits to combine
# Save and force-push
git push -f origin feat/your-feature  # Only ok before review!
```

---

## Troubleshooting

### Accidentally on Wrong Branch

```bash
# Stash current work
git stash

# Switch to correct branch
git checkout correct-branch

# Restore work
git stash pop
```

### Merge Conflicts After Rebase

```bash
# Rebase encounters conflict
# Fix conflicts in files (look for <<<, ===, >>>)
git add resolved_files.ts
git rebase --continue
```

### Committed to Wrong Branch

```bash
# You committed to main instead of feature branch
# Find the commit hash
git log --oneline -n 5

# Create a new branch from this commit
git checkout -b feat/oops-correct-branch 1a2b3c4

# Remove the commit from main
git checkout main
git reset --hard origin/main  # Reverts main to remote
```

### Pushed Sensitive Info

```bash
# Remove file from history
git filter-branch --tree-filter 'rm -f .env' HEAD

# Force push to update remote (dangerous! only if truly critical)
git push -f origin main
```

---

## Deployment Preparation

### Before Pushing to Main

1. **Verify tests pass**

   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

2. **Rebase on latest main**

   ```bash
   git fetch origin
   git rebase origin/main
   npm test  # Re-run after rebase
   ```

3. **View changes being deployed**

   ```bash
   git log main..HEAD  # Commits being added
   git diff main      # All changes
   ```

4. **Push to feature branch first**

   ```bash
   git push origin feat/your-feature
   ```

5. **Create PR, get review, merge via GitHub** (don't merge locally)

---

## Quick Reference

| Task             | Command                                 |
| ---------------- | --------------------------------------- |
| Create branch    | `git checkout -b feat/name origin/main` |
| Commit change    | `git commit -m "type: description"`     |
| Push branch      | `git push -u origin feat/name`          |
| Keep updated     | `git rebase origin/main && npm test`    |
| View commits     | `git log --oneline -n 5`                |
| Undo last commit | `git reset --soft HEAD~1`               |
| Fix message      | `git commit --amend`                    |
| Clean up         | `git branch -d feat/old-branch`         |

---

## References

- `CHECKLISTS/PRE_DEPLOYMENT.md` — Pre-deployment verification (includes git checks)
- `RUNBOOKS/DEPLOYMENT.md` — Deployment procedure
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
