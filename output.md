# =============================================================================
# Semgrep Custom Security Rules Configuration
# Owner: security
# Spec Section: 10.4 Application Security
# Blueprint Section: 12 Layer 11 Infrastructure Layer
# Maturity Target: organized
# =============================================================================
# This configuration defines custom Semgrep rules for fintech-specific security
# patterns. Rules are designed to catch common vulnerabilities in financial
# technology applications including hardcoded secrets, SQL injection, IDOR,
# unsafe deserialization, and weak cryptography.
#
# Integration: Runs on every PR via GitHub Actions workflow
# Severity Levels: ERROR (blocks PR), WARNING (requires review)
# =============================================================================

rules:
  # ---------------------------------------------------------------------------
  # Rule: Hardcoded Secrets Detection
  # CWE: CWE-798 (Use of Hard-coded Credentials)
  # OWASP: A2:2021 (Cryptographic Failures)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: hardcoded-secrets
    patterns:
      - pattern: |
          $VAR = "..."
      - metavariable-regex:
          metavariable: $VAR
          regex: (.*(api_key|secret|password|token|credential|private_key|access_key|auth_token).*)
      - pattern-not: |
          $VAR = os.environ.get("...")
      - pattern-not: |
          $VAR = os.getenv("...")
      - pattern-not: |
          $VAR = environ["..."]
      - pattern-not: |
          $VAR = config("...")
      - pattern-not: |
          $VAR = secrets.$ATTR
    message: >
      Hardcoded secret detected in variable '$VAR'. 
      In fintech applications, all secrets must be stored in environment variables 
      or a secret management service (AWS Secrets Manager, HashiCorp Vault, etc.).
      Severity: CRITICAL - This is a PCI-DSS and SOC2 violation.
    severity: ERROR
    languages:
      - python
      - typescript
      - javascript
      - java
      - go
      - ruby
      - rust
      - csharp
      - kotlin
      - scala
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-798"
      owasp: "A2:2021"
      confidence: HIGH
      impact: CRITICAL
      likelihood: HIGH
      remediation: |
        Replace hardcoded secret with environment variable or secret management service.
        Example: os.environ.get('API_KEY') or use AWS Secrets Manager / HashiCorp Vault.
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/798.html
        - https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
      asvs:
        level: "2"
        requirement: "2.1.1"
        description: "Verify that all secrets are stored securely and not in source code."

  # ---------------------------------------------------------------------------
  # Rule: SQL Injection Detection
  # CWE: CWE-89 (SQL Injection)
  # OWASP: A3:2021 (Injection)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: sql-injection-detection
    patterns:
      - pattern-either:
          - pattern: |
              execute("...$QUERY...")
          - pattern: |
              cursor.execute("...$QUERY...")
          - pattern: |
              db.query("...$QUERY...")
          - pattern: |
              $DB.query("...$QUERY...")
          - pattern: |
              $DB.execute("...$QUERY...")
          - pattern: |
              $CONNECTION.execute("...$QUERY...")
          - pattern: |
              session.execute("...$QUERY...")
      - metavariable-regex:
          metavariable: $QUERY
          regex: (.*\$\{.*\}.*|.*%.*\(.*\).*|.*\+.*\+.*|.*f".*\{.*\}.*|.*format\(.*\).*|.*%\(.*\).*)
      - pattern-not: |
          execute("...?..." , ...)
      - pattern-not: |
          cursor.execute("...?..." , ...)
      - pattern-not: |
          db.query("...$1..." , ...)
      - pattern-not: |
          $DB.query("...?..." , ...)
      - pattern-not: |
          $DB.execute("...?..." , ...)
    message: >
      Potential SQL injection detected in query string. 
      String interpolation/concatenation in SQL queries is strictly prohibited.
      Use parameterized queries with placeholders (? or $1) and pass parameters separately.
      Severity: CRITICAL - Can lead to data exfiltration in fintech systems.
    severity: ERROR
    languages:
      - python
      - typescript
      - javascript
      - java
      - go
      - ruby
      - php
      - kotlin
      - scala
      - csharp
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-89"
      owasp: "A3:2021"
      confidence: MEDIUM
      impact: CRITICAL
      likelihood: HIGH
      remediation: |
        Use parameterized queries:
        Python: cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        Node.js: db.query('SELECT * FROM users WHERE id = $1', [userId])
        Java: PreparedStatement pstmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/89.html
      asvs:
        level: "2"
        requirement: "5.1.1"
        description: "Verify that all SQL queries use parameterized interfaces."

  # ---------------------------------------------------------------------------
  # Rule: Insecure Direct Object Reference (IDOR)
  # CWE: CWE-639 (Authorization Bypass Through User-Controlled Key)
  # OWASP: A1:2021 (Broken Access Control)
  # Severity: WARNING - Requires manual review
  # ---------------------------------------------------------------------------
  - id: idor-vulnerability
    patterns:
      - pattern-either:
          - pattern: |
              $REQUEST.GET(".../$ID/...")
          - pattern: |
              $REQUEST.POST(".../$ID/...")
          - pattern: |
              $REQUEST.PUT(".../$ID/...")
          - pattern: |
              $REQUEST.DELETE(".../$ID/...")
          - pattern: |
              $ROUTER.get(".../:$ID/...")
          - pattern: |
              $ROUTER.post(".../:$ID/...")
          - pattern: |
              $ROUTER.put(".../:$ID/...")
          - pattern: |
              $ROUTER.delete(".../:$ID/...")
          - pattern: |
              $APP.get(".../<$ID>/...")
          - pattern: |
              $APP.post(".../<$ID>/...")
          - pattern: |
              $APP.put(".../<$ID>/...")
          - pattern: |
              $APP.delete(".../<$ID>/...")
      - pattern-not: |
          $REQUEST.GET(".../api/...")
      - pattern-not: |
          $ROUTER.get(".../api/...")
      - pattern-not: |
          $APP.get(".../api/...")
      - pattern-not-inside: |
          @permission_required(...)
          ...
      - pattern-not-inside: |
          @authorization_required(...)
          ...
      - pattern-not-inside: |
          authorize(...)
          ...
    message: >
      Potential Insecure Direct Object Reference (IDOR) detected.
      Resource access via user-controlled ID without visible authorization checks.
      Ensure proper authorization is performed for every resource access.
      Severity: HIGH - Can lead to unauthorized access to financial data.
    severity: WARNING
    languages:
      - python
      - typescript
      - javascript
      - java
      - go
      - ruby
      - kotlin
      - scala
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-639"
      owasp: "A1:2021"
      confidence: LOW
      impact: HIGH
      likelihood: MEDIUM
      remediation: |
        1. Implement authorization checks for all resource access
        2. Use UUIDs instead of sequential IDs
        3. Validate user permissions before returning resources
        4. Implement ownership checks: if resource.user_id != current_user.id: raise Forbidden
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/639.html
      asvs:
        level: "2"
        requirement: "4.1.1"
        description: "Verify that access controls are enforced for all resources."

  # ---------------------------------------------------------------------------
  # Rule: Unsafe Deserialization
  # CWE: CWE-502 (Deserialization of Untrusted Data)
  # OWASP: A8:2021 (Software and Data Integrity Failures)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: unsafe-deserialization
    patterns:
      - pattern-either:
          - pattern: |
              pickle.loads(...)
          - pattern: |
              pickle.load(...)
          - pattern: |
              cPickle.loads(...)
          - pattern: |
              cPickle.load(...)
          - pattern: |
              yaml.load(...)
          - pattern: |
              yaml.load_all(...)
          - pattern: |
              marshal.load(...)
          - pattern: |
              marshal.loads(...)
          - pattern: |
              JSON.parse(...)
          - pattern: |
              eval(...)
          - pattern: |
              exec(...)
          - pattern: |
              eval("...")
          - pattern: |
              exec("...")
          - pattern: |
              unserialize(...)
          - pattern: |
              unserialize(...)
          - pattern: |
              nodeSerialize.unserialize(...)
      - pattern-not: |
          yaml.safe_load(...)
      - pattern-not: |
          yaml.safe_load_all(...)
      - pattern-not: |
          json.loads(...)
      - pattern-not: |
          orjson.loads(...)
    message: >
      Unsafe deserialization detected. Using pickle, yaml.load, eval, or exec
      with untrusted data can lead to remote code execution (RCE).
      Use safe alternatives: yaml.safe_load, json.loads with schema validation.
      Severity: CRITICAL - RCE vulnerability in fintech systems.
    severity: ERROR
    languages:
      - python
      - typescript
      - javascript
      - java
      - ruby
      - php
      - kotlin
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-502"
      owasp: "A8:2021"
      confidence: HIGH
      impact: CRITICAL
      likelihood: MEDIUM
      remediation: |
        Use safe deserialization methods:
        - Python: yaml.safe_load() instead of yaml.load()
        - Python: json.loads() with schema validation instead of pickle
        - Never use eval() or exec() with untrusted input
        - Consider using Pydantic for validated data parsing
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/502.html
      asvs:
        level: "2"
        requirement: "5.5.1"
        description: "Verify that deserialization of untrusted data is prevented."

  # ---------------------------------------------------------------------------
  # Rule: Hardcoded Credentials in Connection Strings
  # CWE: CWE-798 (Use of Hard-coded Credentials)
  # OWASP: A2:2021 (Cryptographic Failures)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: hardcoded-credentials-in-connection-strings
    patterns:
      - pattern-either:
          - pattern: |
              "postgresql://$USER:$PASS@..."
          - pattern: |
              "mysql://$USER:$PASS@..."
          - pattern: |
              "mongodb://$USER:$PASS@..."
          - pattern: |
              "redis://:$PASS@..."
          - pattern: |
              "amqp://$USER:$PASS@..."
          - pattern: |
              "https://$USER:$PASS@..."
          - pattern: |
              "jdbc:postgresql://...?user=$USER&password=$PASS"
          - pattern: |
              "jdbc:mysql://...?user=$USER&password=$PASS"
      - metavariable-regex:
          metavariable: $USER
          regex: (?!\{\{.*\}\})(?!env\()(?!process\.env\.)(?!os\.environ\.)(?!\$)(?!\$\{)(?!\.env\.)(?!config\()(?!secret)
      - metavariable-regex:
          metavariable: $PASS
          regex: (?!\{\{.*\}\})(?!env\()(?!process\.env\.)(?!os\.environ\.)(?!\$)(?!\$\{)(?!\.env\.)(?!config\()(?!secret)
    message: >
      Hardcoded credentials detected in connection string.
      Database credentials must never be hardcoded. Use environment variables,
      secret management services, or configuration providers.
      Severity: CRITICAL - Direct database access compromise.
    severity: ERROR
    languages:
      - python
      - typescript
      - javascript
      - java
      - go
      - ruby
      - yaml
      - kotlin
      - scala
      - csharp
      - php
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-798"
      owasp: "A2:2021"
      confidence: HIGH
      impact: CRITICAL
      likelihood: HIGH
      remediation: |
        Use environment variables or secret management service:
        Python: f"postgresql://{os.environ['DB_USER']}:{os.environ['DB_PASS']}@..."
        Node.js: `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@...`
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/798.html
      asvs:
        level: "2"
        requirement: "2.1.2"
        description: "Verify that secrets are not hardcoded in configuration files."

  # ---------------------------------------------------------------------------
  # Rule: JWT Hardcoded Secret
  # CWE: CWE-798 (Use of Hard-coded Credentials)
  # OWASP: A2:2021 (Cryptographic Failures)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: jwt-hardcoded-secret
    patterns:
      - pattern-either:
          - pattern: |
              jwt.encode($PAYLOAD, "$SECRET", algorithm="$ALG")
          - pattern: |
              jwt.sign($PAYLOAD, "$SECRET", { algorithm: "$ALG" })
          - pattern: |
              JWT.encode($PAYLOAD, "$SECRET", "$ALG")
          - pattern: |
              jwt.encode($PAYLOAD, "$SECRET")
          - pattern: |
              jwt.sign($PAYLOAD, "$SECRET")
      - metavariable-regex:
          metavariable: $SECRET
          regex: (?!\{\{.*\}\})(?!env\()(?!process\.env\.)(?!os\.environ\.)(?!\$)(?!\$\{)(?!\.env\.)(?!config\()(?!secret)
    message: >
      Hardcoded JWT secret detected. JWT signing secrets must be stored securely
      using environment variables or a key management service.
      Severity: CRITICAL - Token forgery vulnerability.
    severity: ERROR
    languages:
      - python
      - typescript
      - javascript
      - java
      - go
      - ruby
      - kotlin
      - scala
      - php
    metadata:
      category: security
      technology: fintech
      cwe: "CWE-798"
      owasp: "A2:2021"
      confidence: HIGH
      impact: CRITICAL
      likelihood: HIGH
      remediation: |
        Use environment variables or key management service:
        Python: jwt.encode(payload, os.environ['JWT_SECRET'], algorithm='HS256')
        Node.js: jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' })
      references:
        - https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
        - https://cwe.mitre.org/data/definitions/798.html
      asvs:
        level: "2"
        requirement: "2.1.3"
        description: "Verify that cryptographic keys are stored securely."

  # ---------------------------------------------------------------------------
  # Rule: Weak Encryption Algorithm Detection
  # CWE: CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
  # OWASP: A2:2021 (Cryptographic Failures)
  # Severity: ERROR - Blocks PR
  # ---------------------------------------------------------------------------
  - id: weak-encryption-algorithm
    patterns:
      - pattern-either:
          - pattern: |
              hashlib.md5(...)
          - pattern: |
              hashlib.sha1(...)
          - pattern: |
              Crypto.Cipher.DES.new(...)
          - pattern: |
              Crypto.Cipher.DES3.new(...)
          - pattern: |
              cryptography.hazmat.primitives.ciphers.algorithms.DES(...)
          - pattern: |
              cryptography.hazmat.primitives.ciphers.algorithms.TripleDES(...)
          - pattern: |
              crypto.createHash('md5')
          - pattern: |
              crypto.createHash('sha1')