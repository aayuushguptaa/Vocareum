---
description: "Intelligent support ticket routing system with multi-agent architecture"
tools:
  - bash
  - read
  - grep
  - glob
---

# Support Ticket Routing System

This file configures Claude Code for an intelligent customer support ticket routing system that automatically triages, analyzes, and routes 5,000+ support tickets daily using specialized subagents.

## Project Overview

An enterprise-grade support ticket system that uses AI-powered agents to automatically classify and route customer support requests. The system handles high-volume ticket intake across email, chat, and web forms, reducing average response time from 4 hours to under 10 seconds through parallel agent processing and knowledge base integration.

**Key capabilities:**
- Automatic urgency classification (URGENT, HIGH, MEDIUM, LOW)
- Category identification (Technical, Billing, General)
- Intelligent routing to appropriate teams
- SLA deadline calculation and monitoring
- 40% auto-resolution rate for common issues

## Architecture

This system uses specialized subagents for efficient parallel ticket analysis:

- **ticket-analyzer**: Core analysis agent that classifies tickets by urgency, category, and routing destination (Haiku - fast and efficient)
- **ticket-classification skill**: Teaches Claude domain-specific knowledge about ticket priorities, categories, urgency keywords, and routing rules

## How to Use

```bash
# Analyze a technical support ticket (API errors, system issues)
claude "Analyze the ticket in sample-tickets/technical.txt"

# Analyze a billing/payment question
claude "Analyze the ticket in sample-tickets/billing.txt"

# Analyze a general support inquiry
claude "Analyze the ticket in sample-tickets/general.txt"

# Classify all tickets in a directory and show routing recommendations
claude "Classify all tickets in sample-tickets/ and show routing decisions"

# Get a summary of tickets by urgency level
claude "Show me all URGENT and HIGH priority tickets from sample-tickets/"
```

## Ticket Categories

The system classifies all incoming tickets into three main categories:

- **Technical**: API errors, system outages, integration issues, bug reports, performance problems (routes to Engineering)
- **Billing**: Invoice questions, payment issues, subscription changes, refund requests (routes to Finance)
- **General**: How-to questions, feature inquiries, account settings, documentation requests (routes to Support)

## Urgency Levels & SLA

| Urgency | Criteria | SLA Response | Example |
|---------|----------|--------------|---------|
| **URGENT** | System down, security breach, data loss, multiple users affected | Immediate | Production API endpoint returning 500 errors |
| **HIGH** | Core feature broken, enterprise customer impacted | < 1 hour | API authentication failures |
| **MEDIUM** | Feature degraded, workaround available, solution in KB exists | < 4 hours | Invoice charge discrepancy |
| **LOW** | Questions, feature requests, minor bugs, documentation inquiries | < 24 hours | How to export data to CSV |

## SLA Requirements

- **Enterprise customers**: < 1 hour response time (HIGH or URGENT tickets)
- **Standard customers**: < 4 hours response time (MEDIUM or HIGH tickets)
- **General inquiries**: < 24 hours response time (LOW priority)

## System Instructions

When analyzing support tickets, Claude should:

1. **Extract key information** - Customer name, tier, issue description, error messages, affected systems
2. **Determine urgency** - Look for keywords like "down", "urgent", "production", "security", multiple users affected
3. **Categorize the issue** - Is this technical (errors, APIs), billing (payments, invoices), or general (questions, features)?
4. **Identify routing destination** - Route to Engineering, Finance, Support, or Escalation team
5. **Calculate SLA deadline** - Based on customer tier and urgency level
6. **Check knowledge base** - Provide auto-response if confidence > 80%
7. **Output structured JSON** - Include urgency, category, routing, summary, recommended action

## Build Commands

```bash
# Install dependencies (if this were a real project)
npm install

# Run tests
npm test

# Lint code
npm run lint
```

## Key Takeaway

This configuration demonstrates how to:
- Configure Claude Code for enterprise support systems
- Use subagents to specialize in specific domains (ticket analysis)
- Teach domain knowledge through skills (classification rules)
- Implement SLA-aware routing and prioritization
- Enable high-volume automated ticket processing with human oversight for complex cases
