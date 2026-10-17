# Image2Text — Architecture (Version 1)

Offline, on-device OCR app. No backend. No cloud OCR. No analytics.

---

## 1. Technology Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React Native 0.86 + Expo SDK 57** (CNG / dev build) | Single TypeScript codebase for Android + iOS. Requires `npx expo prebuild` + native build (Expo Go cannot load ML Kit). |
| Language | TypeScript (strict) | |
| OCR | **Google ML Kit Text Recognition v2** via `@react-native-ml-kit/text-recognition` | Fully on-device, models **bundled** in the binary. |
| Camera | `expo-camera` (`CameraView`) | Torch control, EXIF capture, permission flow. |
| Image pick | `expo-image-picker` | JPEG/PNG/HEIC; re-encodes to JPEG to normalise HEIC before OCR. |
| Image processing | `expo-image-manipulator` (native, off-main-thread) | Resize / rotate / crop / thumbnails. |
| Local DB | `expo-sqlite` (WAL mode) | Scans store with versioned migrations. |
| Settings KV | `@react-native-async-storage/async-storage` | Theme, script preference, storage prefs. |
| Files | `expo-file-system` (new `File`/`Directory` API) | App-private document dir for images/thumbnails, cache for temp. |
| Clipboard | `expo-clipboard` | |
| Share | React Native core `Share.share()` | Plain text today; file-export interface ready for TXT/PDF later. |
| Navigation | React Navigation 7 (bottom tabs + native-stack modals) | |
| Icons | `@expo/vector-icons` (Feather) | Bundled with Expo. |
| Tests | Jest + jest-expo | Pure business logic unit tests. |

## 2. Offline OCR Engine — and why

**Chosen: Google ML Kit Text Recognition v2 (bundled variant).**

Evaluated options:

| Option | Accuracy | Speed | Offline | Size | Verdict |
|---|---|---|---|---|---|
| **ML Kit v2 (bundled)** | Excellent on printed text | ~100–500 ms/page on mid-range phones | Yes — model ships inside the binary | ~+30–45 MB (all 5 scripts bundled by the wrapper) | ✅ Selected |
| ML Kit v2 (unbundled via Play Services) | Same | Same | ❌ Model downloaded on demand — violates offline-first | Tiny | Rejected |
| Tesseract (RN wrappers) | Mediocre layout/line detection, poor on photos | Slow (seconds/page) | Yes | 10–20 MB traineddata per language | Rejected |
| Apple VisionKit / iOS-only OCR | Excellent | Fast | Yes | Small | iOS-only → rejected for shared codebase |
| Cloud OCR (Vision/Textract/Azure) | High | Network-bound | ❌ | — | Rejected: privacy + offline violation |

Decisive factors:
1. **Guaranteed offline from first launch** — the wrapper's Gradle/Podspec pull the *bundled* artifacts (`com.google.mlkit:text-recognition`, `GoogleMLKit/TextRecognition`). Nothing is fetched at runtime.
2. Best accuracy/speed trade-off for photographed documents without any tuning.
3. Cross-platform (Android API 21+, iOS 15.5+) from one JS API.
4. The wrapper bundles recognizers for **Latin, Chinese, Devanagari, Japanese and Korean**, so V1 ships a real offline language-script selector with zero extra downloads.
5. Maintainable: one small adapter isolates the library; replacing engines later touches one file.

Known limitations (documented honestly):
- The community bridge does not expose **confidence scores** → V1 has no confidence UI; the `OCRResult.confidence` field stays optional in the abstraction so it can light up when the bridge or a replacement engine provides it.
- Handwriting is not a supported use case (same for all on-device OCR engines listed).
- RN 0.82+ removed the legacy architecture; this classic module runs through RN's **interoperability layer** (it is a plain promise-based module, which interop supports). Upstream TurboModule support is in progress; our adapter keeps that swap trivial.

