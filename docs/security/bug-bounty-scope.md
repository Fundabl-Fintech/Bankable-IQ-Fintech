# Bug Bounty Program Scope Document

**Owner:** Platform Security Team  
**Last Updated:** 2026-06-03  
**Program Status:** Active — Phase 3  
**Platform:** HackerOne / Bugcrowd  
**Spec Reference:** §10.4 — Application Security Practice Stack

---

## 1. Program Overview

This document defines the scope, rules, and reward structure for the bug bounty program. The program is designed to identify and remediate security vulnerabilities across our platform before they can be exploited in production. All testing must be conducted in accordance with the rules of engagement defined herein.

**Program Launch Prerequisites (Phase 3):**
- OWASP ASVS Level 2 baseline implemented and documented
- SAST (Semgrep + CodeQL) configured and running on every PR
- DAST (OWASP ZAP) scheduled weekly against staging
- SCA (Snyk + Dependabot) configured for all repositories
- Secret scanning (GitGuardian + GitHub native) with push protection enabled
- Annual third-party penetration testing completed and findings remediated

---

## 2. In-Scope Assets

### 2.1 Web Applications & APIs

| Asset | Base URL | Environment | Notes |
|-------|----------|-------------|-------|
| Production Web App | `https://app.platform.com` | Production | Primary target |
| API Gateway | `https://api.platform.com` | Production | All API endpoints |
| Admin Dashboard | `https://admin.platform.com` | Production | Requires authentication |
| Compliance Service | `https://compliance-svc.platform.com` | Production | ASVS Level 3 applied |
| Credit Service | `https://credit-svc.platform.com` | Production | ASVS Level 3 applied |
| Staging Environment | `https://staging.platform.com` | Staging | Pre-production testing allowed |

### 2.2 Mobile Applications

| Platform | Package Name | Version |
|----------|--------------|---------|
| iOS | `com.platform.app` | Latest |
| Android | `com.platform.app` | Latest |

### 2.3 Source Code Repositories

All repositories under the `platform` GitHub organization are in scope for vulnerability research, with the following exceptions noted in Section 3.

---

## 3. Out-of-Scope Assets & Activities

### 3.1 Explicitly Out of Scope

- Third-party services, CDNs, or infrastructure not owned by the platform
- Physical security attacks (social engineering, tailgating, theft)
- Denial of Service (DoS/DDoS) attacks of any kind
- Spam, phishing, or social engineering of employees or users
- Attacks requiring physical access to devices or facilities
- Automated scanning that generates excessive traffic (>100 requests/second)
- Testing on production user accounts without explicit authorization
- Vulnerabilities requiring man-in-the-middle attacks on encrypted connections

### 3.2 Low-Severity Issues Not Eligible for Reward

The following findings are considered informational and are not eligible for bounty rewards:

- Missing HTTP security headers (unless exploitable)
- Self-XSS that cannot be chained with other vulnerabilities
- Clickjacking on pages with no sensitive actions
- Missing cookie flags on non-sensitive cookies
- Rate limiting bypass on non-authentication endpoints
- Stack traces or error messages without sensitive data exposure
- Missing SPF/DMARC/DKIM records
- SSL/TLS configuration issues (unless leading to MITM)
- Username/email enumeration on login (unless rate-limited)
- Version disclosure without exploitability

---

## 4. Vulnerability Classification & Reward Structure

### 4.1 Severity Definitions

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | Direct compromise of system integrity, confidentiality, or availability with no user interaction required | Remote code execution, SQL injection with data exfiltration, authentication bypass |
| **High** | Significant security impact requiring some user interaction or specific conditions | Stored XSS, privilege escalation, IDOR accessing other users' sensitive data |
| **Medium** | Limited impact or requiring chaining with other vulnerabilities | Reflected XSS, CSRF on state-changing actions, information disclosure of non-critical data |
| **Low** | Minimal security impact or requiring unlikely conditions | Open redirect, minor information disclosure, missing security headers |

### 4.2 Reward Amounts

| Severity | Base Reward | Critical Service Bonus* |
|----------|-------------|------------------------|
| Critical | $5,000 – $15,000 | +$5,000 |
| High | $1,000 – $5,000 | +$2,000 |
| Medium | $250 – $1,000 | +$500 |
| Low | $50 – $250 | N/A |

*Critical Service Bonus applies to vulnerabilities found in `compliance-svc` or `credit-svc` paths.

### 4.3 Duplicate & Collision Policy

- First reporter to submit a valid vulnerability receives the full reward
- Substantially similar findings submitted within 48 hours may receive a reduced reward at the program's discretion
- Findings that are duplicates of known issues (publicly disclosed or internally tracked) are not eligible

---

## 5. Rules of Engagement

### 5.1 Testing Guidelines

