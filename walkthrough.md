# Security Summary

This walkthrough documents the security hardening, authentication upgrade, input/output sanitization, and complete activity auditing implemented for **Livry Code Finder**.

## 1. Replaced Hardcoded Admin PIN & Added Configurable Data Password
- **Previous Risk**: Admin access relied on a hardcoded `'1997'` client-side passcode with visible placeholder hints (`(1997)`) in `Header.tsx`, `ProductDetailModal.tsx`, and `SuggestOneScreen.tsx`. Anyone inspecting the bundle could unlock the Data dashboard and modify the catalog.
- **Remediation**:
  - Removed all hardcoded `'1997'` PIN checks and UI hints across the codebase.
  - Built `src/services/adminAuthService.ts` using **Web Crypto PBKDF2-SHA256** (`120,000` iterations + `16-byte` cryptographic random salt per password) and constant-time digest comparison (`constantTimeEqual`).
  - Added **first-run password setup** in `src/components/AdminAuthModal.tsx` when no Data password is configured yet, plus an in-app **"Sécurité & MDP"** manager (`src/components/AdminSecurityModal.tsx`) so Admin can change the Data password anytime.
  - Added **brute-force lockout protection** (exponential cooldown after 5 consecutive failed unlock attempts) and **versioned expiring sessions** (changing the Data password increments `version` and invalidates prior sessions across devices).

## 2. Neutralized CSV Formula Injection
- **Previous Risk**: Exporting catalog CSV rows (`exportProductsToCsv`) wrote raw cell strings without escaping spreadsheet formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`). Opening exported files in Excel could execute injected formulas.
- **Remediation**:
  - Created `sanitizeCsvCell` in `src/utils/securityUtils.ts` and applied it to all 12 catalog columns in `src/utils/csvImporter.ts` and all audit columns in `src/services/activityLogService.ts`.

## 3. URL & Image Source Sanitization
- **Previous Risk**: Arbitrary image URLs and Supabase endpoint overrides were stored without strict scheme checks (`javascript:`, `data:text/html`, `vbscript:`, etc.).
- **Remediation**:
  - Added `sanitizeImageUrl` (allowing only `https://`, `http://`, `/assets/...`, and strict `data:image/(png|jpeg|jpg|webp|gif);base64,...`) and `sanitizeSupabaseEndpointUrl` (strictly requiring `https://` URLs without credentials).
  - Enforced sanitization across `AppContext.tsx`, `supabaseClient.ts`, `supabaseService.ts`, `guideContentService.ts`, `ProductEditModal.tsx`, `AstucesScreen.tsx`, and `AdminDashboard.tsx`.

## 4. Removed Vulnerable Unused Dependency
- **Previous Risk**: `package.json` listed unused `xlsx@^0.18.5`, which carries known high-severity Prototype Pollution and ReDoS advisories with no patched upstream release.
- **Remediation**: Removed `"xlsx"` from `/package.json` cleanly while keeping native 12-column CSV import/export intact.

## 5. Comprehensive Application Activity Audit Log & Complete Exportable File
- Created `src/services/activityLogService.ts` and `src/components/ActivityLogModal.tsx` (**"Journal & Fichier"** in Data Dashboard) capturing all authentication unlocks/failures/lockouts/password changes, product additions/edits/field diffs/deletions/visibility toggles, `100%` / `50%` / `Makhdamch` status updates, CSV/HTML imports and exports, manual and restored backups, Guide edits/resets, Tips CRUD, and barcode votes.
- Exportable in one click as a complete **`.TXT` dossier**, formula-safe **`.CSV` Excel log**, and **`.JSON` snapshot**.

---

## PoC Verification

### Verification 1 — Zero Hardcoded Passcode or Vulnerable `xlsx` Dependency
1. Search the codebase for `'1997'` and `xlsx`:
   - Confirmed zero matches across `src/` and `package.json`.
2. Attempt Admin unlock via header 8-tap logo gesture, `ProductDetailModal`, or `SuggestOneScreen`:
   - `AdminAuthModal` detects unconfigured auth state (`checkIsAdminPasswordConfigured() === false`), prompts Admin to create a new Data password (minimum 6 characters), hashes it with a 16-byte CSPRNG salt + 120,000 PBKDF2-SHA256 iterations, and unlocks Admin mode.

### Verification 2 — Brute-Force Protection & Password Rotation
1. Submit 5 incorrect passwords in `AdminAuthModal`:
   - Account lockout activates (`getRemainingLockoutSeconds() > 0`), disabling submission until cooldown expires and logging `ADMIN_LOCKOUT` in `Journal & Fichier`.
2. Open **Data → Sécurité & MDP**, change password from `OldPass123` to `NewStrongPass456`:
   - `version` increments, old sessions are rejected by `validatePersistedAdminSession()`, and `ADMIN_PASSWORD_CHANGED` is recorded.

### Verification 3 — Image URL & CSV Formula Sanitization
1. Attempt to save `javascript:alert(1)` as an image URL in `ProductEditModal` or `AstucesScreen`:
   - `sanitizeImageUrl` rejects the dangerous scheme and strips the unsafe URL (`undefined`).
2. Export CSV containing a product name starting with `=cmd|'/C calc'!A0`:
   - `sanitizeCsvCell` prefixes the cell with `'` (`"'=cmd|..."`), neutralizing spreadsheet execution.

### Verification 4 — Full-Page Editable Guide & Aligned 3-State Barcode Icons
1. Open the Guide from `AstucesScreen` or **Data → Éditer Guide**:
   - Renders edge-to-edge full screen (`fixed inset-0 w-full h-dvh`), supports swipe navigation (paused automatically while Admin edits fields), and publishes changes cleanly.
2. Assign `100%` (Blue), `50%` (Orange), and `Makhdamch` (Red) statuses across `AdminDashboard`, `ProductEditModal`, and `ProductDetailModal`:
   - All three scalloped vector badges render with identical proportions, aligned baselines, and immediate activity log audit entries.
