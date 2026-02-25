# Enhanced Vibe-to-Enterprise Framework
## A Comprehensive Template for Delivery Discussion

Based on the team's insights and industry best practices, here's an expanded framework that addresses gaps and adds critical considerations for enterprise delivery.

---

## Executive Summary

The vibe coding approach fundamentally changes the traditional delivery model by **inverting the requirements process**. Instead of: Requirements → Design → Build → Validate, we now have: Prototype → Validate → Extract Requirements → Harden → Deliver.

This requires new processes, estimation models, and quality gates that don't currently exist in traditional delivery frameworks.

---

## Enhanced Process Model

### Phase 0: Pre-Engagement Qualification (NEW)

**Before vibe coding begins, establish:**

| Criteria | Questions to Answer | Why It Matters |
|----------|---------------------|----------------|
| **Problem Fit** | Is this problem suitable for rapid prototyping? | Not all problems benefit from vibe coding |
| **Client Readiness** | Can the client engage in rapid iteration? | Requires available stakeholders |
| **Complexity Assessment** | Is this UI-heavy or logic-heavy? | Vibe coding excels at UI, struggles with complex business logic |
| **Integration Landscape** | How many systems must this connect to? | Integration complexity is often underestimated |
| **Regulatory Environment** | What compliance requirements exist? | GxP, HIPAA, SOX may require specific processes |

**Suitability Matrix:**

| | Low Integration Complexity | High Integration Complexity |
|---|---------------------------|-----------------------------|
| **High UI Focus** | ✅ Ideal for vibe coding<br>Ship full clickable experience and capture decisions early. | ⚠️ Prototype UI only<br>Plan integration separately so downstream systems aren’t underestimated. |
| **High Logic Focus** | ⚠️ Careful scoping<br>Validate complex logic early and keep prototype shallow. | ❌ Traditional approach recommended<br>Use classic discovery + design to cover risk surface. |

---

### Phase 1: Rapid Prototyping (Enhanced)

**What the team identified:**
- BA works with client
- 6 hours to working prototype
- Iterate on front-end

**What to add:**

#### 1.1 Prototype Boundaries Document
Before starting, document explicitly:

```markdown
## Prototype Scope Agreement

### In Scope for Prototype:
- [ ] User interface and flow
- [ ] Basic validation logic
- [ ] Sample data handling

### Explicitly Out of Scope:
- [ ] Security implementation
- [ ] Error handling edge cases
- [ ] Performance optimization
- [ ] Integration with production systems
- [ ] Data persistence
- [ ] Audit logging

### Prototype Lifespan:
- Created: [Date]
- Valid for client demonstration until: [Date + 2 weeks]
- Code disposal/archive date: [Date + 30 days]

### Client Communication:
Client understands this is:
- [ ] A functional wireframe, not production code
- [ ] For validation purposes only
- [ ] Subject to complete rewrite for production
```

#### 1.2 Prompt Engineering Documentation (NEW)
**Critical for reproducibility and handoff:**

```markdown
## Vibe Coding Session Log

### Session Metadata:
- Tool Used: [Claude/ChatGPT/Cursor/etc.]
- Model Version: [e.g., Claude 3.5 Sonnet]
- Date: [Date]
- BA/Developer: [Name]

### Initial Prompt:
[Exact prompt used to generate initial code]

### Iteration History:
1. [Prompt refinement 1] → [Outcome]
2. [Prompt refinement 2] → [Outcome]
...

### Final Working Prompt Set:
[The prompts that produced the accepted prototype]

### Known Limitations Identified During Session:
- [Limitation 1]
- [Limitation 2]
```

**Why this matters:** When engineers need to understand intent or regenerate components, this documentation is invaluable.

#### 1.3 Client Feedback Capture Template

