markdown
# Responsible Disclosure Policy

**Last Updated:** June 2026  
**Document Owner:** Service: Compliance  
**Published At:** security.getbankable.io  
**Program Platform:** HackerOne (Private Invite Mode)

---

## 1. Purpose

Bankable is committed to protecting the security and privacy of our users, partners, and platform. We recognize the value of the security research community and encourage responsible disclosure of security vulnerabilities. This policy outlines our commitment to working with researchers to identify and remediate security issues before they can be exploited.

---

## 2. Scope

### 2.1 In-Scope Services

The following systems and services are explicitly in scope for this bug bounty program:

- `app.getbankable.io` – Main web application
- `api.getbankable.io` – Public API endpoints
- `platform.getbankable.io` – Institutional platform
- `security.getbankable.io` – Security portal
- Mobile applications (iOS and Android) – Latest production versions
- Public-facing API endpoints and SDKs
- Authentication and authorization services
- Payment processing and transaction systems
- Data storage and retrieval services

### 2.2 Out-of-Scope Systems

The following are explicitly **out of scope**:

- Third-party services and integrations (report issues to the respective vendor)
- Internal corporate networks and systems
- Physical security controls and facilities
- Employee devices and workstations
- Staging, development, or test environments (unless explicitly authorized)
- Previously reported vulnerabilities that have been addressed
- Social engineering attacks against employees or contractors
- Denial of Service (DoS/DDoS) attacks
- Spam, phishing, or physical attacks
- Self-XSS or vulnerabilities requiring victim interaction with attacker-controlled content
- Issues requiring man-in-the-middle attacks on encrypted connections
- Vulnerabilities in outdated browser versions

### 2.3 Eligibility Requirements

To be eligible for a bounty, researchers must:

- Be the first to report a unique, previously undisclosed vulnerability
- Provide clear, reproducible steps or proof of concept
- Comply with this disclosure policy
- Not be a current or former employee of Bankable or its affiliates
- Not be a resident of countries subject to US or EU sanctions

---

## 3. Severity Tiers and Payout Ranges

| Severity Level | Description | Payout Range | Response SLA | Fix SLA |
|----------------|-------------|--------------|--------------|---------|
| **Critical** | Remote code execution, direct financial loss, complete system compromise, authentication bypass | $5,000 – $15,000 | 24 hours | 7 days |
| **High** | Significant data exposure, privilege escalation, business logic flaws with material impact | $2,000 – $5,000 | 24 hours | 14 days |
| **Medium** | Limited data exposure, cross-site scripting (XSS), CSRF, information disclosure | $500 – $2,000 | 48 hours | 30 days |
| **Low** | Minor information leaks, missing security headers, low-impact configuration issues | $100 – $500 | 72 hours | 60 days |
| **Informational** | Best practice recommendations, theoretical risks without practical exploit | Recognition only | 72 hours | N/A |

### 3.1 Bonus Criteria

- **Quality of Report:** Clear, well-documented reports with proof of concept receive up to 25% bonus
- **Remediation Assistance:** Researchers who provide working fix recommendations receive up to 20% bonus
- **Repeat Reporter:** Researchers with 3+ validated reports receive 15% bonus on subsequent findings

---

## 4. Safe Harbor

### 4.1 Legal Protection

Bankable provides safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, or service interruption
- Do not access or modify data beyond what is necessary to demonstrate the vulnerability
- Submit reports through the designated channel (HackerOne or security@getbankable.io)
- Comply with this policy's terms and timelines

### 4.2 What We Promise

- **No legal action:** We will not pursue civil or criminal claims against researchers who comply with this policy
- **No DMCA action:** We will not file DMCA takedown notices for research conducted under this policy
- **No C&D letters:** We will not send cease and desist letters for good-faith research
- **Public recognition:** We will add researchers to our Hall of Fame (with permission)
- **Expedited handling:** We commit to timely responses and transparent communication

### 4.3 Authorized Testing

Testing conducted in accordance with this policy is considered authorized. Any legal action initiated by third parties against researchers for activities conducted in compliance with this policy will be contested by Bankable.

---

## 5. Triage Workflow

### 5.1 Submission Process

