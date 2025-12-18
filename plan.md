## 15. Delete Account Feature Implementation

### 15.1 Overview

Add ability for users to delete their own account from the profile page, with a confirmation step to prevent accidental deletion.

### 15.2 User Flow

1. User visits profile page → sees "Delete Account" section at bottom (red styling)
2. User clicks "Delete Account" button → navigates to confirmation page
3. Confirmation page shows warning with two options:
   - **Cancel** → returns to profile page (user can still sign out/sign in)
   - **Delete This Account** → permanently deletes account, redirects to sign-in

### 15.3 Files to Modify

| File                                   | Change                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `src/constants.ts`                     | Add `PATHS.PROFILE_DELETE_CONFIRM` and `PATHS.PROFILE_DELETE` |
| `src/routes/profile/build-profile.tsx` | Add delete account section with red divider and warning       |
| `src/index.ts`                         | Register new routes                                           |

### 15.4 Files to Create

| File                                          | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `src/routes/profile/build-delete-confirm.tsx` | Confirmation page with Cancel/Delete buttons |
| `src/routes/profile/handle-delete-account.ts` | POST handler to delete user and redirect     |
| `src/lib/db-access.ts`                        | Add `deleteUserAccount(db, userId)` function |

### 15.5 Implementation Checklist

- [ ] Add path constants for `/profile/delete-confirm` and `/profile/delete`
- [ ] Add delete account section to profile page:
  - [ ] Red divider (`divider` with red background)
  - [ ] "Delete Account" heading in red
  - [ ] Warning text: "This action cannot be undone"
  - [ ] Button linking to confirmation page
- [ ] Create confirmation page (`build-delete-confirm.tsx`):
  - [ ] Requires `signedInAccess` middleware
  - [ ] "Are you absolutely sure?" heading
  - [ ] Warning about permanent deletion
  - [ ] Cancel button (link to `/profile`)
  - [ ] Delete This Account button (form POST to `/profile/delete`)
- [ ] Create delete handler (`handle-delete-account.ts`):
  - [ ] Requires `signedInAccess` middleware
  - [ ] Get user ID from session
  - [ ] Delete user from database (FK cascade handles sessions/accounts)
  - [ ] Clear session cookie
  - [ ] Redirect to sign-in with success message
- [ ] Add `deleteUserAccount` to `db-access.ts`:
  - [ ] Use `withRetry` wrapper
  - [ ] Return `Result<boolean, Error>`
- [ ] Register routes in `index.ts`

### 15.6 E2E Tests to Create

| Test File                                             | Scenario                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `e2e-tests/profile/05-delete-account-cancel.spec.ts`  | Cancel flow: sign in → profile → delete → confirm → cancel → back on profile → can sign out and sign back in                 |
| `e2e-tests/profile/06-delete-account-confirm.spec.ts` | Delete flow: sign in → profile → delete → confirm → delete → redirected to sign-in → cannot sign in with deleted credentials |

### 15.7 Security Considerations

- [ ] Confirmation page requires authentication
- [ ] Delete handler requires authentication
- [ ] User can only delete their own account (ID from session, not URL)
- [ ] CSRF protection on POST handler
- [ ] No-cache headers on confirmation page

---

## 16. Review Complete

- [ ] All sections reviewed
- [ ] Issues documented with recommendations
- [ ] Production checklist verified
