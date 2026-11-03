---
name: ticket-classification
description: Classify support tickets by urgency, category, and routing destination. Use when analyzing tickets, determining priority, routing customer requests, or providing SLA calculations.
allowed-tools: Read, Grep
---

# Ticket Classification Skill

This skill teaches Claude how to systematically classify support tickets based on urgency level, category type, and appropriate routing destination. It provides the domain knowledge for consistent, accurate ticket prioritization.

## When to Use This Skill

Use this skill when the user requests:
- "Analyze this support ticket"
- "What's the priority of this issue?"
- "Route this ticket appropriately"
- "Classify tickets by urgency"
- "Determine SLA deadline for this issue"
- "Is this technical or billing?"

## Classification Matrix

### Urgency Levels

| Level | Criteria | Response Time | Examples |
|-------|----------|----------------|----------|
| **URGENT** | System down, security breach, data loss, multiple users affected, production blocking | Immediate (<5 min) | Production API outage, Data loss, Security breach |
| **HIGH** | Core feature broken, enterprise customer impacted, customer blocked from work | < 1 hour | Authentication failure, Dashboard not loading, API errors |
| **MEDIUM** | Feature degraded, workaround available, non-critical system affected | < 4 hours | Slow performance, Invoice discrepancy, Feature bug |
| **LOW** | Questions, feature requests, documentation, minor issues | < 24 hours | How-to questions, Feature requests, CSV export inquiry |

### Urgency Keywords

**URGENT indicators:**
- "system down" or "outage"
- "production error" or "production issue"
- "500 error" or "critical error"
- "security breach" or "data loss"
- "5,000 users" or "large scale impact"
- "ASAP" or "immediate" or "critical"

**HIGH indicators:**
- "cannot access" or "not working"
- "error" or "failed" or "failing"
- "enterprise customer" or "enterprise account"
- "dashboard" or "API" with issues
- "broken" or "blocked"

**MEDIUM indicators:**
- "slow" or "performance"
- "charge" or "invoice" or "billing"
- "question about" or "unclear"
- "how do I" but with business impact
- "doesn't work" but has workaround

**LOW indicators:**
- "how to" or "how do I"
- "feature request" or "would like"
- "not urgent" (explicitly stated)
- "CSV export" or "documentation"
- "account settings" question

### Category Classification

**Technical Category** - Route to Engineering:
- API errors, timeouts, or connection failures
- Database errors or connection issues
- System outages or service unavailable
- Error messages (500, 503, timeout)
- Stack traces or error logs provided
- Integration issues or webhook problems
- Performance degradation

**Billing Category** - Route to Finance:
- Invoice questions or discrepancies
- Payment processing issues
- Subscription charges or upgrades
- Refund requests
- Pricing questions or plan changes
- Usage-based charges
- Billing disputes

**General Category** - Route to Support:
- How-to questions and feature inquiries
- Account settings or profile changes
- Feature requests or feedback
- Documentation questions
- Export or reporting features
- General knowledge base questions

## Classification Process

1. **Read the complete ticket** - Extract subject, description, customer info, error messages, and impact
2. **Assess business impact** - How many users? Core feature or peripheral? Time-sensitive?
3. **Identify urgency level** - Look for keywords, count urgency signals, consider customer tier
4. **Determine category** - Is this technical (errors), billing (payment), or general (questions)?
5. **Calculate SLA deadline** - Apply matrix: urgency + customer tier = response deadline
6. **Identify routing** - Match category and urgency to appropriate team
7. **Generate confidence score** - 0.0-1.0 based on clarity and keyword matches

## Examples

### Example 1: Technical - URGENT - Production Outage

```
Subject: 500 Errors on API Endpoint

Customer: Acme Corp (Enterprise)
Submitted: 2025-01-17 10:30 AM

Description:
We're experiencing 500 Internal Server errors on the /api/v2/users endpoint.
This started approximately 2 hours ago and is affecting our production application.
We have about 5,000 active users who cannot access their dashboards.
Error: "Internal Server Error: Database connection timeout"
```

**Classification:**
- Urgency: **URGENT** (production outage, 5,000 users affected, explicit error, customer cannot operate)
- Category: **Technical** (API error, database connection, error message provided)
- Routing: **Escalation** (page on-call engineer immediately)
- Customer tier: **Enterprise**
- Reasoning: Multiple URGENT indicators: "500 errors", "production", "5,000 users", "cannot access". This is a production-blocking technical issue requiring immediate escalation.
- SLA deadline: Immediate (< 5 minutes)
- Confidence: 0.99