Autolinking note (verified): Expo SDK 57 links community libraries through
`expoAutolinking.rnConfigCommand` (`expo-modules-autolinking react-native-config`),
which resolves `@react-native-ml-kit/text-recognition` and its iOS podspec correctly.

## 3. Compatibility & size

- **Android:** minSdk 24 (Expo default; ML Kit needs ≥21), target/latest SDK per Expo 57. APK impact ≈ **+35–50 MB** because the wrapper bundles all five script recognizers (~4 MB Latin, CJK models larger).
- **iOS:** deployment target **15.5** (podspec requirement), arm64 devices. Similar binary-size increase.
- If app size must be reduced later: fork the podspec/build.gradle to keep only needed scripts (one-line change), or switch to unbundled with an explicit first-run model-download screen (still offline afterwards).

## 4. Folder structure

```
src/
  components/          # reusable UI kit
  screens/             # Home, History, Settings (thin screens)
  navigation/          # root navigator + route types
  features/
    scanner/           # camera screen
    editor/            # preview, crop/rotate editor
    processing/        # OCR progress screen
    result/            # extracted-text editor screen
    history/           # scan row, search helpers
  services/
    ocr/               # OCRService pipeline + mlkit adapter + normalizer
    imaging/           # preprocessing, validation, orientation
    database/          # sqlite open, migrations, scans repository
    storage/           # file paths, settings KV, share service
  hooks/               # useTheme, useSettings, useScans, useDebouncedCallback…
  theme/               # tokens + ThemeProvider (system/light/dark)
  constants/           # config limits
  types/               # OCR, scan, settings, error types
  utils/               # errors, logger, text stats, ids, date
__tests__/             # jest unit tests (pure logic)
docs/MANUAL_QA.md      # device test checklist
```

## 5. System diagram

```
┌──────────────────────────── UI (React Navigation) ────────────────────────────┐
│ Tabs: Home / History / Settings      Modals: Scanner → Editor → Processing → │
│                                                                              Result │
└──────────┬───────────────────────┬──────────────────────────┬────────────────┘
           │                       │                          │
   ScanFlowController       ScansRepository            SettingsStore (AsyncStorage)
           │                       │
┌──────────▼──────────┐   ┌────────▼─────────┐
│ ImagingService      │   │ expo-sqlite      │
│ validate → orient → │   │ migrations       │
│ downscale → crop/   │   │ scans table      │
│ rotate → thumbnail  │   └──────────────────┘
└──────────┬──────────┘
           │ file:// processed image
┌──────────▼──────────┐   ┌──────────────────────────────────────┐
│ OCRService          │──▶│ MlKitRecognizer (adapter)            │
│ recognize()         │   │  @react-native-ml-kit/text-recognition│
│ normalizeResult()   │   │  (native, bundled models, offline)   │
└──────────┬──────────┘   └──────────────────────────────────────┘
           ▼
   OCRResult {text, blocks, script, processingTimeMs}
           ▼
   ScansRepository.insert → FileSystem originals/thumbs → History/Home
```

Everything above the dashed line of the adapter is pure TypeScript and unit-testable. No network permission is requested; no HTTP client exists in the app.

## 6. Database schema (expo-sqlite, WAL)

```sql
-- migration 001
CREATE TABLE IF NOT EXISTS scans (
  id                   TEXT PRIMARY KEY NOT NULL,   -- uuid (expo-crypto)
  title                TEXT NOT NULL,
  original_image_path  TEXT,                        -- nullable (user may purge)
  processed_image_path TEXT,
  thumbnail_path       TEXT,
  extracted_text       TEXT NOT NULL DEFAULT '',    -- raw OCR output (immutable)
  edited_text          TEXT,                        -- user edits; NULL until changed
  script               TEXT NOT NULL DEFAULT 'Latin',
  word_count           INTEGER NOT NULL DEFAULT 0,
  char_count           INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL,            -- epoch ms
  updated_at           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_updated_at ON scans (updated_at DESC);

CREATE TABLE IF NOT EXISTS settings_kv (         -- reserved for future relational needs;
  key TEXT PRIMARY KEY, value TEXT NOT NULL      -- V1 settings live in AsyncStorage
);
```