```markdown
## Client Validation Session - [Date]

### Attendees:
- Client: [Names, Roles]
- EPAM: [Names, Roles]

### Demonstrated Flows:
1. [Flow name] - [Accepted/Rejected/Modified]
2. [Flow name] - [Accepted/Rejected/Modified]

### Verbatim Client Feedback:
> "[Exact quote from client about what they liked]"
> "[Exact quote about what needs to change]"

### Agreed Changes:
| Change | Priority | Client Stakeholder |
|--------|----------|-------------------|
| [Change 1] | Must Have | [Name] |
| [Change 2] | Nice to Have | [Name] |

### Open Questions:
- [Question requiring follow-up]

### Sign-off:
Client confirms this prototype represents desired direction: [ ] Yes [ ] Conditional [ ] No
```

---

### Phase 2: Technical Assessment (Significantly Enhanced)

**What the team identified:**
- Use LLM to review code
- Check production readiness
- Identify gaps

**What to add:**

#### 2.1 Multi-Dimensional Assessment Framework

| Dimension | Score (1-5) | Weight | Weighted Score |
|-----------|-------------|--------|----------------|
| Code Structure | ☐ | 15% | ☐ |
| Security Posture | ☐ | 20% | ☐ |
| Error Handling | ☐ | 10% | ☐ |
| Testability | ☐ | 15% | ☐ |
| Scalability | ☐ | 10% | ☐ |
| Maintainability | ☐ | 15% | ☐ |
| Documentation | ☐ | 5% | ☐ |
| Dependency Health | ☐ | 10% | ☐ |

**Overall Score:** ☐

**Recommendation:**
- [ ] Proceed with hardening (Score > 3.5)
- [ ] Selective rewrite (Score 2.5–3.5)
- [ ] Full rewrite recommended (Score < 2.5)

#### 2.2 Detailed Assessment Criteria

**Code Structure (15%)**
```markdown
- [ ] Separation of concerns (UI/Business Logic/Data)
- [ ] Consistent naming conventions
- [ ] Appropriate file/module organization
- [ ] No circular dependencies
- [ ] Reasonable function/method sizes
```

**Security Posture (20%)** ⚠️ *Critical for Life Sciences*
```markdown
- [ ] Input validation present
- [ ] No hardcoded credentials/secrets
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Appropriate authentication hooks
- [ ] Authorization model defined
- [ ] Sensitive data handling appropriate
- [ ] OWASP Top 10 consideration
```

**Error Handling (10%)**
```markdown
- [ ] Try-catch blocks where appropriate
- [ ] User-friendly error messages
- [ ] Error logging capability
- [ ] Graceful degradation
- [ ] No silent failures
```

**Testability (15%)**
```markdown
- [ ] Functions are unit-testable
- [ ] Dependencies are injectable
- [ ] Side effects are isolated
- [ ] Test data can be mocked
- [ ] Clear inputs/outputs
```

**Scalability (10%)**
```markdown
- [ ] No obvious O(n²) or worse algorithms on large data
- [ ] Database queries are optimizable
- [ ] Stateless where possible
- [ ] Caching hooks available
- [ ] Async patterns where appropriate
```

**Maintainability (15%)**
```markdown
- [ ] Code is readable without comments
- [ ] Complex logic is commented
- [ ] No magic numbers/strings
- [ ] Configuration externalized
- [ ] Logging is meaningful
```

**Documentation (5%)**
```markdown
- [ ] README exists
- [ ] Setup instructions present
- [ ] API contracts defined
- [ ] Architecture decisions noted
```

**Dependency Health (10%)**
```markdown
- [ ] Dependencies are current (not deprecated)
- [ ] No known vulnerabilities (CVE check)
- [ ] Licenses are compatible
- [ ] Dependencies are necessary (no bloat)
```

#### 2.3 Technical Debt Inventory (NEW)

**Categorize identified issues:**

