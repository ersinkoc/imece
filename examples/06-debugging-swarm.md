# Example 6: Debugging with a Swarm

This example demonstrates how multiple agents collaborate to debug a complex production issue.

## The Incident

**Alert**: Production checkout failure rate spiked to 15%

**Team**:
- Selin (Tech Lead) — Coordinating
- Burak (Backend) — Investigating API
- Cem (Frontend) — Investigating UI
- Duygu (DevOps) — Checking infrastructure
- Ege (QA) — Reproducing issue

## Phase 1: Initial Response

### Step 1: Alert and Assembly

```bash
# Selin creates incident task
npx imece task create selin selin "INCIDENT: Checkout failures" \
  --desc "Production checkout failing at 15% rate. Started at 14:32 UTC." \
  --criteria "Root cause identified,Fix deployed,Verification complete,Post-mortem scheduled" \
  --priority urgent \
  --tags "incident,p0,checkout"

npx imece task claim <incident-task-id> selin

# Alert team
npx imece broadcast selin "🚨 INCIDENT: Checkout failing (15% error rate)\n\nAll hands on deck. Check your tasks and start investigation.\n\nBurak: API logs\nCem: Error tracking\nDuygu: Infrastructure\nEge: Reproduction"
```

### Step 2: Parallel Investigation

Each agent investigates their domain:

```bash
# Burak checks API logs
npx imece broadcast burak "Checking API logs..."
npx imece task note <incident-task-id> burak "API error rate: 18%"
npx imece task note <incident-task-id> burak "Primary error: 'Database timeout'"

# Cem checks frontend
npx imece broadcast cem "Checking error tracking..."
npx imece task note <incident-task-id> cem "Frontend errors: 500 on /api/checkout/confirm"
npx imece task note <incident-task-id> cem "Users seeing: 'Something went wrong'"

# Duygu checks infrastructure
npx imece broadcast duygu "Checking infrastructure..."
npx imece task note <incident-task-id> duygu "Database CPU: 95% (spike at 14:30)"
npx imece task note <incident-task-id> duygu "Connection pool maxed out"

# Ege tries to reproduce
npx imece broadcast ege "Attempting reproduction..."
npx imece task note <incident-task-id> ege "Can reproduce: 3/20 attempts failed"
npx imece task note <incident-task-id> ege "Pattern: Only fails with large carts (10+ items)"
```

## Phase 2: Information Sharing

### Step 3: Sync and Correlate

```bash
# Selin correlates findings
npx imece broadcast selin "📝 Initial findings:\n\n- API: Database timeouts\n- Infra: DB CPU 95%, connection pool maxed\n- Pattern: Large carts only\n\nHypothesis: Query performance issue with large carts."

# Burak investigates query
npx imece lock burak src/services/checkout.ts
# Examines inventory query...
npx imece task note <incident-task-id> burak "Found it! Inventory query has O(n²) complexity"
npx imece task note <incident-task-id> burak "For 10 items, does 100 DB queries"
npx imece unlock burak src/services/checkout.ts

# Shares finding
npx imece send burak selin "Root cause found" \
  --body "The inventory reservation loop queries the DB for each item inside another loop.\n\nFile: src/services/checkout.ts:142\nFunction: reserveInventory()\n\nThis is N+1 query problem amplified." \
  --type message
```

### Step 4: Propose Fix

