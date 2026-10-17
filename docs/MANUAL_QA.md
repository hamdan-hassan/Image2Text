# Image2Text — Manual QA Checklist

Run on real devices (one mid/low-end Android, one iOS). Enable **airplane mode** for every
"offline" item. Log device model + OS version with results.

## 1. Definition of Done (airplane mode)
- [ ] Install app, enable airplane mode (Wi-Fi + data off)
- [ ] Take photo of a printed document
- [ ] Crop slightly, extract text
- [ ] Edit the extracted text
- [ ] Tap Save → "Saved" toast
- [ ] Force-close app, reopen
- [ ] History shows the scan; open it
- [ ] Copy All → paste into Notes
- [ ] Share → share sheet opens, send to Messages/WhatsApp/email draft

## 2. Camera
- [ ] First launch: camera permission dialog appears; Allow → viewfinder shows
- [ ] Deny permission → explanation screen; "Open Settings" works; grant → retry works
- [ ] Permanently denied → gate screen with Open Settings (no dead end)
- [ ] Flash toggle fires torch in dark room
- [ ] Capture button produces preview in editor
- [ ] Cancel (X) returns to Home without leaving files behind

## 3. Gallery import
- [ ] Pick JPG / PNG / HEIC (iOS) — all reach the editor upright
- [ ] Permission denied → alert with Open Settings
- [ ] Cancel picker → no navigation happens
- [ ] Very large image (48 MP) extracts without OOM crash
- [ ] Corrupt file (rename .txt→.jpg) → friendly error, no crash
- [ ] Screenshot of text extracts correctly

## 4. Editor
- [ ] Rotate L/R updates preview and final OCR orientation matches
- [ ] Crop: drag corners + move selection; Apply bakes; Reset restores original
- [ ] Upside-down photo: rotate twice → text extracts normally
- [ ] Extract with an active crop selection applies it automatically

## 5. OCR results
- [ ] Printed document → paragraphs/lines preserved (not one blob)
- [ ] Receipt → line breaks kept
- [ ] Blurry image → either decent text or graceful failure message
- [ ] Image with no text → "No text detected" screen with both actions
- [ ] Handwriting → no-text or poor result is shown gracefully (not supported)
- [ ] Multi-column page → columns do not interleave mid-sentence (best effort)

## 6. Result screen
- [ ] Copy All → toast "Text copied"; clipboard contains edited version
- [ ] Share shares the edited text
- [ ] Edits autosave: edit, background app, reopen → edits present
- [ ] Save → explicit toast; word/char counts update live
- [ ] Rename via title tap persists after restart
- [ ] Delete removes from History and does not reappear after restart

## 7. History & search
- [ ] Search by title fragment finds scan
- [ ] Search by content word finds scan
- [ ] Search literal `%` or `_` doesn't match everything (escaping works)
- [ ] Long-press enters multi-select; select several → delete all
- [ ] Empty history state on fresh install

## 8. Settings
- [ ] Theme System/Light/Dark applies instantly to every screen incl. dialogs & camera overlays
- [ ] Recognition language switch (e.g. Japanese) still works offline; switch back to English
- [ ] Keep-originals OFF: new scans have no original retained (storage shrinks); ON: retained
- [ ] Clear history empties list and frees storage

## 9. Offline / privacy
- [ ] Full flow in airplane mode at every step above
- [ ] No "no internet" errors anywhere (feature must not exist)
- [ ] Optional: verify with a proxy/VPN-block-all that nothing is transmitted during OCR

## 10. Robustness
- [ ] Kill app during "Extracting text…" → relaunch → no broken entries in History
- [ ] Low-storage simulation (<25 MB free) → STORAGE_FULL friendly error
- [ ] Rapid double-taps on Extract/Copy produce no duplicates/crashes
- [ ] Dark mode + large font accessibility setting → UI remains usable
- [ ] TalkBack / VoiceOver: primary actions announce labels; copy announces "Text copied"