| Category | Issue | Severity | Effort to Fix | Must Fix Before Production |
|----------|-------|----------|---------------|---------------------------|
| Security | Hardcoded validation rules | Medium | 2 hours | Yes |
| Security | Debug mode enabled | High | 15 min | Yes |
| Performance | No pagination on file list | Low | 4 hours | No |
| Maintainability | No logging | Medium | 3 hours | Yes |
| ... | ... | ... | ... | ... |

**Severity Definitions:**
- **Critical:** Security vulnerability or data loss risk
- **High:** Will cause production issues
- **Medium:** Should be fixed but won't block deployment
- **Low:** Nice to have improvements

---

### Phase 3: Requirements Derivation (Enhanced)

**What the team identified:**
- Front-end behavior = requirements
- Need non-functional requirements
- Need client-specific standards

**What to add:**

#### 3.1 Reverse Engineering Requirements Document

```markdown
## Derived Requirements Specification

### 1. Functional Requirements (Extracted from Prototype)

#### 1.1 User Flows
| Flow ID | Flow Name | Steps | Derived From |
|---------|-----------|-------|--------------|
| FL-001 | File Upload | 1. User drags file... | Prototype screen 1 |

#### 1.2 Business Rules
| Rule ID | Rule Description | Current Implementation | Configurable? |
|---------|------------------|----------------------|---------------|
| BR-001 | File must contain columns X, Y, Z | Hardcoded in validator.js:45 | No → Must fix |

#### 1.3 Validation Rules
| Validation | Trigger | Error Message | Client Confirmed |
|------------|---------|---------------|------------------|
| File size < 10MB | On upload | "File too large" | Yes - meeting 5/1 |

### 2. Non-Functional Requirements (Derived + Assumed)

#### 2.1 Performance
| Metric | Requirement | Basis |
|--------|-------------|-------|
| Concurrent Users | 10-20 | "20-50 uses per day" = ~5 concurrent |
| Response Time | < 3 seconds | Industry standard |
| File Processing | < 30 seconds for 10MB | Assumed acceptable |

#### 2.2 Availability
| Metric | Requirement | Basis |
|--------|-------------|-------|
| Uptime | 99.5% | Non-critical internal tool |
| Maintenance Window | Weekends OK | Business hours only usage |

#### 2.3 Security
| Requirement | Source |
|-------------|--------|
| SSO Integration | Client requirement |
| Audit logging of uploads | Regulatory assumption |
| Data encryption at rest | Best practice |

### 3. Requirements Gaps (Need Client Input)
- [ ] Data retention policy: How long to keep uploaded files?
- [ ] User roles: Is everyone equal or are there admins?
- [ ] Notification preferences: Email vs. in-app?
```

#### 3.2 Assumptions Log (NEW - Critical)

```markdown
## Assumptions Register

| ID | Assumption | Risk if Wrong | Validation Method | Status |
|----|------------|---------------|-------------------|--------|
| A-001 | Users have modern browsers (Chrome, Edge, Firefox) | UI may break on IE | Confirm with client | Pending |
| A-002 | Files are always CSV format | Parser will fail | In prototype validation | Confirmed |
| A-003 | Maximum 100 users total | Architecture may not scale | Ask client | Pending |
| A-004 | No offline capability needed | Feature gap | Ask client | Pending |
```

---

### Phase 4: Architecture & Design (NEW PHASE)

**This phase was missing from the team discussion but is critical.**

#### 4.1 Architecture Decision Records (ADRs)

```markdown
## ADR-001: Application Hosting Model

### Status: Proposed

### Context:
The vibe-coded prototype runs on a local Flask development server. 
We need to decide on production hosting.

### Options Considered:
1. **Containerized (Docker + Kubernetes)**
   - Pros: Scalable, portable, client may have existing K8s
   - Cons: Complexity for simple app

2. **Serverless (AWS Lambda + API Gateway)**
   - Pros: Cost-effective for low volume, no server management
   - Cons: Cold start latency, 15-min execution limit

3. **PaaS (Heroku, Azure App Service)**
   - Pros: Simple deployment, managed infrastructure
   - Cons: Less control, potential cost at scale

### Decision:
[To be determined with client input]

### Consequences:
[What changes as a result of this decision]
```

