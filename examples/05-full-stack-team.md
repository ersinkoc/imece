# Example 5: Full-Stack Team Coordination

This example demonstrates a full-stack team working on a complex feature across multiple layers.

## The Team

| Agent | Role | Primary Tools | Responsibilities |
|-------|------|---------------|------------------|
| Selin | Tech Lead | Claude Code | Architecture, coordination, final review |
| Burak | Backend Lead | Cursor | API design, database, business logic |
| Cem | Frontend Lead | Cursor | UI/UX, components, state management |
| Duygu | DevOps | Windsurf | Infrastructure, CI/CD, monitoring |
| Ege | QA Engineer | Claude Code | Testing, quality gates, bug tracking |

## The Feature: E-commerce Checkout

A complex feature requiring coordination across all layers:
- **API**: Payment processing, inventory, order management
- **Frontend**: Checkout flow, payment forms, confirmation
- **Database**: Transaction handling, inventory updates
- **Infrastructure**: Secure payment webhooks, monitoring
- **QA**: Integration tests, security tests, load tests

## Phase 1: Planning

### Step 1: Tech Lead Creates Architecture

```bash
# Selin creates the master task
npx imece task create selin selin "Design checkout architecture" \
  --desc "Create comprehensive architecture for e-commerce checkout flow" \
  --criteria "API specification,Database schema,Frontend flow diagram,Security requirements,Error handling strategy,Integration points documented" \
  --priority urgent \
  --tags "architecture,checkout,epic"

# Work on it...
npx imece task claim <arch-task-id> selin

# Complete
npx imece task complete <arch-task-id> selin --note "Architecture doc in docs/arch/checkout.md"
```

### Step 2: Decomposition

Selin breaks down the work:

```bash
# Backend tasks
npx imece task create selin burak "Implement checkout API" \
  --desc "REST API for checkout process" \
  --criteria "POST /api/checkout/initiate,POST /api/checkout/payment,POST /api/checkout/confirm,Error handling,Input validation" \
  --priority high \
  --blocked-by "" \
  --tags "api,checkout"

npx imece task create selin burak "Implement inventory reservation" \
  --desc "Reserve inventory during checkout to prevent overselling" \
  --criteria "Reservation on checkout start,Release on timeout,Commit on completion,Inventory table updates" \
  --priority high \
  --blocked-by "<checkout-api-task-id>" \
  --tags "api,database,inventory"

# Frontend tasks
npx imece task create selin cem "Build checkout UI flow" \
  --desc "Multi-step checkout UI with validation" \
  --criteria "Shipping info step,Payment info step,Review step,Confirmation page,Progress indicator" \
  --priority high \
  --tags "frontend,ui,checkout"

npx imece task create selin cem "Integrate payment widget" \
  --desc "Integrate Stripe payment element" \
  --criteria "Stripe Elements setup,Card input component,Error display,Success handling" \
  --priority high \
  --blocked-by "<checkout-ui-task-id>" \
  --tags "frontend,payment"

# DevOps tasks
npx imece task create selin duygu "Setup payment webhooks" \
  --desc "Secure webhook endpoints for payment provider" \
  --criteria "Webhook endpoint,Signature verification,Idempotency handling,Retry logic,Monitoring alerts" \
  --priority high \
  --tags "devops,webhook,security"

npx imece task create selin duygu "Checkout monitoring" \
  --desc "Monitoring and alerting for checkout flow" \
  --criteria "Success rate metrics,Error rate alerts,Performance dashboards,SLI/SLO definitions" \
  --priority normal \
  --blocked-by "<payment-webhooks-task-id>" \
  --tags "devops,monitoring"

# QA tasks
npx imece task create selin ege "Checkout integration tests" \
  --desc "End-to-end integration tests for checkout" \
  --criteria "Happy path test,Error scenarios,Edge cases,Payment failure handling,Timeout scenarios" \
  --priority high \
  --blocked-by "<checkout-api-task-id>,<checkout-ui-task-id>" \
  --tags "qa,testing"

npx imece task create selin ege "Checkout load tests" \
  --desc "Performance testing for checkout under load" \
  --criteria "100 concurrent users,1000 concurrent users,Identify bottlenecks,Capacity planning" \
  --priority normal \
  --blocked-by "<integration-tests-task-id>" \
  --tags "qa,performance"
```

### Step 3: Kickoff Meeting (Async)

