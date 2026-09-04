# Admin Dashboard — Simplified Plan

## 4 New Tabs (add to existing 7 tabs)

### 1. User Search & Filters (enhance existing Users tab)
- Add search input (filters by name/email)
- Add role filter dropdown (All/Student/Professional/Recruiter/Admin)
- Keep existing ban/delete/edit functionality as-is

### 2. Referral Management (new tab)
- Table showing all referrals: Requester name, Professional name, Job title, Status badge, Date
- Status filter dropdown (All/Pending/Accepted/Rejected)
- That's it — read-only view for admin oversight

### 3. System Announcements (new tab + banner)
- Simple form: Title, Body, Type (info/warning/maintenance)
- List of announcements with Delete button
- Active announcements show as a banner at top of all pages
- 1 new DB table: `announcements`

### 4. Feature Flags (new tab)
- Simple toggle cards for: LinkedIn OAuth, Google OAuth, Demo Mode, Messaging
- Uses existing `platform_settings` table (no new table needed)
- Toggle updates the DB instantly

---

## What We're NOT Doing
- ~~Admin audit log~~ (too complex for now)
- ~~System health monitoring~~ (hard to get reliable metrics on free tier)
- ~~User detail drawer~~ (overkill)
- ~~Referral admin override~~ (admin shouldn't change referral statuses)
- ~~Announcement expiry/target roles/priority~~ (keep it simple)
- ~~Feature flag caching~~ (just query DB each time)

---

## Files to Change
1. `src/pages/Admin.tsx` — add 3 new tabs, enhance Users tab with search/filter
2. `src/lib/db.ts` — add `fetchAllReferrals()`, `fetchAnnouncements()`, `createAnnouncement()`, `deleteAnnouncement()`, `fetchFeatureFlags()`, `updateFeatureFlag()`
3. `src/components/AnnouncementBanner.tsx` — new, simple banner component
4. `src/components/layout.tsx` — render banner in AppShell
5. `src/context/AppContext.tsx` — fetch active announcements + feature flags on mount
6. SQL migration — just the `announcements` table

## Implementation Order
1. Run SQL for `announcements` table
2. Add DB functions to `db.ts`
3. Enhance Users tab (search + filter)
4. Add Referral Management tab
5. Add Announcements tab + banner
6. Add Feature Flags tab
7. Build, test, deploy