#### 4.2 Component Mapping

| Prototype Component | Production Component |
|---------------------|----------------------|
| Flask dev server | Gunicorn + Nginx / Cloud Run |
| Local file storage | S3 / Azure Blob / GCS |
| Hardcoded config | Environment variables / Secrets Manager |
| In-memory session | Redis / Database sessions |
| Console logging | CloudWatch / Application Insights |
| No authentication | SSO integration (SAML/OIDC) |
| Sync processing | Queue-based async (for large files) |

#### 4.3 Integration Requirements (NEW)

```markdown
## Integration Specification

### Inbound Integrations:
| System | Integration Type | Data Flow | Authentication |
|--------|-----------------|-----------|----------------|
| Corporate SSO | SAML 2.0 | User identity | Certificate-based |

### Outbound Integrations:
| System | Integration Type | Data Flow | Authentication |
|--------|-----------------|-----------|----------------|
| Email System | SMTP / SendGrid | Notifications | API Key |
| [Future] Data Lake | REST API | Validated files | OAuth2 |

### Integration Risks:
- [ ] SSO provider documentation available?
- [ ] Test environment access for integrations?
- [ ] Rate limits on external services?
```

---

### Phase 5: Production Hardening (Enhanced)

**What the team identified:**
- Debug → Production server
- Pre-execution validation
- Move hardcoded logic to config
- Add error handling

**What to add:**

#### 5.1 Hardening Checklist by Category

**🔐 Security Hardening**
```markdown
- [ ] Remove all debug modes and verbose error messages
- [ ] Implement proper authentication (integrate with SSO)
- [ ] Add authorization checks (who can do what)
- [ ] Implement CSRF protection
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Enable HTTPS only
- [ ] Add security headers (CSP, HSTS, etc.)
- [ ] Scan dependencies for vulnerabilities (npm audit, safety check)
- [ ] Conduct SAST scan (SonarQube, Checkmarx)
- [ ] Plan penetration testing (for regulated environments)
```

**📊 Observability Hardening**
```markdown
- [ ] Implement structured logging (JSON format)
- [ ] Add correlation IDs for request tracing
- [ ] Configure log levels appropriately
- [ ] Set up application monitoring (APM)
- [ ] Create health check endpoint
- [ ] Define key metrics to track
- [ ] Set up alerting thresholds
- [ ] Implement audit logging for compliance
```

**🚀 Performance Hardening**
```markdown
- [ ] Configure production WSGI/ASGI server
- [ ] Enable response compression
- [ ] Set appropriate timeouts
- [ ] Configure connection pooling
- [ ] Add caching where beneficial
- [ ] Optimize database queries (if applicable)
- [ ] Configure CDN for static assets
```

**🔄 Reliability Hardening**
```markdown
- [ ] Add retry logic for external calls
- [ ] Implement circuit breakers
- [ ] Configure graceful shutdown
- [ ] Add request validation middleware
- [ ] Handle file upload edge cases (empty, corrupt, wrong format)
- [ ] Set up backup/restore procedures (if data persistence)
```

**📝 Maintainability Hardening**
```markdown
- [ ] Add/update README with setup instructions
- [ ] Document environment variables
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Add inline code comments for complex logic
- [ ] Create runbook for operations
- [ ] Document deployment process
```

#### 5.2 Testing Requirements (NEW - Critical Gap)

**The team discussion didn't address testing, which is essential:**