```bash
# Burak proposes solution
npx imece send burak selin "Proposed fix" \
  --body "Batch the inventory queries:\n\nCurrent:\n```\nfor item in cart {\n  for warehouse in warehouses {\n    db.query(...)  // N*M queries!\n  }\n}\n```\n\nFix:\n```\nconst items = db.query('SELECT ... WHERE id IN (?)', cart.itemIds)\nconst warehouses = db.query('SELECT ...')\n// Process in memory\n```\n\nReduces 100 queries to 2." \
  --type message

# Selin approves
npx imece reply selin <proposal-msg-id> "Approved! Implement and test immediately."
```

## Phase 3: Fix and Verify

### Step 5: Implement Fix

```bash
# Burak implements
npx imece lock burak src/services/checkout.ts

# Makes fix...
npx imece task note <incident-task-id> burak "Fixed: Batched inventory queries"
npx imece task note <incident-task-id> burak "Query count: 100 → 2 per checkout"

# Tests locally
npx imece task note <incident-task-id> burak "Local tests passing"
npx imece task note <incident-task-id> burak "Load test: 1000 checkouts, 0 failures"

npx imece unlock burak src/services/checkout.ts
```

### Step 6: Code Review (Expedited)

```bash
# Selin reviews quickly
npx imece send burak selin "Quick review" --type review-request

# Review done
npx imece send selin burak "LGTM! 🚀" --type approval

# Cem also reviews (frontend impact)
npx imece send burak cem "Frontend impact check" --type question
npx imece reply cem <question-msg-id> "No frontend changes needed. API contract unchanged."
```

### Step 7: Deploy

```bash
# Duygu deploys
npx imece task create selin duygu "Hotfix: Checkout performance" \
  --desc "Deploy inventory query optimization" \
  --criteria "Staging test,Production deploy,Monitoring verification" \
  --priority urgent

npx imece task claim <deploy-task-id> duygu

# Deploy...
npx imece task note <deploy-task-id> duygu "Staging deployed - tests pass"
npx imece task note <deploy-task-id> duygu "Production deployed 15:45 UTC"

npx imece task complete <deploy-task-id> duygu --note "Deploy complete"

npx imece broadcast duygu "🚀 Hotfix deployed!"
```

## Phase 4: Verification

### Step 8: Monitor Recovery

```bash
# Duygu monitors metrics
npx imece broadcast duygu "Monitoring (5 min post-deploy):\n- Error rate: 15% → 0.2%\n- DB CPU: 95% → 45%\n- Response time: 2s → 200ms"

# Burak confirms
npx imece broadcast burak "API logs: No more timeouts"

# Cem confirms
npx imece broadcast cem "Frontend: No more 500s"

# Ege verifies
npx imece task note <incident-task-id> ege "Reproduction test: 20/20 success"
npx imece broadcast ege "QA verification: PASSED ✅"
```

### Step 9: Resolve Incident

```bash
# Selin marks incident resolved
npx imece task complete <incident-task-id> selin \
  --note "RESOLVED: Database query optimization deployed. Error rate 0.2%."

# Final broadcast
npx imece broadcast selin "✅ INCIDENT RESOLVED\n\nRoot cause: N+1 query in inventory reservation\nFix: Batched queries (100 → 2)\nImpact time: 73 minutes\n\nPost-mortem scheduled tomorrow."
```

## Phase 5: Post-Incident

### Step 10: Add Regression Tests

Ege adds tests to prevent recurrence:

```bash
npx imece task create selin ege "Add checkout load tests" \
  --desc "Prevent regression of N+1 query issue" \
  --criteria "Test with 20+ items,Assert query count < 5,Run in CI"

npx imece task claim <test-task-id> ege
npx imece lock ege tests/performance/checkout-queries.test.ts

# Writes test...
npx imece task note <test-task-id> ege "Test verifies < 5 DB queries for 20 items"
npx imece task complete <test-task-id> ege --note "Test added to CI pipeline"
npx imece unlock ege tests/performance/checkout-queries.test.ts
```

### Step 11: Documentation

Burak documents the fix:

```bash
npx imece send burak selin "Documentation" \
  --body "Added to docs/incidents/2024-03-03-checkout-perf.md:\n\n- Root cause\n- Fix details\n- Prevention strategies\n- Monitoring alerts added"
```

### Step 12: Schedule Post-Mortem

```bash
npx imece broadcast selin "📅 Post-Mortem: Checkout Performance Incident\n\nWhen: Tomorrow 10:00 UTC\nWhere: docs/incidents/2024-03-03-checkout-perf.md\n\nAttendees: All\n\nAgenda:\n- Timeline review\n- What went well\n- What could improve\n- Action items"
```

## Debugging Patterns

### Pattern 1: Divide and Conquer

Each agent investigates their domain:
- Backend → Logs, traces, metrics
- Frontend → Error tracking, user reports
- DevOps → Infrastructure, network
- QA → Reproduction, patterns

### Pattern 2: Information Radiators

Use broadcasts for:
- Incident start
- Finding updates
- Status changes
- Resolution

### Pattern 3: Timeline Notes

Document everything in the incident task:
```bash
npx imece task note <incident-task-id> <agent> "Finding: ..."
```

Creates audit trail for post-mortem.

### Pattern 4: Quick Reviews

During incidents:
- Skip formal review process
- One senior approval sufficient
- Document "expedited review" in notes

### Pattern 5: Verification Gates

Before declaring "fixed":
1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Monitor for 10+ minutes
5. QA reproduction test
6. All clear → resolved

## Communication Templates

### Incident Start

```bash
npx imece broadcast <lead> "🚨 INCIDENT: [brief description]\n\nImpact: [what's broken]\nSeverity: [P0/P1/P2]\n\n[Agent]: [task]\n[Agent]: [task]"
```

### Status Update

```bash
npx imece broadcast <agent> "[Emoji] [Area]: [Finding/Status]"
# Examples:
# 🔍 API: Investigating logs
# ✅ Frontend: No errors found
# 📊 Infra: DB CPU normal
```

### Finding

```bash
npx imece send <finder> <lead> "Finding: [title]" \
  --body "[Details]\n\nLocation: [file:line]\nImpact: [what it affects]" \
  --type message
```

### Fix Ready

```bash
npx imece send <implementer> <reviewer> "Fix ready: [title]" \
  --body "[What changed]\n\nTests: [status]\nReady for expedited review" \
  --type review-request
```

### Resolution

```bash
npx imece broadcast <lead> "✅ INCIDENT RESOLVED\n\nRoot cause: [what]\nFix: [what]\nImpact time: [duration]\n\n[Next steps]"
```

## Tools Integration

### Linking to Monitoring

```bash
# Include dashboard links in messages
npx imece send burak selin "Error pattern" \
  --body "See Grafana: https://grafana/d/checkout-errors\n\nErrors cluster around inventory queries."
```

### Log References

```bash
# Reference specific log lines
npx imece task note <incident-id> burak "Log: 2024-03-03T14:32:15Z ERROR timeout"
```

## Key Takeaways

1. **Parallel investigation** — Don't wait, investigate simultaneously
2. **Frequent updates** — Broadcast every 5-10 minutes
3. **Document findings** — Notes create audit trail
4. **Quick reviews** — Expedite during incidents
5. **Verification gates** — Confirm fix before resolving
6. **Post-incident work** — Tests, docs, post-mortem
7. **Stay calm** — Professional communication under pressure
8. **Learn** — Every incident improves the system

## Prevention

```bash
# Add monitoring alert as code
npx imece lock duygu monitoring/alerts/checkout.yml
# Define alert for error rate > 1%
npx imece unlock duygu monitoring/alerts/checkout.yml

# Add query performance linting
npx imece lock ege .github/workflows/query-check.yml
# CI check for N+1 queries
npx imece unlock ege .github/workflows/query-check.yml
```

---

These examples cover the main workflows for using imece. Adapt them to your team's needs!