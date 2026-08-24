# Secrets Management — Bitwarden

Use Bitwarden as the project's credential source of truth. This template must
never contain vault names, collection inventories, user identities, account
counts, Keychain item names, local paths, or credentials from another project.

## Project setup

1. Create a project-specific Bitwarden organization or collection, for example
   named after your own project.
2. Store every password, recovery code, API token, OAuth secret, and SSH
   credential there.
3. Install the Bitwarden CLI using the vendor's current instructions.
4. Authenticate interactively in the operator's local environment. Do not add
   an auto-unlock script, Keychain lookup, master-password command, or session
   token to the repository.

## Safe repository references

Keep only non-secret references in gitignored local documentation, for example:

```markdown
- Cloudflare temporary setup token: stored in Bitwarden item
  `Cloudflare — Initial Setup`
- OpenRouter API key: stored in Bitwarden item `OpenRouter — Coding Workers`
```

Never commit a credential value, vault export, collection list, account number,
personal name, email address, or local-machine configuration.

## Agent access

An agent may use the password manager only after the operator explicitly
authorizes a supported CLI, completes interactive authentication, and verifies
a scoped read using a non-sensitive test item. Keep the resulting session local
to the machine; do not write it to a checked-in file or documentation.
