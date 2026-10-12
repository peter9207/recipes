# Screen Flow

Navigation map for the app. Routes follow Expo Router file paths under `src/app/`. P1 screens are dashed.

## 1. Overview

```mermaid
flowchart TD
    Start([App launch]) --> Splash[Splash: run DB migrations]
    Splash --> Tabs

    subgraph Tabs["Bottom tabs"]
        direction LR
        T1[Recipes]
        T2[Shopping]
        T3[Settings]
    end

    T1 --> Library["Recipe Library<br/>(tabs)/index"]
    T2 --> Lists["Shopping Lists<br/>(tabs)/shopping"]
    T3 --> Settings["Settings<br/>(tabs)/settings"]

    %% Recipes
    Library -->|tap recipe| Detail["Recipe Detail<br/>recipe/[id]"]
    Library -->|"+ button"| Editor
    Library -->|search / filter| Library
    Library -->|select mode: pick recipes| Generate

    Detail -->|edit| Editor["Recipe Editor<br/>recipe/[id]/edit · recipe/new"]
    Detail -->|photo| Viewer["Photo Viewer<br/>full-screen, swipe, zoom"]
    Detail -->|add to shopping list| Generate["Generate Shopping List<br/>choose recipes + servings"]
    Detail -->|delete| ConfirmDel{{Confirm delete}}
    ConfirmDel -->|yes| Library
    Detail -.->|cook| Cook["Cooking Mode<br/>recipe/[id]/cook"]
    Cook -.-> Detail

    Editor -->|add photo| PhotoSource{{Camera or library}}
    PhotoSource --> Editor
    Editor -->|save| Detail
    Editor -->|cancel with changes| ConfirmDiscard{{Discard changes?}}
    ConfirmDiscard -->|discard| Back([Previous screen])
    ConfirmDiscard -->|keep editing| Editor

    %% Shopping
    Generate -->|create list| ListDetail
    Generate -->|add to existing list| ListDetail
    Lists -->|tap list| ListDetail["Shopping List Detail<br/>shopping/[id]"]
    Lists -->|"+ new list"| ListDetail
    Lists -->|"+ from recipes"| Generate
    ListDetail -->|check off / edit / add item| ListDetail
    ListDetail -->|clear checked| ListDetail
    ListDetail -.->|share as text| ShareSheet[[System share sheet]]

    %% Settings
    Settings -.-> Backup["Backup / Restore"]
    Settings -.-> Trash["Recently Deleted"]
    Trash -.->|restore| Library

    %% Import
    Library -.->|import from URL| ImportUrl["Import from URL"]
    ImportUrl -.->|parsed| Editor

    classDef p1 stroke-dasharray: 5 5;
    class Cook,Backup,Trash,ImportUrl,ShareSheet p1;
```

## 2. Core MVP Journeys

### Add a recipe with a photo
```mermaid
flowchart LR
    A[Library] -->|"+"| B[Editor: title, servings, times]
    B --> C[Add ingredients<br/>type a line, auto-parsed]
    C --> D[Add steps]
    D --> E[Add photo<br/>camera / library]
    E --> F[Save]
    F --> G[Recipe Detail]
```

### Build a shopping list from recipes
```mermaid
flowchart LR
    A[Library or Detail] --> B[Generate: pick recipes]
    B --> C[Set servings per recipe]
    C --> D{New or existing list?}
    D -->|new| E[Name the list]
    D -->|existing| F[Choose list]
    E --> G[Shopping List Detail<br/>merged, scaled items]
    F --> G
    G --> H[Check off while shopping]
    H --> I[Clear checked]
```

## 3. Screen Inventory

| Screen | Route | Purpose | Priority |
|---|---|---|---|
| Recipe Library | `(tabs)/index` | Browse, search, filter recipes; entry to create | P0 |
| Recipe Detail | `recipe/[id]` | View ingredients, steps, photos; scale servings; actions | P0 |
| Recipe Editor | `recipe/[id]/edit`, `recipe/new` | Create and edit all recipe fields and photos | P0 |
| Photo Viewer | modal | Full-screen photos with zoom and swipe | P0 |
| Shopping Lists | `(tabs)/shopping` | All lists with progress counts | P0 |
| Generate Shopping List | modal | Pick recipes and servings, create or add to a list | P0 |
| Shopping List Detail | `shopping/[id]` | Check off, edit, add and clear items | P0 |
| Settings | `(tabs)/settings` | Units, theme; links to backup and trash | P1 |
| Cooking Mode | `recipe/[id]/cook` | Step-by-step, screen stays awake | P1 |
| Recently Deleted | `settings/trash` | Restore or purge deleted recipes | P1 |
| Backup / Restore | `settings/backup` | Export and import library | P1 |
| Import from URL | modal | Paste a link to prefill the editor | P1 |

## 4. Navigation Notes

- **Tabs** are the only top-level navigation: Recipes, Shopping, Settings.
- **Detail and editor** are pushed onto the stack above the tabs; Editor "save" replaces itself with Detail so back goes to the Library, not back into the editor.
- **Photo Viewer, Generate, and Import** are modals, dismissed by swipe or close button.
- **Unsaved changes:** the Editor intercepts back and swipe gestures and asks before discarding. A draft is also auto-saved so an app kill does not lose work.
- **Deep entry points:** "Add to shopping list" is available from both Library (multi-select) and Detail (single recipe), and lands in the same Generate screen.
