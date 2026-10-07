# Library Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Library in the supplied mobile video functional and account-persistent.

**Architecture:** The existing `library-chatgpt.js` owns presentation and interaction. `JDLibraryStorage` in `index.html` provides account-scoped Supabase operations, while a migration adds folders and owner-only metadata updates. Chat reuse goes through the existing attachment pipeline.

**Tech Stack:** Vanilla JavaScript, Supabase Auth/Postgres/Storage, Node contract tests, headless Chrome.

**Spec:** `docs/superpowers/specs/2026-10-07-library-reference-design.md`

## Global Constraints

- Preserve the existing black full-screen mobile layout and the three tabs.
- Keep files private in `user-library` and scope all rows to the signed-in user.
- Keep all existing chat, generated artifact, and attachment flows working.

## Review Focus

- New folder after reload appears once with correct count.
- Favorite or move failure does not claim success.
- Storage upload failure leaves no metadata row.
- Selecting a Library file reaches the composer attachment flow.
- Mobile keyboard does not hide folder name and Create controls.

### Task 1: Persist folder and metadata changes

**Files:** `supabase/migrations/*library_folders*.sql`, `index.html`, `tests/library_storage_contract_test.mjs`

- [ ] Write failing tests for per-user folder operations and owner-only metadata update policy.
- [ ] Run test and confirm expected failure.
- [ ] Add migration and storage bridge actions: list/create/delete folders, update item metadata.
- [ ] Run targeted test and full contract suite.

### Task 2: Complete Library interactions

**Files:** `library-chatgpt.js`, `tests/library_interaction_test.mjs`

- [ ] Write failing tests for folder creation, search, favorite/move, and delete error handling.
- [ ] Run test and confirm expected failure.
- [ ] Wire storage actions and keyboard-safe folder dialog, preserving the reference layout.
- [ ] Run targeted tests and full contract suite.

### Task 3: Reuse saved files in chat and verify preview

**Files:** `library-chatgpt.js`, `index.html`, `tests/library_chat_reuse_test.mjs`

- [ ] Write failing test proving a saved Library file becomes a real composer attachment.
- [ ] Run test and confirm expected failure.
- [ ] Implement the selected-file bridge through existing attachment handling.
- [ ] Run `npm run check`, CI headless Chrome smoke, and preview review; report limitations before merge.
