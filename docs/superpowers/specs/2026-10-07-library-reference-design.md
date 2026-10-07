# JepongDevxyz AI Library reference design

## Intent
Match the supplied 18.9-second mobile Library recording: black full-screen page, Suggested/Favorites/Folders tabs, two-column cards, bottom Search and plus control, Upload files and New folder menu, and a name dialog that works with the mobile keyboard. The Library must retain account-scoped data after reload and allow a saved file to be reused in chat.

## Scope
Existing Supabase `library_items` and private `user-library` bucket remain the file source. Add account-scoped folder rows, fix metadata update authorization, and expose explicit storage actions to the Library UI. Suggested shows recent files, Favorites shows starred files, Folders shows saved folders and their counts. Search filters visible files/folders by name. Selecting a file offers Open, Add to chat, Favorite/Move, and Delete; the composer has an Add from Library action. Support small mobile viewports and keyboard resize.

## Data and security
`library_folders(id,user_id,name,created_at)` has a per-user unique name and RLS select/insert/delete policies. `library_items` receives an owner-scoped UPDATE policy with USING and WITH CHECK. Every update, delete, signed URL, and folder mutation is scoped to `auth.uid()` through RLS and client `user_id`. File bytes stay in private Storage. A failed upload/metadata write reports an error and does not render a phantom success. Folder deletion removes the folder row and clears folder references from the user's items; file deletion removes Storage and metadata with error handling.

## UX and verification
The video is the visual reference for tabs, card spacing, menus, and folder dialog. Empty/loading/error states explain the actual condition. Show only actions with real handlers. Tests exercise folder persistence, favorite/move updates, upload/delete failure behavior, and adding a Library file to the chat attachment flow. Run the full project suite and mobile browser smoke on a preview branch before merge.
