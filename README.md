# Image2Text

Extract text from any image — **completely offline**.

Image2Text is a privacy-first OCR app for Android and iOS. Photos are captured or picked,
optionally cropped/rotated, and processed by an on-device text recognition engine
(Google ML Kit with bundled language models). Nothing is ever uploaded.

## Features

- **Take Photo / Select Image** — camera capture with torch control, or library import (JPG/PNG/HEIC)
- **Crop & rotate editor** before extraction
- **Offline OCR** — bundled models for Latin, Chinese, Devanagari, Japanese, Korean scripts
- **Smart result formatting** — preserves line structure, merges proven word-wraps, dehyphenates
- **Edit, Copy All, Share, Save** extracted text with autosave
- **Scan history** — SQLite-backed, searchable (titles + text), rename, multi-select delete
- **Dark mode** — System / Light / Dark
- No account, no network calls for recognition, works in airplane mode from first launch

## Requirements

- Node 18+
- Android: Android Studio + SDK to build (`npm run android`)
- iOS: macOS with Xcode + CocoaPods (`npm run ios`)

> The OCR engine uses native modules, so **Expo Go cannot load this app** — use a dev build.

## Getting started

```bash
npm install
npx expo prebuild        # generates native projects (android here; add `-p ios` on macOS)
npm run android          # build + run on Android
npm run ios              # build + run on iOS (macOS only)
```

The repository ships a pre-generated `android/` project. If you change `app.json`,
regenerate it with `npx expo prebuild --clean`.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Metro dev server |
| `npm run android` / `npm run ios` | Native dev build + launch |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Unit tests (business logic) |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the stack rationale, OCR pipeline,
database schema, and risk register. See [docs/MANUAL_QA.md](./docs/MANUAL_QA.md) for the device test checklist.

```
src/
  components/     UI kit (buttons, cards, dialogs, toast…)
  screens/        Home · History · Settings tabs
  features/       scanner → editor → processing → result flow
  services/
    ocr/          OCRService abstraction + ML Kit adapter + text normalizer
    imaging/      preprocessing, crop math
    database/     SQLite (migrations, scans repository, search)
    storage/      file storage, settings KV, share service
  hooks/ theme/ types/ utils/ constants/
```

## Privacy

- All recognition runs on-device via bundled models; the app performs no network requests for its core function.
- Images and extracted text live only in the app's private storage.
- Deleting a scan (or clearing history) removes its database row **and** files.
- No analytics, no trackers, no third-party network SDKs.

## Acceptance test (Definition of Done)

Install the app → enable airplane mode → take a photo of printed text → extract → edit →
save → force-close → reopen → open History → copy the text → share it.
Everything must work with Wi-Fi and mobile data off.
