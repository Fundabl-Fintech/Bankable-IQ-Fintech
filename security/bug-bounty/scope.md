# Bug Bounty Program Scope

**Owner:** Platform Engineering  
**Depends On:** [1345: Security Tooling CI Pipeline], [1357: OWASP ASVS Implementation]  
**Blocks:** None  
**Spec Sections:** §10.4 Application Security Practice Stack  
**Maturity Target:** Foundation  
**Status:** Draft — Pending Phase 3 Launch

---

## 1. Program Overview

This document defines the scope, rules, and reward structure for the platform's bug bounty program. The program is managed through HackerOne and will launch in Phase 3 of the platform rollout. All findings are triaged according to the OWASP ASVS Level 2 baseline, with Level 3 applied to compliance-svc and credit-svc paths.

**Program Manager:** Platform Security Team  
**Platform:** HackerOne (private program, invitation-only)  
**Launch Phase:** Phase 3 (post SAST/DAST/SCA/secret scanning CI integration)

---

## 2. In-Scope Assets

### 2.1 Production Services

| Service | Base URL | ASVS Level | Notes |
|---------|----------|------------|-------|
| API Gateway | `https://api.platform.example.com` | Level 2 | All API endpoints |
| Web Application | `https://app.platform.example.com` | Level 2 | SPA frontend |
| Compliance Service | `https://compliance-svc.platform.example.com` | Level 3 | PCI/HIPAA data |
| Credit Service | `https://credit-svc.platform.example.com` | Level 3 | Financial data |
| Authentication Service | `https://auth.platform.example.com` | Level 2 | OAuth2/OIDC |
| Admin Dashboard | `https://admin.platform.example.com` | Level 2 | Internal tooling |

### 2.2 Mobile Applications

| Application | Platform | Version | Bundle ID |
|-------------|----------|---------|-----------|
| Platform Mobile | iOS | ≥ 2.0.0 | `com.platform.ios` |
| Platform Mobile | Android | ≥ 2.0.0 | `com.platform.android` |

### 2.3 Supporting Infrastructure

- CDN endpoints (CloudFront distributions associated with in-scope domains)
- API endpoints behind the gateway (all `*.api.platform.example.com` subdomains)
- WebSocket endpoints (`wss://api.platform.example.com/ws/*`)
- GraphQL endpoints (`https://api.platform.example.com/graphql`)

### 2.4 Vulnerability Types in Scope

- Remote Code Execution (RCE)
- SQL Injection (SQLi)
- Cross-Site Scripting (XSS) — stored, reflected, DOM-based
- Cross-Site Request Forgery (CSRF) on state-changing operations
- Server-Side Request Forgery (SSRF)
- Authentication bypass
- Authorization bypass / privilege escalation
- Insecure Direct Object References (IDOR)
- Sensitive data exposure (PII, credentials, tokens)
- Business logic flaws with demonstrable impact
- Subdomain takeover
- Insecure deserialization
- Server-Side Template Injection (SSTI)
- XML External Entity (XXE) injection
- Path traversal
- Race conditions with security impact

---

## 3. Out-of-Scope Assets

### 3.1 Explicitly Excluded

- Third-party SaaS services (Auth0, SendGrid, Stripe, etc.)
- Staging, development, and QA environments (`*.staging.*`, `*.dev.*`, `*.qa.*`)
- Internal employee-facing tools not accessible from the public internet
- Physical security of data centers
- Social engineering attacks against employees
- Physical devices or hardware
- Network-level attacks (DDoS, DNS poisoning, etc.)

### 3.2 Out-of-Scope Vulnerability Types

- Self-XSS (requires victim to paste attacker-controlled content)
- Missing HTTP security headers without demonstrated exploit
- Missing cookie flags on non-sensitive cookies
- Clickjacking on pages with no sensitive actions
- Rate limiting bypass without demonstrated impact
- Presence of autocomplete attributes on non-sensitive fields
- Missing SPF/DKIM/DMARC records
- Banner grabbing / version disclosure without exploit
- TLS/SSL configuration issues (unless combined with demonstrated MITM)
- Content spoofing without demonstrated phishing capability
- Theoretical vulnerabilities without proof of exploit
- Vulnerabilities requiring man-in-the-middle access
- Vulnerabilities in deprecated browser versions

---

## 4. Reward Structure

### 4.1 Base Reward Tiers

