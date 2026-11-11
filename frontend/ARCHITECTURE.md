# ParliSense Frontend Architecture Guide (Feature-Based MVM)

This document establishes the architectural standards for the ParliSense frontend. **All future frontend modifications must strictly adhere to the Feature-Based MVM pattern.**

---

## 1. Architectural Philosophy: Feature-Based MVM

Every meaningful feature in the application resides in its own isolated module under `src/features/<feature-name>/`:

```
src/features/<feature-name>/
├── model/           # Domain entities, validation rules, pure algorithms, calculations
├── viewmodel/       # React custom hook encapsulating UI state, async I/O, event handlers
├── view/            # Presentation components (pure JSX + Tailwind, no direct API calls)
└── index.ts         # Public barrel export exposing the feature's API to the rest of the app
```

Cross-cutting concerns reside strictly in:
- `src/shared/`: Reusable presentation components (`Header`), utility functions (`sound`), and domain types.
- `src/infrastructure/`: HTTP client, WebSocket subscribers, and React Context providers.

---

## 2. Layer Responsibilities & Rules

### Model (`model/`)
- **Strictly pure:** No React hooks (`useState`, `useEffect`), no JSX, no browser DOM dependencies.
- **Responsibilities:** Domain validation, formatting, type definitions, scoring math, business invariants.
- **Unit testable:** Can be tested with pure Jest/Vitest without React test renderer.

### ViewModel (`viewmodel/`)
- **Naming convention:** Custom hook named `use<Feature>ViewModel.ts` returning an object.
- **Responsibilities:**
  - Manages feature-level state (`useState`, `useRef`).
  - Orchestrates lifecycle effects (`useEffect`).
  - Calls services/API methods and updates local or global state.
  - Exposes actions, event handlers, and computed values to the View.
- **Rule:** Never returns JSX. Only returns state values, computed properties, and dispatch callbacks.

### View (`view/`)
- **Strictly presentational:** Bound directly to its corresponding ViewModel via `use<Feature>ViewModel()`.
- **Responsibilities:** Render layout, apply Tailwind styling, attach onClick/onChange handlers to ViewModel methods.
- **Rule:** Never call fetch, axios, or WebSocket methods directly within a View component. Always delegate to the ViewModel.

### Feature Public API (`index.ts`)
- Every feature must expose its primary view, viewmodel, and relevant types via `index.ts`.
- Other features and `App.tsx` must import from `src/features/<feature-name>`, never reaching into internal private files across features.

---

## 3. How to Add a New Feature

When introducing a new feature (e.g., `voting` or `committee-reports`):
1. Create `src/features/<feature-name>/` with subdirectories: `model/`, `viewmodel/`, `view/`.
2. Define models and pure algorithms in `model/<feature-name>.model.ts` and types in `model/<feature-name>.types.ts`.
3. Create the ViewModel hook in `viewmodel/use<FeatureName>ViewModel.ts`.
4. Build the View component in `view/<FeatureName>Page.tsx`.
5. Export the public API in `index.ts`.
6. Mount or route the feature in `App.tsx`.