### Example 2: Billing - MEDIUM - Invoice Question

```
Subject: Question about invoice charges

Customer: Small Business Co (Standard)
Submitted: 2025-01-17 11:15 AM

Description:
I received my invoice for this month and noticed the charge is $500,
but I expected around $400. Can you help me understand the additional $100?
I checked account settings and we're still on Professional plan at $400/month.
Did our usage go over the included limits? I'd like clarification before payment.
```

**Classification:**
- Urgency: **MEDIUM** (billing discrepancy, non-emergency, customer wants clarification before payment)
- Category: **Billing** (invoice charge question, pricing plan, usage inquiry)
- Routing: **Support** (check billing FAQ/KB first) or Finance if escalated
- Customer tier: **Standard**
- Reasoning: Billing keywords: "invoice", "charge", "pricing plan", "usage". Not urgent because no system impact, but needs resolution within 4 hours to prevent payment issues. Standard customer with reasonable response time.
- SLA deadline: < 4 hours
- Confidence: 0.95

### Example 3: General - LOW - Feature Question

```
Subject: How to export data to CSV

Customer: TechStartup Inc (Standard)
Submitted: 2025-01-17 09:45 AM

Description:
I'm trying to export user data to CSV for analysis but can't find the option.
Is there export capability? Where can I find this feature?
Also, what formats besides CSV are available (JSON for analytics pipeline)?
Not urgent - planning for quarterly review next month.
```

**Classification:**
- Urgency: **LOW** (explicitly "not urgent", planning activity, no business impact)
- Category: **General** (how-to question, feature inquiry, documentation request)
- Routing: **Support** (knowledge base or FAQ, auto-response possible)
- Customer tier: **Standard**
- Reasoning: Keywords indicate feature/how-to question: "How to", "export", "formats available", "not urgent". No system impact, no errors, general documentation question.
- SLA deadline: < 24 hours
- Confidence: 0.97

## Output Format

Provide classification results as JSON for programmatic routing:

```json
{
  "urgency": "URGENT|HIGH|MEDIUM|LOW",
  "category": "technical|billing|general",
  "routing": "escalation|engineering|finance|support",
  "customer_tier": "enterprise|standard",
  "summary": "One sentence summary of the issue",
  "key_indicators": ["keyword1", "keyword2", "keyword3"],
  "affected_users": "Number or 'single user'",
  "sla_deadline": "ISO 8601 timestamp",
  "recommended_action": "Specific action to take",
  "confidence_score": 0.95
}
```

## Quality Checklist

Before finalizing classification, verify:

- [ ] All urgency indicators counted (multi-signal scoring)
- [ ] Customer tier considered in SLA calculation
- [ ] Technical vs billing vs general clearly distinguished
- [ ] Routing destination matches category and urgency
- [ ] Confidence score reflects certainty (0.9+ for clear cases)
- [ ] At least 2-3 keywords found to support classification

## Tips

**Finding urgency indicators:**
- Count keyword frequency (more = higher urgency)
- Look for business impact language ("cannot work", "blocked", "down")
- Check for scale ("5,000 users", "production", "enterprise")
- Consider time sensitivity (timing of issue relative to business needs)

**Categorizing accurately:**
- Technical = errors, exceptions, stack traces, system behaviors
- Billing = money, invoices, subscriptions, charges, pricing
- General = questions, features, how-to, documentation

**Routing decisions:**
- URGENT + Technical → Always escalation
- HIGH + Enterprise → Higher priority than HIGH + Standard
- MEDIUM + Billing → Finance team, not support
- LOW → Almost always support (potentially auto-response)

## Common Pitfalls

❌ **Don't:**
- Classify as URGENT without multiple indicators
- Ignore customer tier when setting SLA
- Route billing to engineering or technical to finance
- Miss context (e.g., "production" means different things in different contexts)
- Over-weight a single keyword without supporting evidence

✅ **Do:**
- Look for combination of signals (multiple urgency keywords)
- Consider customer tier heavily in priority calculation
- Route to specialized team based on category first
- Cite specific text that supports classification
- Be conservative - when in doubt, escalate up one level