```bash
# Selin broadcasts kickoff
npx imece broadcast selin "🚀 Checkout feature kickoff!\n\nArchitecture: docs/arch/checkout.md\nTasks created and assigned.\n\nBurak: API + Inventory\nCem: UI + Payment integration\nDuygu: Webhooks + Monitoring\nEge: Tests (starts after implementation)\n\nLet's sync in 24h for progress check."

# Each team member acknowledges
npx imece broadcast burak "Backend tasks acknowledged. Starting API design."
npx imece broadcast cem "Frontend tasks acknowledged. Reviewing architecture doc."
npx imece broadcast duygu "DevOps tasks acknowledged. Starting webhook infrastructure."
npx imece broadcast ege "QA tasks noted. Will start after implementation stabilizes."
```

## Phase 2: Parallel Development

### Backend (Burak)

```bash
# Claims and starts
npx imece task claim <checkout-api-task-id> burak

# Locks files
npx imece lock burak src/api/checkout.ts
npx imece lock burak src/services/checkout.ts

# Work...
npx imece task note <checkout-api-task-id> burak "POST /api/checkout/initiate implemented"
npx imece task note <checkout-api-task-id> burak "Payment endpoint with validation complete"

# Complete
npx imece task complete <checkout-api-task-id> burak --note "API ready for frontend integration"
npx imece unlock burak src/api/checkout.ts
npx imece unlock burak src/services/checkout.ts

# Notify team
npx imece broadcast burak "Checkout API complete! 🎉\nDocs: docs/api/checkout.md"
```

### Frontend (Cem)

```bash
# Claims UI task (can proceed in parallel)
npx imece task claim <checkout-ui-task-id> cem

# Locks and builds UI shell
npx imece lock cem src/components/checkout/

# Work on UI structure...
npx imece task note <checkout-ui-task-id> cem "Checkout flow structure complete"
npx imece task note <checkout-ui-task-id> cem "All 4 steps implemented with navigation"

# Blocked: needs API
npx imece send cem burak "API integration ready?" --type question

# API is ready, integrate
npx imece task note <checkout-ui-task-id> cem "API integration complete"
npx imece task complete <checkout-ui-task-id> cem --note "UI complete, ready for payment widget"
npx imece unlock cem src/components/checkout/
```

### DevOps (Duygu)

```bash
# Works in parallel on infrastructure
npx imece task claim <payment-webhooks-task-id> duygu

# Sets up webhooks
npx imece lock duygu infra/webhooks/
npx imece task note <payment-webhooks-task-id> duygu "Webhook endpoint deployed"
npx imece task note <payment-webhooks-task-id> duygu "Signature verification implemented"
npx imece task complete <payment-webhooks-task-id> duygu --note "Webhooks ready for testing"
npx imece unlock duygu infra/webhooks/

npx imece broadcast duygu "Payment webhooks deployed! 🔒"
```

### Coordination Check (24h)

```bash
# Selin checks progress
npx imece status

# Sees:
# - Burak: API done ✅
# - Cem: UI done ✅
# - Duygu: Webhooks done ✅
# - All ready for integration

npx imece broadcast selin "24h check: All components ready! 🎉\n\nNext: Integration phase.\nCem: Please integrate payment widget\nEge: Start writing integration tests"
```

## Phase 3: Integration

### Payment Integration

Cem integrates the payment widget:

```bash
# Claims blocked task (now unblocked)
npx imece task claim <payment-widget-task-id> cem

# Locks files
npx imece lock cem src/components/checkout/PaymentStep.tsx
npx imece lock cem src/lib/stripe.ts

# Integrates Stripe...
npx imece task note <payment-widget-task-id> cem "Stripe Elements integrated"
npx imece task note <payment-widget-task-id> cem "Payment confirmation flow working"

# Blocked: needs testing
npx imece task block <payment-widget-task-id> "Need E2E testing before completion"
```

### QA Starts Testing

Ege begins integration testing:

```bash
# Unblocked: implementation ready
npx imece task claim <integration-tests-task-id> ege

npx imece lock ege tests/integration/checkout.test.ts

# Writes tests...
npx imece task note <integration-tests-task-id> ege "Happy path test passing"
npx imece task note <integration-tests-task-id> ege "Error scenarios tested"

npx imece task complete <integration-tests-task-id> ege --note "95% coverage on checkout flow"
npx imece unlock ege tests/integration/checkout.test.ts

# Report bugs found
npx imece send ege cem "Bug: Payment timeout handling" \
  --body "When payment takes >30s, the UI shows error but doesn't allow retry.\n\nTest: tests/integration/checkout.test.ts:145\n\nPriority: High" \
  --type blocker
```

### Bug Fix Cycle

Cem fixes the bug:

