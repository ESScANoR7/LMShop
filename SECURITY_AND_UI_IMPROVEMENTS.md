# Lords Shop — Security & UI Improvements Plan

**Last Updated:** 2026-06-02  
**Status:** Phase 1 ✅ COMPLETE | Phase 2-5 IN PROGRESS

---

## ✅ PHASE 1: CRITICAL SECURITY FIXES (COMPLETED)

### Backend Changes ✓
- [x] Rotate JWT secret (new secure key in `.env`)
- [x] Fix CORS policy (whitelist only frontend domain)
- [x] Add security headers middleware (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- [x] Migrate tokens to HttpOnly cookies (access_token, refresh_token)
- [x] Add input validation Pydantic models (UserProfileUpdate, PasswordChangeRequest)
- [x] Add JWT user verification dependency (get_current_user)
- [x] Protect profile update endpoint (verify user owns the profile)

### Frontend Changes ✓
- [x] Remove localStorage token storage from AuthContext
- [x] Update apiClient.js with credentials: 'include' for all requests
- [x] Remove manual Authorization headers (cookies auto-sent by browser)
- [x] Clean up Profile.jsx login form (remove token passing)
- [x] Add fallback auth for cookies + Authorization header in backend

### Config Changes ✓
- [x] Update `.env` with new JWT secret & VITE_FRONTEND_URL
- [x] Verify `.env` in `.gitignore` ✓
- [x] Update `.env.example` with documentation

---

## 🔄 PHASE 2: API CENTRALIZATION (IN PROGRESS)

### Files to Refactor
**Status:** `api.js` updated ✓ | Others pending

- [ ] `pages/Admin.jsx` — 13+ hardcoded fetch calls
  - User management (list, ban, unban)
  - Product CRUD (accounts, resources, gems, other-items)
  - Promo codes management
  - Cashback settings
  - Order status updates

- [ ] `pages/Cart.jsx` — 2 hardcoded fetch calls
  - Promo validation
  - Checkout

- [ ] `pages/EditAccount.jsx` — image upload handling
  - Account creation/update

- [ ] Other pages — spot checks for missed hardcoded URLs

### Changes Required
1. Replace all `fetch('http://localhost:8000/...')` with `apiGet/Post/Put/Delete(getFullUrl(API_ENDPOINTS....))`
2. Add error handling with `handleApiError()` and toasts
3. Add `credentials: 'include'` to manual fetch calls (if any)

---

## 🎨 PHASE 3: UI COMPONENTS & PATTERNS (NOT STARTED)

### New Components to Build
- [ ] `src/components/ConfirmDialog.jsx` — Confirmation modal for destructive actions
  - Props: `title`, `message`, `onConfirm`, `onCancel`, `isDangerous`
  - Usage: Before delete/ban operations

- [ ] `src/components/SkeletonLoader.jsx` — Loading placeholder
  - Props: `type` ("card" | "text" | "grid"), `count`
  - Usage: Product grids, list loading

- [ ] `src/components/ErrorState.jsx` — Error display
  - Props: `error`, `onRetry`
  - Usage: When API calls fail

- [ ] `src/components/ProductFilter.jsx` — Sort/filter UI
  - Props: `onSort`, `onFilter`, `availableTags`
  - Usage: Accounts, Resources, Gems pages

- [ ] `src/components/StatusBadge.jsx` — Status indicator
  - Props: `status`, `size`
  - Color-coded: green (completed), yellow (pending), red (banned)

- [ ] `src/components/Breadcrumb.jsx` — Navigation breadcrumbs
  - Props: `path` (array of {label, href})
  - Usage: Product detail pages

### Enhance Existing Components
- [ ] ErrorBoundary — Add better error UI with retry button
- [ ] Toast utilities — Add loading toast, position control
- [ ] Forms — Add aria-live, aria-label, focus management

---

## 🛠️ PHASE 4: PAGE-LEVEL IMPROVEMENTS (NOT STARTED)

### Admin Panel (`pages/Admin.jsx`)
- [ ] Add confirmation dialogs before delete/ban actions
- [ ] Add skeleton loaders during data fetching
- [ ] Add error states with retry buttons
- [ ] Refactor all 13+ hardcoded fetch calls to use apiClient
- [ ] Add search + sort in user list
- [ ] Add audit log viewer (new tab showing admin action history)

### Product Pages (`Accounts.jsx`, `Resources.jsx`, etc.)
- [ ] Add skeleton loaders during initial load
- [ ] Add sort/filter UI (ProductFilter component)
- [ ] Add error states for failed loads
- [ ] Add empty state messages

### Cart & Checkout (`pages/Cart.jsx`)
- [ ] Add confirmation dialog before checkout
- [ ] Visual breakdown of fees (discount, cashback)
- [ ] Order summary sidebar (sticky on desktop)
- [ ] Validation feedback before submitting

### Profile Page (`pages/Profile.jsx`)
- [ ] Already has mobile burger menu ✓
- [ ] Add form validation feedback
- [ ] Add loading states for async operations
- [ ] Polish for better UX

---

## 🔐 PHASE 5: ROLE-BASED SECURITY (NOT STARTED)

### Admin Features
- [ ] Ensure AdminRoute protection is working
- [ ] Add confirmation dialogs before user bans
- [ ] Add confirmation dialogs before product deletions
- [ ] Implement audit logging (log all admin actions with timestamps)
- [ ] Add rate limiting to sensitive endpoints

### Buyer Features
- [ ] Profile page with order history ✓ (already exists)
- [ ] Wishlist functionality ✓ (already exists)
- [ ] Product comparison feature
- [ ] Order tracking / status updates

### Security Indicators
- [ ] Add "Secure" badge in footer
- [ ] Add privacy notice about data collection
- [ ] Add cookie consent (if applicable)

---

## 🧪 PHASE 5: TESTING & VERIFICATION (NOT STARTED)

### Security Testing
- [ ] Test CORS policy blocks unauthorized origins
- [ ] Test HttpOnly cookies are set correctly (DevTools)
- [ ] Test JWT token validation on protected endpoints
- [ ] Test input validation rejects invalid data
- [ ] Test password verification for sensitive ops
- [ ] Test audit logs record admin actions

### UI Testing
- [ ] Test confirmation dialogs appear before destructive actions
- [ ] Test skeleton loaders appear during loading
- [ ] Test error states display when API fails
- [ ] Test sort/filter functionality
- [ ] Test responsive design on mobile (DevTools)
- [ ] Test keyboard navigation on all forms
- [ ] Test accessibility with screen reader

### Performance Testing
- [ ] Run Lighthouse audit (target: ≥90 for performance + accessibility)
- [ ] Check bundle size (target: <500KB main bundle)
- [ ] Check API response times (target: <500ms)

---

## 📋 FILES ALREADY UPDATED

### Backend (`backend/main.py`)
- ✓ Line 1-4: Added JSONResponse import
- ✓ Line 23-31: Security config (JWT secret, CORS, security headers)
- ✓ Line 37-50: Security headers middleware + CORS whitelist
- ✓ Line 86-104: Pydantic validation models
- ✓ Line 248-286: get_current_user dependency with cookie + header fallback
- ✓ Line 281-338: Login endpoint returns HttpOnly cookies
- ✓ Line 341-382: Refresh-token endpoint returns HttpOnly cookies
- ✓ Line 412-446: Update profile endpoint with validation + auth check

### Backend Config (`backend/.env`)
- ✓ Line 3: New JWT secret (8yUI02b3jH4IGzgGeL3k00LHyODkci_3V4NxcVMXH5U)
- ✓ Line 5: ACCESS_TOKEN_EXPIRE_MINUTES reduced to 1440 (24 hours)
- ✓ Line 6: VITE_FRONTEND_URL added (http://localhost:5173)

### Frontend Auth (`src/context/AuthContext.jsx`)
- ✓ Removed localStorage token storage
- ✓ Updated logout to clear localStorage

### Frontend API (`src/config/apiClient.js`)
- ✓ Added credentials: 'include' to all requests
- ✓ Updated getAuthHeaders() (now returns empty object, cookies auto-sent)

### Frontend Config (`src/config/api.js`)
- ✓ Updated all endpoint definitions to match actual API
- ✓ Added admin endpoints (ban, unban, product CRUD)

### Frontend Pages (`src/pages/Profile.jsx`)
- ✓ Updated login form to use credentials: 'include'
- ✓ Removed token passing to login context
- ✓ Added cleanup for old localStorage tokens on logout
- ✓ Updated register to use credentials: 'include'

### Frontend Components (`src/components/Header.jsx`)
- ✓ Added logout button with icon
- ✓ Mobile menu support already exists ✓

---

## 🚀 QUICK START FOR NEXT SESSION

1. **Resume Phase 2** — Refactor Admin.jsx, Cart.jsx with apiClient
2. **Build Phase 3 Components** — ConfirmDialog, SkeletonLoader, ErrorState
3. **Enhance Admin Panel** — Add confirmations, skeleton loaders, error states
4. **Test Everything** — Security + UI + Performance
5. **Deploy Ready** ✓

---

## 📚 COMMANDS TO KNOW

```bash
# Backend startup
cd backend
python main.py

# Frontend startup
cd lords-shop
npm run dev

# Test login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Check cookies in browser
# DevTools → Application → Cookies → look for access_token, refresh_token (HttpOnly ✓)
```

---

## ⚠️ IMPORTANT NOTES

1. **Never commit `.env` file** — already in `.gitignore` ✓
2. **HttpOnly cookies are secure** — XSS cannot steal them
3. **CORS whitelist is active** — only localhost:5173 allowed
4. **Credentials: include is required** — for cookies to be sent with requests
5. **All admin endpoints need get_current_user dependency** — to be added in Phase 2

---

## 📞 CONTACT POINTS

- Security: JWT tokens in HttpOnly cookies, CORS whitelist, input validation
- API: Centralized endpoints in `src/config/api.js`
- Components: Reusable in `src/components/`
- Admin: `/admin` route with role-based protection
- User Auth: Cookie-based with automatic refresh on 401

---

**Next Step:** Start Phase 2 — Refactor Admin.jsx to use apiClient