Migrations run sequentially against `PRAGMA user_version`; each step is transactional. Images are never stored as blobs — only `file://` paths into the app's private `Documents/images/{originals,thumbs}/`.

Display text = `edited_text ?? extracted_text`. Search covers `title`, `extracted_text`, `edited_text` (case-insensitive `LIKE`, escaped).

## 7. OCR pipeline

```
source (camera / picker)
  → validate (exists, decodable, extension allow-list, size guard)
  → normalizeOrientation (EXIF baked via rotate; fixes iOS HEIC/JPEG rotation)
  → downscale if max(w,h) > 2048 (keeps small print legible, prevents OOM)
  → user edits (crop rect in pixel space, ±90° rotations, reset)
  → save processed JPEG (q≈0.9) + 320 px thumbnail (q≈0.7)
  → MlKitRecognizer.recognize(path, script)     ← native, off JS thread
  → normalizeResult:
       • flatten blocks→lines (+frames when present)
       • reading-order sort fallback when frames missing
       • paragraph rebuild: gap > 60% median line height ⇒ new paragraph
       • bullet/numbered lines kept atomic
       • continuation lines joined with single space
  → stats (words/chars) + processingTimeMs
  → ScansRepository.insert (auto-persisted immediately — nothing can be lost)
```

Empty result (no blocks / whitespace-only text) surfaces a dedicated **No text detected** state instead of an empty editor.

## 8. Screens & navigation

```
RootStack
 ├─ Tabs
 │   ├─ Home        hero actions (Take Photo / Select Image), privacy chip,
 │   │              recent scans, empty state
 │   ├─ History     search bar, list, long-press multi-select, rename, delete
 │   └─ Settings    appearance · recognition script · storage · privacy · about
 ├─ Scanner        fullScreenModal camera: shutter, torch, cancel, permission gate
 ├─ Editor         modal: preview, rotate L/R, crop overlay, reset, "Extract Text"
 ├─ Processing     fullScreenModal: spinner + status (non-blocking, cancellable)
 └─ Result         fullScreenModal: editable text, stats, Copy All / Share / Save /
                   Rescan, delete, empty-result state
```

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Classic module under New Architecture | Interop layer handles promise modules; adapter isolates the swap point; upstream TurboModule PR tracked |
| OOM on 48 MP images | Hard downscale to ≤2048 px before decode-heavy steps; manipulator streams natively |
| EXIF rotation mismatches | Orientation baked explicitly from picker/camera EXIF before OCR/display |
| HEIC quirks | Picker re-encodes to JPEG (`quality < 1`) before the pipeline |
| Wrapper bundles all scripts (size) | Documented; fork-to-trim path documented in §3 |
| Storage exhaustion | `Paths.availableDiskSpace` check pre-capture; friendly STORAGE_FULL error |
| OCR killed mid-run (app termination) | Result inserted only after success; source image already persisted at Editor stage so user can retry without recapturing |
| DB corruption | WAL + transactions; repo wraps errors into typed `AppError('DB_ERROR')` |

## 10. Implementation plan (executed in this repo)

1. Config: permissions (camera/photo), iOS 15.5 target, jest, strict TS.
2. Types/theme/utils.
3. Database + file storage + settings.
4. OCR layer (adapter → normalizer → service) + tests.
5. UI kit + navigation + three tab screens.
6. Scanner flow (camera → editor → processing → result).
7. Polish: dark mode, empty/error states, accessibility, haptics.
8. Verification: `tsc --noEmit`, `jest`, `expo prebuild` sanity, manual QA checklist.

## 11. Definition of Done (V1 acceptance)

Airplane-mode test from the brief must pass: photograph → extract → edit → save → relaunch → find in History → copy → share, with Wi-Fi and mobile data fully disabled. Every network-dependent feature simply does not exist in the binary.