```markdown
## Testing Strategy

### Unit Testing
- Target Coverage: 70% minimum
- Focus Areas:
  - [ ] Validation logic
  - [ ] Business rules
  - [ ] Error handling paths
- Tools: pytest, Jest (depending on stack)

### Integration Testing
- [ ] File upload flow end-to-end
- [ ] SSO authentication flow
- [ ] Error scenarios (invalid files, large files, etc.)

### Performance Testing
- [ ] Load test: 20 concurrent users
- [ ] Stress test: Find breaking point
- [ ] File size limit validation

### Security Testing
- [ ] OWASP ZAP scan
- [ ] Dependency vulnerability scan
- [ ] [If regulated] Penetration test

### User Acceptance Testing
- [ ] Client stakeholder sign-off
- [ ] Test with production-like data
```

#### 5.3 Definition of Done (NEW)

```markdown
## Production Readiness Checklist

### Code Quality
- [ ] All unit tests passing
- [ ] Code coverage meets threshold (70%)
- [ ] No critical/high issues in static analysis
- [ ] Code review completed by senior engineer
- [ ] No TODO/FIXME in production code

### Security
- [ ] Security scan completed
- [ ] No high/critical vulnerabilities
- [ ] Secrets externalized
- [ ] Authentication/authorization working

### Operations
- [ ] Deployment pipeline configured
- [ ] Monitoring/alerting set up
- [ ] Logs flowing to central system
- [ ] Runbook documented
- [ ] Rollback procedure tested

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Architecture diagram current
- [ ] Deployment guide written

### Business
- [ ] Client UAT sign-off received
- [ ] Non-functional requirements verified
- [ ] Data handling compliant with policies
```

---

### Phase 6: Estimation & Pricing (Enhanced)

**What the team identified:**
- Need estimation process
- Need pricing model

**What to add:**

#### 6.1 Effort Estimation Model

**Baseline Formula:**
```
Total Effort = Base Development + (Technical Debt Remediation × Complexity Factor) 
               + Testing + Documentation + Deployment Setup + Buffer
```

**Estimation Template:**

| Activity | Optimistic | Likely | Pessimistic | Expected (PERT) |
|----------|------------|--------|-------------|-----------------|
| **Technical Debt Remediation** |
| Security fixes | 4h | 8h | 16h | 9h |
| Error handling | 2h | 4h | 8h | 4.3h |
| Configuration externalization | 2h | 4h | 6h | 4h |
| Logging implementation | 2h | 4h | 8h | 4.3h |
| **New Development** |
| SSO Integration | 8h | 16h | 32h | 17.3h |
| Production deployment config | 4h | 8h | 16h | 9h |
| **Testing** |
| Unit tests | 8h | 16h | 24h | 16h |
| Integration tests | 4h | 8h | 16h | 9h |
| Security testing | 4h | 8h | 12h | 8h |
| **Documentation** |
| Technical documentation | 4h | 8h | 12h | 8h |
| User documentation | 2h | 4h | 8h | 4.3h |
| **Deployment & DevOps** |
| CI/CD pipeline | 4h | 8h | 16h | 9h |
| Environment setup | 4h | 8h | 12h | 8h |
| **Buffer (20%)** | | | | ~22h |
| **TOTAL** | | | | **~132h** |

*PERT Expected = (Optimistic + 4×Likely + Pessimistic) / 6*

#### 6.2 Pricing Considerations (NEW)

```markdown
## Pricing Model Options

### Option A: Fixed Price
- Based on estimated hours + margin
- Risk: EPAM absorbs overruns
- Appropriate when: Requirements are clear (prototype validated)

### Option B: Time & Materials with Cap
- Hourly billing up to maximum
- Risk: Shared between parties
- Appropriate when: Some unknowns remain

### Option C: Phased Fixed Price
- Phase 1: Hardening (fixed)
- Phase 2: Enhancements (T&M)
- Risk: Balanced
- Appropriate when: Client wants budget certainty but scope may evolve

### Vibe Code Pricing Adjustment
Traditional new development: X hours
From validated prototype: X × 0.4-0.6 (40-60% of traditional)

**Justification:**
- Requirements already validated (saves 15-20%)
- Working code exists as reference (saves 10-15%)
- Client expectations aligned (saves 5-10% in iterations)
```