1. **Authorization:** Only test against accounts and systems you own or have explicit permission to test
2. **Data Handling:** Do not access, modify, or exfiltrate real user data. Use test accounts with dummy data
3. **Rate Limiting:** Do not exceed 100 requests per second. Automated scanning must be rate-limited
4. **Authentication:** Use your own test accounts. Do not attempt to compromise other users' accounts
5. **Reporting:** Submit all findings through the HackerOne/Bugcrowd platform. Do not publicly disclose vulnerabilities before remediation
6. **Confidentiality:** All vulnerability details, communications, and reward information are confidential

### 5.2 Prohibited Actions

- Social engineering of employees, contractors, or users
- Physical security attacks or attempts to access facilities
- Denial of Service attacks
- Spamming, phishing, or other user-targeted attacks
- Modification or destruction of production data
- Installation of malware, backdoors, or persistent access
- Testing that could degrade service availability
- Use of automated tools that generate excessive traffic

### 5.3 Safe Harbor

We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations and service disruption
- Do not access or exfiltrate data beyond what is necessary to demonstrate the vulnerability
- Submit reports through the designated platform
- Allow reasonable time for remediation before any disclosure
- Comply with this scope document and all applicable laws

---

## 6. Reporting Process

### 6.1 Submission Requirements

Each submission must include:

1. **Title:** Clear, descriptive vulnerability title
2. **Severity:** Self-assessed severity level with justification
3. **Affected Asset:** URL, endpoint, or component affected
4. **Steps to Reproduce:** Detailed, reproducible steps including:
   - Prerequisites (authentication, specific configuration)
   - Request/response payloads (sanitized of sensitive data)
   - Screenshots or video proof of concept
5. **Impact:** Clear description of the security impact
6. **Proof of Concept:** Working exploit code or demonstration (for critical/high findings)
7. **Suggested Fix:** Optional but appreciated

### 6.2 Response Timeline

| Phase | Duration |
|-------|----------|
| Initial Acknowledgment | Within 24 hours |
| Triage & Validation | Within 72 hours |
| Severity Assignment | Within 5 business days |
| Remediation Target (Critical) | 7 days |
| Remediation Target (High) | 14 days |
| Remediation Target (Medium) | 30 days |
| Remediation Target (Low) | 90 days |
| Bounty Payment | Within 30 days of validation |

### 6.3 Disclosure Policy

- Researchers may publicly disclose vulnerabilities **90 days** after remediation is complete
- Earlier disclosure requires explicit written permission from the platform security team
- Coordinated disclosure with the platform is encouraged and appreciated

---

## 7. Program Exceptions & Special Considerations

### 7.1 Zero-Day Vulnerabilities

For vulnerabilities with active exploitation in the wild:
- Report immediately via the designated emergency channel
- Expect accelerated response and remediation timeline
- Higher reward amounts may be considered at the program's discretion

### 7.2 Third-Party Components

Vulnerabilities in third-party libraries or dependencies are in scope **only if**:
- The vulnerability affects the platform's deployment or usage
- A fix is not available from the upstream maintainer
- The researcher can demonstrate exploitability in the platform's context

### 7.3 Configuration & Infrastructure

Vulnerabilities arising from platform-specific configuration or deployment are in scope. Generic cloud infrastructure vulnerabilities (AWS, GCP, Azure) are out of scope unless the platform has a unique configuration that introduces risk.

---

## 8. Legal & Compliance

### 8.1 Eligibility

- Open to all security researchers worldwide, except where prohibited by law
- Platform employees, contractors, and their immediate family members are not eligible
- Researchers must be at least 18 years of age
- Researchers must comply with all applicable local, national, and international laws

### 8.2 Tax Information

- Rewards may be subject to tax withholding as required by applicable law
- Researchers may be required to provide tax information before receiving payment
- The platform will issue appropriate tax documentation as required

### 8.3 Program Modifications

- The platform reserves the right to modify, suspend, or terminate the program at any time
- Changes to scope, rewards, or rules will be communicated through the HackerOne/Bugcrowd platform
- Findings submitted before a change will be evaluated under the rules in effect at the time of submission

---

## 9. Contact & Communication

| Purpose | Channel |
|---------|---------|
| Vulnerability Submission | HackerOne / Bugcrowd Platform |
| Program Questions | `security@platform.com` |
| Emergency Reporting | `security-emergency@platform.com` (PGP encrypted) |
| Disclosure Coordination | `disclosure@platform.com` |

**PGP Key:** Available at `https://platform.com/.well-known/security.txt`

---

## 10. Appendices

### Appendix A: Related Documentation

| Document | Location |
|----------|----------|
| ASVS Checklist | `docs/security/asvs-checklist.md` |
| Security Tooling Configuration | `docs/security/tooling-config.md` |
| Penetration Test Findings | GitHub Security Advisories |
| Security Dashboard | Internal Security Dashboard |

### Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-03 | Platform Security | Initial program scope document |

---

*This document is maintained by the Platform Security Team. Questions or concerns should be directed to `security@platform.com`.*