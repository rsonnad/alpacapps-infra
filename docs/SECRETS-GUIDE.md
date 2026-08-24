# Secrets Management Guide

Use a project-specific password-manager vault as the source of truth for
credentials. This repository contains no credential values, real people,
financial records, account inventories, or device-specific instructions.

## Safe pattern

1. Create a vault or collection named after your own project.
2. Store service credentials only in that vault.
3. Keep local credential references in a gitignored file such as
   `docs/CREDENTIALS.md`.
4. Inject runtime secrets through the provider's approved environment-secret
   mechanism.

## Reference format

Use a local reference, never a literal secret:

```markdown
- API key: stored in password manager item `Service — Purpose`
```

Do not commit local paths, auto-unlock commands, account names, family or
financial categories, or values for passwords, tokens, OAuth secrets, SSH keys,
or payment credentials.