#### 6.3 Statement of Work Template Elements (NEW)

```markdown
## SOW Section: Deliverables from Vibe-Coded Prototype

### Background
EPAM developed a functional prototype during the pre-sales engagement 
that has been validated by [Client] stakeholders. This SOW covers 
the productionization of that prototype.

### Starting Artifacts
- Validated prototype (front-end flows)
- Technical assessment report
- Derived requirements document
- [List other artifacts]

### Deliverables
1. Production-ready application meeting specifications in Appendix A
2. Source code and build artifacts
3. Technical documentation
4. Deployment runbook
5. 30 days post-deployment support

### Assumptions
[From assumptions register]

### Exclusions
- Ongoing maintenance (separate agreement)
- Infrastructure costs (client responsibility)
- Changes to validated requirements (change request process)

### Acceptance Criteria
- All items in Definition of Done checklist complete
- Client UAT sign-off
- No critical/high severity defects
```

---

## New Governance Framework

### Roles & Responsibilities (NEW)

| Role | Phase 0-1 | Phase 2-3 | Phase 4-6 |
|------|-----------|-----------|-----------|
| **Sales/Pre-Sales** | Lead | Consulted | Informed |
| **BA** | Lead | Lead | Consulted |
| **Solutions Architect** | Consulted | Lead | Lead |
| **Senior Developer** | - | Lead (Assessment) | Lead |
| **Developer(s)** | - | Support | Responsible |
| **QA** | - | Consulted | Lead (Testing) |
| **DevOps** | - | - | Lead (Deployment) |
| **Delivery Manager** | Informed | Informed | Lead (Overall) |

### Quality Gates (NEW)

#### Gate 1 · Prototype Approval
- [ ] Client has validated prototype
- [ ] Prototype scope document signed
- [ ] Prompt engineering log captured
  - **Approver:** BA Lead + Client Stakeholder

#### Gate 2 · Technical Assessment Complete
- [ ] Assessment scorecard completed
- [ ] Technical debt inventory documented
- [ ] Go/No-Go recommendation made
  - **Approver:** Solutions Architect

#### Gate 3 · Requirements Baseline
- [ ] Derived requirements documented
- [ ] Assumptions validated with client
- [ ] Non-functional requirements agreed
  - **Approver:** BA Lead + Client Product Owner

#### Gate 4 · Architecture Approval
- [ ] ADRs documented
- [ ] Integration design complete
- [ ] Security review passed
  - **Approver:** Solutions Architect + Security (if regulated)

#### Gate 5 · Ready for UAT
- [ ] All hardening items complete
- [ ] Testing complete (unit, integration, security)
- [ ] Documentation complete
  - **Approver:** QA Lead + Tech Lead

#### Gate 6 · Production Release
- [ ] UAT sign-off received
- [ ] Definition of Done complete
- [ ] Deployment runbook tested
  - **Approver:** Delivery Manager + Client

---

## Risk Register Template (NEW)

| Risk ID | Risk Description | Probability | Impact | Mitigation | Owner |
|---------|------------------|-------------|--------|------------|-------|
| R-001 | Prototype code requires complete rewrite | Low | High | Early technical assessment, adjust estimate | Tech Lead |
| R-002 | Client requirements change after prototype validation | Medium | Medium | Change request process, baseline sign-off | BA |
| R-003 | Integration with SSO more complex than estimated | Medium | Medium | Spike early, add buffer to estimate | Developer |
| R-004 | Performance issues at production scale | Low | High | Load testing, architecture review | Architect |
| R-005 | Security vulnerabilities discovered late | Medium | High | Early security scan, pen test planning | Security |
| R-006 | Missing regulatory requirements surface late | Medium | High | Early compliance review for Life Sciences | BA/Compliance |

---

## Life Sciences Specific Considerations (NEW)

Given this is for Healthcare/Life Sciences teams:

### GxP Applicability Assessment

