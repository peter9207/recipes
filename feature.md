# Recipes App — Feature Specification

A cross-platform (iOS + Android) mobile app for recording, organizing, and cooking from personal recipes.

## Goals

- Make it fast and pleasant to capture a recipe, whether typed in by hand or copied from elsewhere.
- Keep recipes visual, with photos for the finished dish and individual steps.
- Turn a plan to cook into a ready-to-use shopping list.
- Work fully offline; the kitchen and the supermarket often have poor reception.

## Priority Legend

- **P0** — MVP, required for first release
- **P1** — Important, shortly after MVP
- **P2** — Nice to have / future

---

## 1. Recipe Management

### 1.1 Create a recipe (P0)
- Title (required)
- Description / notes
- Servings (number)
- Prep time, cook time (total time derived)
- Ingredients list: each with quantity, unit, name, and optional note (e.g. "2 cups flour, sifted")
- Ordered steps / instructions
- Tags and category (e.g. dinner, dessert, vegetarian, quick)
- Source (free text or URL, e.g. "Grandma", "nytimes.com/...")
- Auto-save drafts so nothing is lost if the app closes mid-entry

### 1.2 Edit a recipe (P0)
- Edit every field of an existing recipe
- Add, remove, and reorder ingredients and steps (drag to reorder)
- Unsaved-changes warning when leaving the editor

### 1.3 Delete and restore (P0)
- Delete with confirmation
- Recently deleted area for recovery (P1)

### 1.4 Duplicate a recipe (P1)
- Copy an existing recipe as the starting point for a variation

### 1.5 Favorites (P1)
- Mark recipes as favorites and filter by them

### 1.6 Cooking notes and history (P2)
- Personal notes added after cooking ("use less salt next time")
- Log of dates cooked and a rating

---

## 2. Pictures

### 2.1 Recipe photos (P0)
- Attach one or more photos to a recipe
- Take a photo with the camera or pick from the photo library
- Choose a cover photo shown in lists
- Reorder and delete photos

### 2.2 Step photos (P1)
- Attach a photo to an individual step

### 2.3 Image handling (P0)
- Compress and resize on import to save storage
- Full-screen viewer with pinch to zoom and swipe between photos
- Basic crop/rotate (P1)

---

## 3. Browsing and Search

### 3.1 Recipe library (P0)
- List/grid view with cover photo, title, and time
- Sort by name, date added, recently cooked (P1)

### 3.2 Search (P0)
- Search by title and ingredient
- Search within notes and tags (P1)

### 3.3 Filtering and organization (P1)
- Filter by tag, category, favorites, max cooking time
- Collections / cookbooks to group recipes (e.g. "Holiday", "Weeknight")

---

## 4. Shopping List

### 4.1 Generate from recipes (P0)
- Select one or more recipes and add all their ingredients to a shopping list
- Choose the number of servings per recipe; quantities scale accordingly
- Merge duplicate ingredients across recipes (e.g. 1 onion + 2 onions → 3 onions)
- Convert compatible units when merging (e.g. tsp/tbsp, g/kg) (P1)

### 4.2 Manage the list (P0)
- Check off items as they are bought
- Add, edit, and delete items manually
- Clear checked items
- Multiple lists (P1)

### 4.3 Organization (P1)
- Group items by aisle/category (produce, dairy, pantry...)
- Mark items already in the pantry so they are skipped or flagged (P2)
- Show which recipe(s) each item came from

### 4.4 Sharing (P1)
- Share the list as text via the system share sheet
- Real-time shared lists with a partner or family (P2)

---

## 5. Cooking Mode

### 5.1 Step-by-step view (P1)
- Large text, one step at a time, swipe to advance
- Screen stays awake while cooking
- Ingredients checklist accessible from the view

### 5.2 Servings scaling (P1)
- Adjust servings and see ingredient quantities recalculated

### 5.3 Timers (P2)
- Start timers directly from a step (e.g. detect "simmer 10 minutes")
- Multiple concurrent timers with notifications

---

## 6. Import and Export

### 6.1 Import from URL (P1)
- Paste a recipe link and parse title, ingredients, steps, and image (via schema.org/Recipe markup)

### 6.2 Share/receive via share sheet (P1)
- Accept links or text shared into the app from the browser

### 6.3 Import from photo / scan (P2)
- OCR a cookbook page or handwritten card into an editable recipe

### 6.4 Export and share (P1)
- Share a single recipe as text, PDF, or a file other users can import
- Full-library backup and restore (JSON + images) (P1)

---

## 7. Data, Sync, and Accounts

### 7.1 Local-first storage (P0)
- All data stored on-device; the app is fully functional offline

### 7.2 Cloud sync and backup (P1)
- Optional account to sync across devices (iOS ↔ Android)
- Conflict resolution on concurrent edits

### 7.3 Recipe sharing between users (P2)
- Send a recipe to another user of the app

---

## 8. Settings and Preferences

- Measurement system: metric / imperial (P1)
- Light / dark theme (P1)
- Default servings (P2)
- Language / localization (P2)

---

## 9. Non-Functional Requirements

- **Platforms:** iOS and Android from a single codebase
- **Performance:** library of 1,000+ recipes scrolls smoothly; search results feel instant
- **Offline:** every P0 feature works without a network connection
- **Privacy:** data stays on-device unless the user opts in to sync
- **Accessibility:** dynamic text sizes, screen reader labels, sufficient contrast
- **Reliability:** no data loss on crash or interrupted save

---

## 10. MVP Scope Summary

The first release (all P0) delivers:

1. Create, edit, and delete recipes with ingredients, steps, and metadata
2. Attach and view photos, with a cover photo
3. Browse the library and search by title/ingredient
4. Build a shopping list from selected recipes with servings scaling and duplicate merging
5. Check off and manually edit shopping list items
6. Fully offline, local storage

## 11. Open Questions

- Tech stack: React Native, Flutter, or Expo? (affects camera, storage, and sync options)
- Is multi-user / household sharing a core goal or a later extra?
- Is cloud sync needed at launch, or is local-only acceptable for v1?
- Preferred languages for recipes and UI?