```bash
npx imece inbox cem
npx imece reply cem <bug-msg-id> "Looking into it now"

npx imece lock cem src/components/checkout/PaymentStep.tsx
# Fix...
npx imece unlock cem src/components/checkout/PaymentStep.tsx

npx imece send cem ege "Bug fixed" \
  --body "Added timeout handling with retry button.\nCommit: abc123" \
  --type status-update

# Unblock task
npx imece task unblock <payment-widget-task-id>
npx imece task complete <payment-widget-task-id> cem --note "Integrated and tested"
```

## Phase 4: Final QA and Deployment

### Security Review

Ege conducts security testing:

```bash
npx imece send ege burak "Security review: Checkout API" \
  --body "Found potential issue:\n- No rate limiting on /api/checkout/initiate\n- Could allow enumeration attacks\n\nRecommend adding rate limiter." \
  --type review-request \
  --priority urgent

# Burak fixes
npx imece lock burak src/api/checkout.ts
# Add rate limiter...
npx imece unlock burak src/api/checkout.ts

npx imece send burak ege "Rate limiting added" \
  --body "Added 10 req/min rate limit on checkout endpoints." \
  --type approval
```

### Load Testing

```bash
npx imece task claim <load-tests-task-id> ege

# Run tests...
npx imece task note <load-tests-task-id> ege "100 users: PASS (avg 200ms)"
npx imece task note <load-tests-task-id> ege "1000 users: PASS (avg 450ms)"
npx imece task note <load-tests-task-id> ege "Bottleneck identified: inventory check"

npx imece send ege burak "Performance: Inventory check slow" \
  --body "Under load, inventory reservation takes 80% of request time.\nRecommend adding caching."

# Burak optimizes
npx imece lock burak src/services/inventory.ts
# Add caching...
npx imece unlock burak src/services/inventory.ts

npx imece task complete <load-tests-task-id> ege --note "All tests pass, 1000 users supported"
```

### Final Review

Selin conducts final review:

```bash
# Check all tasks
npx imece task list --status done

# Review code
npx imece send selin burak "Final review: Backend" --type review-request
npx imece send selin cem "Final review: Frontend" --type review-request
npx imece send selin duygu "Final review: DevOps" --type review-request

# All approve
npx imece broadcast selin "🎉 Checkout feature APPROVED for release!"
```

### Deployment

Duygu deploys:

```bash
npx imece task create selin duygu "Deploy checkout feature" \
  --desc "Deploy to production" \
  --criteria "Staging deployment,Smoke tests,Production deployment,Monitoring verification" \
  --priority urgent

npx imece task claim <deploy-task-id> duygu

# Deploy...
npx imece task note <deploy-task-id> duygu "Staging deployed"
npx imece task note <deploy-task-id> duygu "Smoke tests passed"
npx imece task note <deploy-task-id> duygu "Production deployed"
npx imece task note <deploy-task-id> duygu "Monitoring healthy"

npx imece task complete <deploy-task-id> duygu --note "Checkout live! 🚀"

npx imece broadcast duygu "🚀 Checkout feature LIVE in production!"
```

## Post-Launch

### Monitoring

```bash
# Watch metrics
npx imece broadcast duygu "Checkout metrics (1h post-launch):\n- Success rate: 99.2%\n- Avg completion time: 2.3min\n- Error rate: 0.8%"

# Ege watches for issues
npx imece send ege selin "Monitoring: 2 minor issues" \
  --body "1. Mobile users seeing slightly higher error rate (2%)\n2. Some users confused about shipping options\n\nNeither is blocking, but worth addressing next sprint."
```

### Retrospective

```bash
# Schedule retrospective
npx imece broadcast selin "📅 Checkout retro scheduled for tomorrow.\n\nWins:\n- Deployed on time\n- High test coverage\n- Good coordination\n\nImprovements:\n- Better mobile testing\n- Clearer UX for shipping\n\nGreat work team! 🎉"
```

## Key Takeaways

1. **Architecture first** — Selin's architecture doc aligned everyone
2. **Task decomposition** — Clear breakdown prevented confusion
3. **Parallel development** — Backend/Frontend/DevOps worked simultaneously
4. **Dependency tracking** — Blocked tasks waited for dependencies
5. **Async coordination** — Broadcasts kept everyone informed
6. **QA integration** — Testing throughout, not just at end
7. **Bug tracking** — Issues reported via messages with context
8. **Load testing** — Found and fixed performance issues
9. **Security review** — Caught issues before production
10. **Monitoring** — Watched metrics post-launch

## Metrics

```bash
# See development velocity
npx imece timeline --limit 100

# Count tasks completed
npx imece task list --status done | wc -l

# See bug fixes
npx imece search "bug" --type message

# Communication volume
npx imece timeline | grep "message:sent" | wc -l
```

## Next Steps

See [06-debugging-swarm.md](06-debugging-swarm.md) for debugging patterns with multiple agents.