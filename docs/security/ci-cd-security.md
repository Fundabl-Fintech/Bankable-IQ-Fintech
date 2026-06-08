Developer Push → Pre-commit Hooks → PR Creation → CI Pipeline → Merge → Deploy
                      │                    │              │          │
                      ▼                    ▼              ▼          ▼
               Secret Scan          SAST + SCA      DAST Scan   Production
               (GitGuardian)        (Semgrep,       (ZAP)       Monitoring
                                     CodeQL,
                                     Snyk)