# Example 3: Code Review Pipeline

This example demonstrates a structured code review workflow using imece.

## Overview

A review pipeline ensures code quality through systematic review:

1. **Author** completes work and submits for review
2. **Reviewer** examines code and provides feedback
3. **Author** addresses feedback
4. **Reviewer** approves or requests more changes
5. **Lead** gives final approval (for critical changes)

## Setup

```bash
npx imece init --desc "Code review pipeline demo"

# Register team
npx imece register ali "lead-architect" --caps "architecture,review" --lead
npx imece register zeynep "senior-dev" --caps "typescript,review,api"
npx imece register mehmet "developer" --caps "javascript,frontend"
```

## Review Workflow

### Step 1: Mehmet Completes Work

Mehmet has been working on a feature:

```bash
# 1. Lock files for final edits
npx imece lock mehmet src/components/UserProfile.tsx
npx imece lock mehmet src/hooks/useUser.ts

# 2. Final edits...

# 3. Unlock
npx imece unlock mehmet src/components/UserProfile.tsx
npx imece unlock mehmet src/hooks/useUser.ts

# 4. Submit for review
npx imece send mehmet zeynep "PR: User Profile Component" \
  --body "Implemented user profile component with:\n- Avatar display\n- Profile editing\n- Form validation\n\nFiles changed:\n- src/components/UserProfile.tsx\n- src/hooks/useUser.ts\n- src/types/user.ts\n\nPlease review when you have time." \
  --type review-request \
  --priority normal
```

### Step 2: Zeynep Reviews

Zeynep receives the review request:

```bash
# 1. Check inbox
npx imece inbox zeynep

# 2. Read the request
npx imece read zeynep <msg-id>

# 3. Lock files to prevent changes during review
npx imece lock zeynep src/components/UserProfile.tsx
npx imece lock zeynep src/hooks/useUser.ts

# 4. Review the code...

# 5. Send feedback
npx imece send zeynep mehmet "Review: User Profile" \
  --body "Overall great work! A few suggestions:\n\n1. **Avatar component**: Consider extracting to separate component for reusability\n\n2. **Error handling**: The useUser hook doesn't handle network errors gracefully\n\n3. **Type safety**: The User type should use readonly for ID fields\n\n4. **Testing**: Missing unit tests for the profile form validation\n\nPlease address #2 and #4, others are optional." \
  --type message

# 6. Unlock
npx imece unlock zeynep src/components/UserProfile.tsx
npx imece unlock zeynep src/hooks/useUser.ts
```

### Step 3: Mehmet Addresses Feedback

```bash
# 1. Read feedback
npx imece inbox mehmet
npx imece reply mehmet <review-msg-id> "Thanks for the review! Working on these now."

# 2. Lock and fix
npx imece lock mehmet src/hooks/useUser.ts
# ... fix error handling ...
npx imece unlock mehmet src/hooks/useUser.ts

npx imece lock mehmet src/components/UserProfile.test.tsx
# ... add tests ...
npx imece unlock mehmet src/components/UserProfile.test.tsx

# 3. Respond with changes
npx imece send mehmet zeynep "Review feedback addressed" \
  --body "Changes made:\n1. ✅ Added error handling in useUser hook with retry logic\n2. ✅ Added comprehensive tests for form validation\n3. ⏭️ Will extract Avatar component in follow-up PR\n4. ⏭️ Readonly types will be addressed in type refactor\n\nReady for re-review!" \
  --type message
```

### Step 4: Zeynep Approves

```bash
npx imece inbox zeynep

# Quick re-check...

npx imece send zeynep mehmet "LGTM! ✅" \
  --body "Changes look good. Approved for merge!" \
  --type approval
```

### Step 5: Optional Lead Review

For critical changes, the lead also reviews:

```bash
# Mehmet requests lead review
npx imece send mehmet ali "Ready for final review" \
  --body "Zeynep has approved. This touches auth flow, so requesting your review too." \
  --type review-request

# Ali reviews and approves
npx imece inbox ali
npx imece send ali mehmet "Approved" \
  --body "Auth flow changes look solid. Approved for merge." \
  --type approval
```

## Review Types

### Quick Review

For small, low-risk changes:

```bash
npx imece send mehmet zeynep "Quick review: Bug fix" \
  --body "One-line fix for null pointer exception in utils.ts" \
  --type review-request \
  --priority low

# Zeynep can quick-approve
npx imece reply zeynep <msg-id> "LGTM, ship it!"
```

### Deep Review

For complex architectural changes:

