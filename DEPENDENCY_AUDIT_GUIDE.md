# Dependency Security Audit Guide

## Overview
This guide explains how to run security audits on project dependencies to identify and fix vulnerabilities.

## Backend (Laravel/PHP)

### Using Composer Audit
Composer includes a built-in security audit tool:

```bash
cd backend
composer audit
```

### Fixing Vulnerabilities
If vulnerabilities are found:

1. **Update packages:**
   ```bash
   composer update package-name
   ```

2. **Update all packages (be careful):**
   ```bash
   composer update
   ```

3. **Check for outdated packages:**
   ```bash
   composer outdated
   ```

### Automated Checks
Add to CI/CD pipeline:
```yaml
- name: Run Composer Audit
  run: |
    cd backend
    composer audit --format=json > composer-audit.json
```

## Frontend (Next.js/Node.js)

### Using npm audit
```bash
cd frontend
npm audit
```

### Fixing Vulnerabilities

1. **Auto-fix (minor updates only):**
   ```bash
   npm audit fix
   ```

2. **Force fix (may include breaking changes):**
   ```bash
   npm audit fix --force
   ```

3. **Check for outdated packages:**
   ```bash
   npm outdated
   ```

### Automated Checks
Add to CI/CD pipeline:
```yaml
- name: Run npm audit
  run: |
    cd frontend
    npm audit --json > npm-audit.json
```

## Recommended Schedule

- **Weekly:** Run audits locally
- **Monthly:** Review and update dependencies
- **Before Production Deploy:** Always run audits
- **After Security Advisories:** Immediate audit and update

## Current Dependencies

### Backend (Laravel 12)
- PHP 8.2+
- Laravel Framework ^12.0
- Laravel Sanctum ^4.2
- mPDF ^8.2

### Frontend (Next.js 16)
- Next.js 16.0.1
- React 19.2.0
- Tailwind CSS 4

## Security Best Practices

1. **Keep dependencies up to date**
2. **Review changelogs before major updates**
3. **Test thoroughly after updates**
4. **Use lock files (composer.lock, package-lock.json)**
5. **Monitor security advisories**

## Resources

- [Composer Security Advisories](https://github.com/FriendsOfPHP/security-advisories)
- [npm Security Advisories](https://github.com/advisories)
- [Laravel Security Releases](https://laravel.com/docs/releases#security-releases)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