| Severity | Reward Range | Examples |
|----------|--------------|----------|
| Critical | $5,000 – $15,000 | RCE, SQLi with data exfiltration, authentication bypass on compliance-svc |
| High | $2,000 – $5,000 | SSRF, stored XSS, IDOR on sensitive data, privilege escalation |
| Medium | $500 – $2,000 | Reflected XSS, CSRF on critical actions, subdomain takeover |
| Low | $100 – $500 | Open redirect, minor information disclosure, missing security headers |
| Informational | $0 – $50 | Best practice violations, minor hardening suggestions |

### 4.2 Bonus Multipliers

| Condition | Multiplier |
|-----------|------------|
| Working proof-of-concept with exploit code | 1.5x |
| Report includes remediation recommendation | 1.2x |
| Vulnerability in compliance-svc or credit-svc (ASVS Level 3) | 2.0x |
| First valid report from a researcher | 1.5x (first report only) |
| Chain of vulnerabilities demonstrating greater impact | Up to 3.0x |

### 4.3 Payment Method

- Payments processed through HackerOne
- Standard payout within 30 days of validation
- Accelerated payout (7 days) available for critical severity findings

---

## 5. Rules of Engagement

### 5.1 Testing Guidelines

- **Authorization:** Only test against accounts you own or have explicit permission to test
- **Data Handling:** Do not access, modify, or exfiltrate real user data. Use test accounts with dummy data
- **Rate Limits:** Do not exceed 100 requests per second per IP. Automated scanning must be rate-limited
- **Denial of Service:** Do not perform DoS or DDoS attacks
- **Social Engineering:** Do not attempt phishing, vishing, or physical social engineering
- **Third Parties:** Do not test third-party services not owned by the platform
- **Destructive Testing:** Do not delete or corrupt production data
- **Account Compromise:** If you compromise an account, stop immediately and report

### 5.2 Reporting Requirements

- Submit all findings through HackerOne
- Include clear steps to reproduce
- Provide proof-of-concept code or screenshots
- Include impact assessment
- Do not publicly disclose vulnerabilities before remediation

### 5.3 Safe Harbor

Researchers conducting good-faith security research under this policy are:
- Authorized to test in-scope systems
- Protected from legal action under the platform's safe harbor policy
- Eligible for rewards as outlined in this document

**Exclusions from safe harbor:**
- Violation of testing guidelines (Section 5.1)
- Public disclosure before remediation
- Extortion or threats
- Testing outside defined scope

---

## 6. Vulnerability Triage and Remediation

### 6.1 Triage Process

1. **Submission:** Researcher submits report via HackerOne
2. **Initial Triage (48 hours):** Security team acknowledges receipt
3. **Validation (5 business days):** Team reproduces and validates the finding
4. **Severity Assignment:** Based on CVSS 3.1 scoring with business context adjustments
5. **Reward Determination:** Based on severity, multipliers, and quality of report
6. **Remediation:** Engineering team implements fix
7. **Retesting:** Researcher may retest after fix is deployed

### 6.2 Remediation SLAs

| Severity | Remediation Target | Extension Policy |
|----------|-------------------|------------------|
| Critical | 7 days | 3-day extension with justification |
| High | 14 days | 7-day extension with justification |
| Medium | 30 days | 14-day extension with justification |
| Low | 90 days | 30-day extension with justification |

### 6.3 Duplicate Handling

- First valid report receives full reward
- Subsequent duplicate reports may receive a small bounty ($50–$100) at program manager discretion
- Reports that are supersets of earlier reports may be considered as separate findings

---

## 7. Program Administration

### 7.1 Researcher Eligibility

- Open to all researchers globally, except:
  - Current or former employees of the platform (within 12 months)
  - Contractors actively engaged by the platform
  - Residents of countries under US sanctions

### 7.2 Program Changes

- Scope and rewards may be updated with 30 days notice
- Critical vulnerabilities may warrant immediate scope changes
- Researchers will be notified of changes via HackerOne

### 7.3 Dispute Resolution

- Severity disputes: Submit additional evidence within 14 days
- Reward disputes: Escalate to program manager within 30 days
- Final decision rests with platform security team

---

## 8. Related Documentation

| Document | Location | Description |
|----------|----------|-------------|
| ASVS Checklist | `docs/security/asvs-checklist.md` | OWASP ASVS Level 2 and Level 3 implementation status |
| Security Tooling CI | `docs/security/ci-pipeline.md` | SAST/DAST/SCA/secret scanning configuration |
| Penetration Test Policy | `docs/security/pentest-policy.md` | Annual third-party penetration testing |
| Security Dashboard | `https://dashboard.platform.example.com/security` | Real-time security metrics |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-06-08 | Platform Security | Initial draft for Phase 3 planning |
| | | | |

---

*This document is maintained by the Platform Security Team. Questions should be directed to security@platform.example.com.*