```markdown
## GxP Assessment Checklist

### Does this application:
- [ ] Process, store, or transmit patient data? → HIPAA applies
- [ ] Support clinical trial processes? → 21 CFR Part 11 may apply
- [ ] Affect drug manufacturing decisions? → GMP applies
- [ ] Impact quality system records? → GxP documentation required

### If ANY GxP applies:
- [ ] Validation protocol required
- [ ] Formal requirements traceability
- [ ] Change control process
- [ ] Electronic signature requirements (if applicable)
- [ ] Audit trail requirements
- [ ] Vendor qualification for AI tools used

### Documentation Requirements (if GxP):
- User Requirements Specification (URS)
- Functional Requirements Specification (FRS)
- Design Specification
- Traceability Matrix
- Installation Qualification (IQ)
- Operational Qualification (OQ)
- Performance Qualification (PQ)
```

### AI/LLM Usage Documentation (Regulatory Consideration)

```markdown
## AI Tool Usage Declaration

### For Regulated Submissions/Systems:

This code was generated/assisted by AI tools:
- Tool: [Claude/ChatGPT/Cursor]
- Version: [Version]
- Date: [Date]
- Human Review: [Yes - by whom]

### Verification Statement:
All AI-generated code has been:
- [ ] Reviewed by qualified developer
- [ ] Tested per test protocol
- [ ] Verified against requirements
- [ ] Assessed for security implications

Signed: _______________ Date: _______________
```

---

## Metrics & Continuous Improvement (NEW)

### Track These Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Prototype to Production Time** | Days from client prototype approval to production | < 4 weeks |
| **Rewrite Percentage** | % of prototype code replaced | < 40% |
| **Estimation Accuracy** | Actual effort / Estimated effort | 0.9 - 1.1 |
| **Client Satisfaction** | Survey score | > 4.5/5 |
| **Defects in Production** | Critical/High bugs in first 30 days | 0 |
| **Assessment Accuracy** | Did assessment predict issues correctly? | > 80% |

### Retrospective Questions
After each vibe-to-production project:
1. Did the prototype accurately represent final requirements?
2. What technical debt was missed in assessment?
3. How accurate was the estimate?
4. What would we do differently?
5. Should we update the process?

---

## Summary: Enhanced Process at a Glance

| Phase | Focus | Typical Duration | Key Output | Gate |
|-------|-------|------------------|------------|------|
| 0 | Qualify | Hours | Suitability matrix & viability proof | Gate 0 |
| 1 | Prototype | Hours | Validated prototype + scope dossier | Gate 1 |
| 2 | Assess | Days | Technical assessment & debt register | Gate 2 |
| 3 | Derive Requirements | Days | Requirements specification & assumptions log | Gate 3 |
| 4 | Design | Days | Architecture ADRs & integration blueprint | Gate 4 |
| 5 | Harden | Weeks | Tested, documented build ready for UAT | Gate 5 |
| 6 | Deliver | Days | Production release & runbook | Gate 6 |

---

## Recommended Discussion Points with Delivery Leadership

1. **Process Ownership:** Who owns this process? Is it delivery methodology, solutions, or a new AI-enablement team?

2. **Tool Standardization:** Should we standardize which AI tools are approved for vibe coding to ensure consistency and compliance?

3. **Training Requirements:** What training do BAs need to do effective vibe coding? What training do engineers need for assessment?

4. **Pricing Model Approval:** Does finance need to approve a new pricing model for vibe-coded-to-production work?

5. **Quality Gate Authority:** Who has authority to approve each gate? Especially for Life Sciences/regulated work.

6. **Liability Considerations:** What are the contractual implications of delivering code that originated from AI tools?

7. **Intellectual Property:** Who owns the prompts? The prototype? Need legal guidance.

8. **Resource Model:** Does this change how we staff projects? (More senior, shorter duration?)

---

This enhanced framework should provide a comprehensive starting point for your delivery discussion. Would you like me to drill deeper into any specific section?