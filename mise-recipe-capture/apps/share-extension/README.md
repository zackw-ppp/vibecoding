# Mise iOS Share Extension scaffold

> **NOT WIRED INTO XCODE:** these files are not members of an iOS target, and no
> Xcode project, entitlement, URL scheme, or host-app import code has been
> changed. This Linux-only scaffold has not been compiled or validated by Xcode.

## macOS/Xcode integration

1. Open `apps/client/ios/App/App.xcodeproj` in a current Xcode.
2. Choose **File → New → Target → iOS → Share Extension**:
   - Product/target name: `MiseShareExtension`
   - Language: Swift
   - Suggested bundle identifier: `com.mise.recipes.share-extension`
3. Remove the target membership/references for Xcode's generated
   `ShareViewController.swift`, `MainInterface.storyboard`, and generated
   extension `Info.plist`. This scaffold uses a principal class and no
   storyboard.
4. Use **File → Add Files to “App”…** to add
   `apps/share-extension/Sources/PendingImport.swift` and
   `apps/share-extension/Sources/ShareViewController.swift`. Leave **Copy items
   if needed** unchecked, use **Create groups**, and select only the
   `MiseShareExtension` target.
5. In the extension target's Build Settings, set **Generate Info.plist File** to
   `No` and **Info.plist File** (`INFOPLIST_FILE`) to:

   `$(SRCROOT)/../../../share-extension/Resources/Info.plist`

   Ensure this plist is not also in **Copy Bundle Resources**.
6. Add the four files under `Resources/en.lproj` and
   `Resources/zh-Hans.lproj` to the extension target as localized
   `InfoPlist.strings` and `Localizable.strings` variant groups. In the project
   editor's **Info → Localizations**, enable English and Chinese (Simplified).
   Verify both variant groups appear once in the extension's **Copy Bundle
   Resources** phase.
7. Set the same development team on the `App` and `MiseShareExtension` targets.
   Keep the extension deployment target no newer than the app's, and align its
   marketing/build versions with the containing app. Leave **Require Only
   App-Extension-Safe API** (`APPLICATION_EXTENSION_API_ONLY`) set to `Yes`.
8. On **both** targets, choose **Signing & Capabilities → + Capability → App
   Groups**, then add and select exactly:

   `group.com.mise.recipes`

   The App Group must also exist for both identifiers in the Apple Developer
   portal/provisioning profiles.
9. On the `App` target, add **Info → URL Types** with identifier
   `com.mise.recipes`, role `Editor`, and URL scheme exactly `mise`.
10. Verify the `App` target embeds `MiseShareExtension.appex` in an **Embed App
    Extensions** build phase with **Code Sign on Copy**.
11. Implement the host-side inbox consumer and route
    `mise://import?pending=1` to it. Also scan on every app foreground. Apple's
    supported iOS extension points for `NSExtensionContext.open` do not include
    Share Extensions, so this scaffold's public-API open request should be
    treated as best effort and will commonly return `false`.
12. Build, archive, and test in Xcode on supported devices with Safari URLs,
    selected plain text, still/animated images, mixed shares, oversized input,
    low storage, and a locked/unlocked device.

## P0 pending-import contract

The extension creates one transaction per share. Images are copied first and
`pending.json` is written last:

```text
<App Group container>/inbox/<identifier>/pending.json
<App Group container>/inbox/<identifier>/images/<random-name>.<extension>
```

`pending.json` is UTF-8 JSON. `createdAt` is ISO-8601 UTC (configure the host
`JSONDecoder` with `.iso8601`); image paths are relative to the transaction
directory.

```json
{
  "schema": "com.mise.recipes.pending-import",
  "version": 1,
  "identifier": "UUID",
  "sourceType": "url | text | image | mixed",
  "urls": ["https://example.com/recipe"],
  "text": ["shared text"],
  "imageFiles": [{
    "relativePath": "images/UUID.jpeg",
    "typeIdentifier": "public.jpeg",
    "mimeType": "image/jpeg",
    "byteCount": 12345,
    "pixelWidth": 1200,
    "pixelHeight": 800,
    "frameCount": 1
  }],
  "createdAt": "2026-08-13T06:22:00Z"
}
```

The host must treat this as untrusted input: decode only schema version `1`,
repeat every limit/path/type check, reject symlinks and paths escaping the
transaction, require the folder name and `identifier` to parse as the same UUID
(independent of letter case), make processing idempotent by `identifier`, and
delete the transaction after successful import. The model's custom decoder runs
its value validation, but the host must still check the referenced files
themselves. Ignore directories without
`pending.json`; garbage-collect stale incomplete directories conservatively.

## Supported input and limits

- `public.url`: up to 8 absolute `http`/`https` URLs, at most 4 KiB each.
  URLs are stored without fetching after outer whitespace is removed.
- `public.plain-text`: up to 4 items and 32 KiB UTF-8 total.
- `public.image`: up to 4 files, 8 MiB each and 20 MiB total. Each file is
  bounded while copying, then checked with ImageIO (maximum 12,000 px per
  dimension, 40 MP per frame, 50 frames, and 80 MP across frames).
- At most 12 item providers are considered. Mixed URL/text/image shares are
  supported. For one provider exposing several representations, precedence is
  image, then URL, then plain text.

Unsupported-only shares and invalid/oversized input produce a visible,
localized error. After saving, the extension requests
`mise://import?pending=1` through `NSExtensionContext.open`. If iOS denies that
request—as is expected for a Share Extension—the extension explains that the
payload was saved and asks the user to open Mise manually. It deliberately does
not use the unsupported `UIApplication` responder-chain workaround.

## Privacy and security boundary

- The extension never requests a shared URL, resolves redirects, parses a
  social page, accesses cookies, authenticates, or writes to the app database.
  Network fetch and social-content parsing belong only in the host app after
  explicit import handling.
- It uses only extension-safe public APIs. It does not access
  `UIApplication.shared` or walk the responder chain to bypass the Share
  Extension launch restriction.
- Shared URLs, text, image names, and image metadata are never logged. The deep
  link carries only `pending=1`, never shared content or a filesystem path.
- Images are copied byte-for-byte and can retain EXIF/location metadata. The
  extension never uploads them; the host must apply any metadata-stripping
  policy before network use.
- Item-provider image URLs are treated as temporary and, where applicable,
  security-scoped. Copying finishes inside the provider callback; access is
  released immediately.
- The only durable extension output is `pending.json` plus copied image files
  inside the App Group inbox. Files use iOS data protection and the inbox is
  excluded from backup.
- An App Group is a same-team process boundary, not end-to-end encryption or an
  authorization signal. The host must validate again, avoid following links,
  limit retention, and remove imported or rejected data.

The remaining integration boundary is deliberate: target membership, signing
entitlements, the host URL registration/router, inbox decoding/import UX,
cleanup, and Xcode/device validation all still belong to the generated
Capacitor iOS project and host application.