```bash
npx imece send mehmet ali "Deep review: State management refactor" \
  --body "Refactoring from Redux to Zustand.\n\nArchitecture doc: docs/arch/state-management-v2.md\nMigration plan: docs/migration/redux-to-zustand.md\n\nThis affects the entire app, so please review carefully." \
  --type review-request \
  --priority high \
  --expects-reply

# Schedule a discussion
npx imece broadcast ali "Architecture review meeting needed for state management refactor"
```

### Emergency Review

For hotfixes:

```bash
npx imece send mehmet zeynep "URGENT: Security fix" \
  --body "Fixing XSS vulnerability in user input rendering.\n\nNeeds immediate review and deploy." \
  --type review-request \
  --priority urgent

# Zeynep drops everything
npx imece send zeynep mehmet "Reviewing now" --type status-update

# Quick review and approve
npx imece send zeynep mehmet "Approved for hotfix" \
  --body "Fix looks correct. Approved for immediate deploy." \
  --type approval \
  --priority urgent
```

## Review Checklist

### For Authors

Before requesting review:

- [ ] Code works (tested locally)
- [ ] Tests pass
- [ ] No lint errors
- [ ] Self-reviewed
- [ ] Files are unlocked
- [ ] Clear description provided
- [ ] Test instructions included

### For Reviewers

During review:

- [ ] Lock files being reviewed
- [ ] Understand the change
- [ ] Check logic correctness
- [ ] Check edge cases
- [ ] Verify tests
- [ ] Check for security issues
- [ ] Consider performance
- [ ] Verify documentation
- [ ] Unlock files when done

## Handling Rejection

Sometimes changes need significant rework:

```bash
# Zeynep rejects with clear reasoning
npx imece send zeynep mehmet "Needs rework" \
  --body "I think we need a different approach here. The current implementation has race conditions that will cause issues at scale.\n\nLet's discuss the approach before you continue. I'll schedule a call." \
  --type rejection

# Mehmet acknowledges
npx imece reply mehmet <rejection-msg-id> "Understood. Happy to discuss better approaches."

# Create a task to redesign
npx imece task create zeynep mehmet "Redesign user state management" \
  --desc "Address race conditions identified in review" \
  --criteria "Thread-safe implementation,Load testing passed,Reviewed by Zeynep"
```

## Tracking Review State

Use tasks to track review workflow:

```bash
# Create a review task
npx imece task create mehmet zeynep "Review: User Profile PR" \
  --desc "Review PR for User Profile component" \
  --criteria "Code reviewed,Feedback provided,Changes addressed,Approved"

# Zeynep claims and works through it
npx imece task claim <review-task-id> zeynep
npx imece task note <review-task-id> zeynep "Initial review complete, waiting for changes"
# ... changes come in ...
npx imece task note <review-task-id> zeynep "Re-reviewed, approved"
npx imece task complete <review-task-id> zeynep --note "Approved with minor suggestions"
```

## Multiple Reviewers

For changes needing multiple perspectives:

```bash
# Mehmet requests review from both backend and frontend experts
npx imece send mehmet zeynep "Review: Full-stack feature" \
  --body "Please review the frontend aspects" \
  --type review-request

npx imece send mehmet ali "Review: Full-stack feature" \
  --body "Please review the API design" \
  --type review-request

# Both approve
npx imece send zeynep mehmet "Frontend LGTM" --type approval
npx imece send ali mehmet "API design approved" --type approval
```

## Review Metrics

Track review activity via timeline:

```bash
# See all reviews
npx imece timeline --type review-request

# See approval rate (manually track)
npx imece search "approval"

# See average review time
npx imece timeline --limit 50 | grep "review"
```

## Best Practices

1. **Be specific** — Point to exact lines and suggest alternatives
2. **Be kind** — Critique code, not people
3. **Be timely** — Don't let reviews sit
4. **Be thorough** — Don't rubber-stamp
5. **Explain why** — Share reasoning, not just what
6. **Suggest fixes** — Don't just point out problems
7. **Prioritize** — Distinguish blockers from nits

## Key Takeaways

1. **Lock during review** — Prevent changes while reviewing
2. **Clear descriptions** — Help reviewers understand context
3. **Respond promptly** — Don't leave authors waiting
4. **Use approval type** — Explicit approval, not just "looks good"
5. **Track with tasks** — Formalize review workflow
6. **Escalate when needed** — Bring in leads for critical changes
7. **Learn from rejections** — Document why approaches were rejected

## Next Steps

See [04-tdd-pair.md](04-tdd-pair.md) for test-driven development with two agents.