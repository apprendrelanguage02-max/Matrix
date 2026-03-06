# CHANGELOG

## 2026-03-06 — Bug Fix Sprint (All P0/P1 Issues)
- Fixed article like notification going to `admin_notifications` instead of `user_notifications`
- Fixed saved procedures `subcategory_name` not being computed from subcategory ID
- Verified and confirmed all 7 reported bugs are resolved:
  1. Price Estimation page (was blank) → Working with cascading dropdowns
  2. Article favorites (save/unsave broken) → Toggle POST endpoint works
  3. Admin "Demandes" page (inaccessible) → Loads correctly
  4. Property edit data loss → PUT with exclude_none preserves fields
  5. Property creation → Works for agent users
  6. Admin Price References tab → Full CRUD working
  7. SavedArticlesPage → Shows all content types
- Testing: 100% pass rate (17/17 backend, all frontend flows verified)