1. **Report Submission:** Submit via HackerOne platform or email security@getbankable.io
2. **Required Information:**
   - Vulnerability type and description
   - Affected system/endpoint
   - Steps to reproduce (with screenshots or video if applicable)
   - Proof of concept code or payload
   - Impact assessment
   - Suggested remediation (optional but appreciated)

### 5.2 Triage Timeline

| Milestone | Timeframe |
|-----------|-----------|
| Receipt acknowledgement | Within 24 hours |
| Initial severity classification | Within 72 hours |
| Validation and reproduction | Within 5 business days |
| Remediation plan communicated | Within 10 business days |
| Fix deployed (Critical/High) | Per SLA above |

### 5.3 Internal Triage Team

The internal triage team consists of:

- **Security Engineer (Lead):** Primary point of contact, vulnerability validation
- **Application Security Manager:** Severity classification, escalation decisions
- **Compliance Officer:** Policy adherence, legal review coordination
- **Engineering Lead (affected service):** Remediation planning and implementation
- **CI/CD Pipeline Engineer:** Integration with automated security testing

### 5.4 Severity Classification Process

1. **Initial Assessment:** Automated and manual review of submission completeness
2. **Technical Validation:** Reproduction in isolated environment
3. **Impact Analysis:** Assessment of data exposure, system compromise, financial risk
4. **Business Context:** Evaluation of affected user base, regulatory implications
5. **Final Classification:** Determined by triage team based on CVSS 3.1 scoring and business impact

---

## 6. Integration with Existing Security Practices

### 6.1 Finding Tracking

All validated findings are tracked in our centralized security findings database alongside:

- ZAP DAST scan results
- Third-party penetration test findings
- SAST (Static Application Security Testing) results
- Dependency vulnerability scans
- Infrastructure security assessments

### 6.2 CI/CD Pipeline Integration

Validated findings are automatically:

- Assigned to the appropriate engineering team via Jira integration
- Prioritized based on severity in the backlog
- Tracked through to remediation with automated SLA monitoring
- Verified post-fix through automated regression testing
- Reported to compliance team for regulatory tracking

### 6.3 Remediation Verification

All fixes undergo:

- Code review by security team
- Automated security testing (SAST/DAST)
- Manual verification by triage team
- Regression testing in staging environment
- Production deployment with monitoring

---

## 7. Disclosure Timeline

### 7.1 Coordinated Disclosure

Bankable follows a coordinated disclosure process:

- **Day 0:** Report received and acknowledged
- **Day 1-3:** Initial triage and severity classification
- **Day 4-10:** Validation and remediation planning
- **Day 11-30:** Fix development and testing (varies by severity)
- **Day 31:** Public disclosure permitted if fix is deployed
- **Day 45:** Maximum hold period before researcher may disclose publicly

### 7.2 Exceptions

- Critical vulnerabilities may require extended hold periods (up to 90 days) for complex fixes
- Researchers will be notified of any extension requests with justification
- Emergency security patches may be expedited outside standard timelines

---

## 8. Program Administration

### 8.1 Policy Review Cycle

This policy is reviewed quarterly by the Compliance team and updated as needed to reflect:
- Changes in scope (new services, deprecations)
- Adjustments to payout ranges based on market analysis
- Updates to triage workflows and SLAs
- Legal and regulatory changes

### 8.2 Contact Information

- **Program Platform:** HackerOne (private invite mode)
- **Email:** security@getbankable.io
- **Emergency Contact:** +1-555-SEC-URE0 (24/7 incident response)

### 8.3 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Compliance Team | Initial release for Phase 3 launch |

---

## 9. Acceptance Criteria Checklist

- [x] Bug bounty program registered on HackerOne
- [x] Responsible disclosure policy published at security.getbankable.io
- [x] Scope defined: in-scope services, out-of-scope systems, severity tiers and payout ranges
- [x] Triage workflow documented: receipt acknowledgement within 24h, severity classification within 72h
- [x] Internal triage team assigned with SLA for critical/high findings
- [x] Program soft-launched in private invite mode before Phase 3 public launch
- [x] Integration with existing security practices: findings tracked alongside ZAP DAST, pen test, and SAST results
- [x] Legal safe harbor language reviewed by counsel

---

*This document is maintained by Service: Compliance and is part of the §10.4 Application Security Practices framework. For questions, contact security@getbankable.io.*