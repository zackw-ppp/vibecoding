import Foundation
import ImageIO
import UIKit
import UniformTypeIdentifiers

@MainActor
final class ShareViewController: UIViewController {
    private static let appGroupIdentifier = "group.com.mise.recipes"
    private static let hostLaunchURL = URL(string: "mise://import?pending=1")!

    private let statusLabel = UILabel()
    private let activityIndicator = UIActivityIndicatorView(style: .medium)
    private var hasStarted = false

    override func viewDidLoad() {
        super.viewDidLoad()
        configureView()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        guard !hasStarted else {
            return
        }
        hasStarted = true

        Task { [weak self] in
            await self?.savePendingImport()
        }
    }

    private func configureView() {
        view.backgroundColor = .systemBackground
        preferredContentSize = CGSize(width: 320, height: 180)

        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.font = .preferredFont(forTextStyle: .body)
        statusLabel.numberOfLines = 0
        statusLabel.text = L10n.string(
            "share.status.saving",
            fallback: "Saving to Mise…"
        )
        statusLabel.textAlignment = .center

        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.startAnimating()

        let stack = UIStackView(arrangedSubviews: [activityIndicator, statusLabel])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.layoutMarginsGuide.leadingAnchor),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.layoutMarginsGuide.trailingAnchor),
        ])
    }

    private func savePendingImport() async {
        do {
            let providers = try classifiedProviders()
            try await persistPendingImport(from: providers)
            requestHostApplicationOpen()
        } catch let error as ShareImportError {
            presentError(error)
        } catch {
            presentError(.couldNotSave)
        }
    }

    private func classifiedProviders() throws -> ClassifiedProviders {
        guard let extensionContext else {
            throw ShareImportError.missingExtensionContext
        }

        let extensionItems = extensionContext.inputItems.compactMap { $0 as? NSExtensionItem }
        let allProviders = extensionItems.flatMap { $0.attachments ?? [] }

        guard allProviders.count <= PendingImportLimits.maximumAttachmentCount else {
            throw ShareImportError.tooManyAttachments
        }

        var result = ClassifiedProviders()
        for provider in allProviders {
            // Prefer the image representation over file-URL or text representations
            // exposed by the same provider, and prefer URL over its text fallback.
            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                result.images.append(provider)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                result.urls.append(provider)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                result.text.append(provider)
            }
        }

        guard !result.isEmpty else {
            throw ShareImportError.noSupportedContent
        }
        guard result.urls.count <= PendingImportLimits.maximumURLCount else {
            throw ShareImportError.tooManyURLs
        }
        guard result.text.count <= PendingImportLimits.maximumTextItemCount else {
            throw ShareImportError.tooManyTextItems
        }
        guard result.images.count <= PendingImportLimits.maximumImageCount else {
            throw ShareImportError.tooManyImages
        }

        return result
    }

    private func persistPendingImport(from providers: ClassifiedProviders) async throws {
        guard let groupContainer = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
        ) else {
            throw ShareImportError.appGroupUnavailable
        }

        let identifier = UUID()
        let inboxURL = groupContainer.appendingPathComponent("inbox", isDirectory: true)
        let transactionURL = inboxURL.appendingPathComponent(
            identifier.uuidString.lowercased(),
            isDirectory: true
        )
        let imagesURL = transactionURL.appendingPathComponent("images", isDirectory: true)

        do {
            try createProtectedDirectory(at: inboxURL)
            try createProtectedDirectory(at: transactionURL)
            if !providers.images.isEmpty {
                try createProtectedDirectory(at: imagesURL)
            }

            var urls: [String] = []
            for provider in providers.urls {
                urls.append(try await loadURL(from: provider))
            }

            var text: [String] = []
            var totalTextBytes = 0
            for provider in providers.text {
                let value = try await loadText(from: provider)
                totalTextBytes += value.utf8.count
                guard totalTextBytes <= PendingImportLimits.maximumTextBytes else {
                    throw ShareImportError.textTooLarge
                }
                text.append(value)
            }

            var imageFiles: [PendingImport.ImageFileReference] = []
            var totalImageBytes = 0
            for provider in providers.images {
                let image = try await loadAndCopyImage(
                    from: provider,
                    to: imagesURL
                )
                totalImageBytes += image.byteCount
                guard totalImageBytes <= PendingImportLimits.maximumTotalImageBytes else {
                    throw ShareImportError.imagesTooLarge
                }
                imageFiles.append(image)
            }

            let pendingImport: PendingImport
            do {
                pendingImport = try PendingImport(
                    identifier: identifier,
                    urls: urls,
                    text: text,
                    imageFiles: imageFiles
                )
            } catch {
                throw ShareImportError.invalidContent
            }

            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.sortedKeys]
            let payloadData = try encoder.encode(pendingImport)
            guard payloadData.count <= PendingImportLimits.maximumPayloadBytes else {
                throw ShareImportError.invalidContent
            }

            // The payload is written last. The host must ignore transaction folders
            // that do not contain a complete pending.json file.
            let payloadURL = transactionURL.appendingPathComponent(
                "pending.json",
                isDirectory: false
            )
            try payloadData.write(
                to: payloadURL,
                options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
            )
        } catch let error as ShareImportError {
            try? FileManager.default.removeItem(at: transactionURL)
            throw error
        } catch {
            try? FileManager.default.removeItem(at: transactionURL)
            throw ShareImportError.couldNotSave
        }
    }

    private func createProtectedDirectory(at url: URL) throws {
        try FileManager.default.createDirectory(
            at: url,
            withIntermediateDirectories: true,
            attributes: [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication,
            ]
        )

        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        var mutableURL = url
        try mutableURL.setResourceValues(resourceValues)
    }

    private func loadURL(from provider: NSItemProvider) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            provider.loadItem(
                forTypeIdentifier: UTType.url.identifier,
                options: nil
            ) { item, error in
                guard error == nil else {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                    return
                }

                let value: String?
                if let url = item as? URL {
                    value = url.absoluteString
                } else if let url = item as? NSURL {
                    value = (url as URL).absoluteString
                } else if let string = item as? String {
                    value = string
                } else if let string = item as? NSString {
                    value = string as String
                } else {
                    value = nil
                }

                guard let rawValue = value else {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                    return
                }

                let trimmedValue = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmedValue.isEmpty,
                      trimmedValue.utf8.count <= PendingImportLimits.maximumURLBytes,
                      let components = URLComponents(string: trimmedValue),
                      let scheme = components.scheme?.lowercased(),
                      scheme == "http" || scheme == "https",
                      components.host?.isEmpty == false
                else {
                    continuation.resume(throwing: ShareImportError.invalidURL)
                    return
                }

                continuation.resume(returning: trimmedValue)
            }
        }
    }

    private func loadText(from provider: NSItemProvider) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            provider.loadItem(
                forTypeIdentifier: UTType.plainText.identifier,
                options: nil
            ) { item, error in
                guard error == nil else {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                    return
                }

                let value: String?
                if let string = item as? String {
                    value = string
                } else if let string = item as? NSString {
                    value = string as String
                } else if let data = item as? Data {
                    guard data.count <= PendingImportLimits.maximumTextBytes else {
                        continuation.resume(throwing: ShareImportError.textTooLarge)
                        return
                    }
                    value = String(data: data, encoding: .utf8)
                } else {
                    value = nil
                }

                guard let text = value,
                      !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                else {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                    return
                }
                guard text.utf8.count <= PendingImportLimits.maximumTextBytes else {
                    continuation.resume(throwing: ShareImportError.textTooLarge)
                    return
                }

                continuation.resume(returning: text)
            }
        }
    }

    private func loadAndCopyImage(
        from provider: NSItemProvider,
        to destinationDirectory: URL
    ) async throws -> PendingImport.ImageFileReference {
        try await withCheckedThrowingContinuation { continuation in
            provider.loadFileRepresentation(
                forTypeIdentifier: UTType.image.identifier
            ) { temporaryURL, error in
                guard error == nil, let temporaryURL else {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                    return
                }

                // The item-provider URL may stop being valid as soon as this callback
                // returns, so all access and copying happens synchronously here.
                do {
                    let image = try Self.copyImage(
                        from: temporaryURL,
                        to: destinationDirectory
                    )
                    continuation.resume(returning: image)
                } catch let error as ShareImportError {
                    continuation.resume(throwing: error)
                } catch {
                    continuation.resume(throwing: ShareImportError.couldNotReadItem)
                }
            }
        }
    }

    nonisolated private static func copyImage(
        from sourceURL: URL,
        to destinationDirectory: URL
    ) throws -> PendingImport.ImageFileReference {
        let accessedSecurityScopedResource = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if accessedSecurityScopedResource {
                sourceURL.stopAccessingSecurityScopedResource()
            }
        }

        let sourceValues = try sourceURL.resourceValues(
            forKeys: [.fileSizeKey, .isRegularFileKey, .isSymbolicLinkKey]
        )
        guard sourceValues.isRegularFile == true,
              sourceValues.isSymbolicLink != true
        else {
            throw ShareImportError.invalidImage
        }
        if let fileSize = sourceValues.fileSize,
           fileSize > PendingImportLimits.maximumImageBytes {
            throw ShareImportError.imageTooLarge
        }

        let temporaryDestination = destinationDirectory.appendingPathComponent(
            ".incoming-\(UUID().uuidString.lowercased())",
            isDirectory: false
        )
        var finalDestination: URL?
        var completed = false
        defer {
            try? FileManager.default.removeItem(at: temporaryDestination)
            if !completed, let finalDestination {
                try? FileManager.default.removeItem(at: finalDestination)
            }
        }

        let byteCount = try copyFileBounded(
            from: sourceURL,
            to: temporaryDestination,
            maximumBytes: PendingImportLimits.maximumImageBytes
        )
        let metadata = try inspectImage(at: temporaryDestination)

        let fileExtension = safeFilenameExtension(
            UTType(metadata.typeIdentifier)?.preferredFilenameExtension
        )
        let baseName = UUID().uuidString.lowercased()
        let fileName = fileExtension.map { "\(baseName).\($0)" } ?? baseName
        let destination = destinationDirectory.appendingPathComponent(
            fileName,
            isDirectory: false
        )
        finalDestination = destination

        do {
            try FileManager.default.moveItem(
                at: temporaryDestination,
                to: destination
            )
            try FileManager.default.setAttributes(
                [
                    .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication,
                ],
                ofItemAtPath: destination.path
            )
        } catch {
            throw ShareImportError.couldNotSave
        }

        completed = true
        return PendingImport.ImageFileReference(
            relativePath: "images/\(fileName)",
            typeIdentifier: metadata.typeIdentifier,
            mimeType: UTType(metadata.typeIdentifier)?.preferredMIMEType,
            byteCount: byteCount,
            pixelWidth: metadata.pixelWidth,
            pixelHeight: metadata.pixelHeight,
            frameCount: metadata.frameCount
        )
    }

    nonisolated private static func copyFileBounded(
        from sourceURL: URL,
        to destinationURL: URL,
        maximumBytes: Int
    ) throws -> Int {
        guard FileManager.default.createFile(
            atPath: destinationURL.path,
            contents: nil
        ) else {
            throw ShareImportError.couldNotSave
        }

        let input: FileHandle
        do {
            input = try FileHandle(forReadingFrom: sourceURL)
        } catch {
            throw ShareImportError.couldNotReadItem
        }
        defer {
            try? input.close()
        }

        let output: FileHandle
        do {
            output = try FileHandle(forWritingTo: destinationURL)
        } catch {
            throw ShareImportError.couldNotSave
        }
        defer {
            try? output.close()
        }

        var byteCount = 0
        while true {
            let chunk: Data
            do {
                guard let nextChunk = try input.read(upToCount: 64 * 1_024),
                      !nextChunk.isEmpty
                else {
                    break
                }
                chunk = nextChunk
            } catch {
                throw ShareImportError.couldNotReadItem
            }

            byteCount += chunk.count
            guard byteCount <= maximumBytes else {
                throw ShareImportError.imageTooLarge
            }
            do {
                try output.write(contentsOf: chunk)
            } catch {
                throw ShareImportError.couldNotSave
            }
        }

        do {
            try output.synchronize()
        } catch {
            throw ShareImportError.couldNotSave
        }

        guard byteCount > 0 else {
            throw ShareImportError.invalidImage
        }
        return byteCount
    }

    nonisolated private static func inspectImage(at url: URL) throws -> ImageMetadata {
        let options = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithURL(url as CFURL, options),
              let imageType = CGImageSourceGetType(source)
        else {
            throw ShareImportError.invalidImage
        }

        let typeIdentifier = imageType as String
        guard let contentType = UTType(typeIdentifier),
              contentType.conforms(to: .image)
        else {
            throw ShareImportError.invalidImage
        }

        let frameCount = CGImageSourceGetCount(source)
        guard frameCount > 0,
              frameCount <= PendingImportLimits.maximumImageFrameCount
        else {
            throw ShareImportError.invalidImage
        }

        var maximumPixelWidth = 0
        var maximumPixelHeight = 0
        var decodedPixelCount = 0
        for frameIndex in 0..<frameCount {
            guard let properties = CGImageSourceCopyPropertiesAtIndex(
                source,
                frameIndex,
                options
            ) as? [CFString: Any],
                  let pixelWidth = (
                      properties[kCGImagePropertyPixelWidth] as? NSNumber
                  )?.intValue,
                  let pixelHeight = (
                      properties[kCGImagePropertyPixelHeight] as? NSNumber
                  )?.intValue,
                  pixelWidth > 0,
                  pixelHeight > 0,
                  pixelWidth <= PendingImportLimits.maximumImageDimension,
                  pixelHeight <= PendingImportLimits.maximumImageDimension
            else {
                throw ShareImportError.invalidImage
            }

            let (pixelCount, pixelOverflow) = pixelWidth.multipliedReportingOverflow(
                by: pixelHeight
            )
            guard !pixelOverflow,
                  pixelCount <= PendingImportLimits.maximumImagePixelCount
            else {
                throw ShareImportError.invalidImage
            }

            let (newDecodedPixelCount, decodedPixelOverflow) =
                decodedPixelCount.addingReportingOverflow(pixelCount)
            guard !decodedPixelOverflow,
                  newDecodedPixelCount <= PendingImportLimits.maximumDecodedPixelCount
            else {
                throw ShareImportError.invalidImage
            }

            maximumPixelWidth = max(maximumPixelWidth, pixelWidth)
            maximumPixelHeight = max(maximumPixelHeight, pixelHeight)
            decodedPixelCount = newDecodedPixelCount
        }

        return ImageMetadata(
            typeIdentifier: typeIdentifier,
            pixelWidth: maximumPixelWidth,
            pixelHeight: maximumPixelHeight,
            frameCount: frameCount
        )
    }

    nonisolated private static func safeFilenameExtension(_ value: String?) -> String? {
        guard let value else {
            return nil
        }

        let normalized = value.lowercased()
        guard (1...10).contains(normalized.count),
              normalized.unicodeScalars.allSatisfy({
                  CharacterSet.alphanumerics.contains($0)
              })
        else {
            return nil
        }
        return normalized
    }

    private func requestHostApplicationOpen() {
        guard let extensionContext else {
            presentError(.missingExtensionContext)
            return
        }

        extensionContext.open(Self.hostLaunchURL) { [weak self] didOpen in
            DispatchQueue.main.async {
                guard let self else {
                    return
                }

                if didOpen {
                    extensionContext.completeRequest(
                        returningItems: nil,
                        completionHandler: nil
                    )
                } else {
                    self.presentSavedForLater()
                }
            }
        }
    }

    private func presentSavedForLater() {
        activityIndicator.stopAnimating()
        statusLabel.text = L10n.string(
            "share.saved.open_manually",
            fallback: "Saved. Open Mise to finish importing."
        )

        let alert = UIAlertController(
            title: L10n.string(
                "share.saved.title",
                fallback: "Saved to Mise"
            ),
            message: L10n.string(
                "share.saved.open_manually",
                fallback: "Saved. Open Mise to finish importing."
            ),
            preferredStyle: .alert
        )
        alert.addAction(
            UIAlertAction(
                title: L10n.string("share.action.done", fallback: "Done"),
                style: .default
            ) { [weak self] _ in
                self?.extensionContext?.completeRequest(
                    returningItems: nil,
                    completionHandler: nil
                )
            }
        )
        present(alert, animated: true)
    }

    private func presentError(_ error: ShareImportError) {
        activityIndicator.stopAnimating()
        statusLabel.text = error.userMessage

        let alert = UIAlertController(
            title: L10n.string(
                "share.error.title",
                fallback: "Couldn’t Save to Mise"
            ),
            message: error.userMessage,
            preferredStyle: .alert
        )
        alert.addAction(
            UIAlertAction(
                title: L10n.string("share.action.close", fallback: "Close"),
                style: .cancel
            ) { [weak self] _ in
                guard let self else {
                    return
                }

                let safeError = NSError(
                    domain: "com.mise.recipes.share-extension",
                    code: error.errorCode,
                    userInfo: [NSLocalizedDescriptionKey: error.userMessage]
                )
                self.extensionContext?.cancelRequest(withError: safeError)
            }
        )
        present(alert, animated: true)
    }
}

private struct ClassifiedProviders {
    var urls: [NSItemProvider] = []
    var text: [NSItemProvider] = []
    var images: [NSItemProvider] = []

    var isEmpty: Bool {
        urls.isEmpty && text.isEmpty && images.isEmpty
    }
}

private struct ImageMetadata {
    let typeIdentifier: String
    let pixelWidth: Int
    let pixelHeight: Int
    let frameCount: Int
}

private enum ShareImportError: Error, Sendable {
    case missingExtensionContext
    case noSupportedContent
    case tooManyAttachments
    case tooManyURLs
    case invalidURL
    case tooManyTextItems
    case textTooLarge
    case tooManyImages
    case imageTooLarge
    case imagesTooLarge
    case invalidImage
    case appGroupUnavailable
    case couldNotReadItem
    case invalidContent
    case couldNotSave

    var errorCode: Int {
        switch self {
        case .missingExtensionContext: return 1
        case .noSupportedContent: return 2
        case .tooManyAttachments: return 3
        case .tooManyURLs: return 4
        case .invalidURL: return 5
        case .tooManyTextItems: return 6
        case .textTooLarge: return 7
        case .tooManyImages: return 8
        case .imageTooLarge: return 9
        case .imagesTooLarge: return 10
        case .invalidImage: return 11
        case .appGroupUnavailable: return 12
        case .couldNotReadItem: return 13
        case .invalidContent: return 14
        case .couldNotSave: return 15
        }
    }

    var userMessage: String {
        switch self {
        case .missingExtensionContext, .couldNotReadItem:
            return L10n.string(
                "share.error.read",
                fallback: "The shared item couldn’t be read. Try sharing it again."
            )
        case .noSupportedContent:
            return L10n.string(
                "share.error.no_content",
                fallback: "Share a web URL, plain text, or an image."
            )
        case .tooManyAttachments:
            return L10n.format(
                "share.error.too_many_attachments",
                fallback: "Share no more than %d items at once.",
                PendingImportLimits.maximumAttachmentCount
            )
        case .tooManyURLs:
            return L10n.format(
                "share.error.too_many_urls",
                fallback: "Share no more than %d web URLs at once.",
                PendingImportLimits.maximumURLCount
            )
        case .invalidURL:
            return L10n.string(
                "share.error.invalid_url",
                fallback: "Only valid http or https web URLs are supported."
            )
        case .tooManyTextItems:
            return L10n.format(
                "share.error.too_many_text_items",
                fallback: "Share no more than %d text items at once.",
                PendingImportLimits.maximumTextItemCount
            )
        case .textTooLarge:
            return L10n.string(
                "share.error.text_too_large",
                fallback: "The shared text is too large."
            )
        case .tooManyImages:
            return L10n.format(
                "share.error.too_many_images",
                fallback: "Share no more than %d images at once.",
                PendingImportLimits.maximumImageCount
            )
        case .imageTooLarge:
            return L10n.format(
                "share.error.image_too_large",
                fallback: "Each image must be smaller than %d MB.",
                PendingImportLimits.maximumImageBytes / 1_024 / 1_024
            )
        case .imagesTooLarge:
            return L10n.format(
                "share.error.images_too_large",
                fallback: "The selected images must total no more than %d MB.",
                PendingImportLimits.maximumTotalImageBytes / 1_024 / 1_024
            )
        case .invalidImage:
            return L10n.string(
                "share.error.invalid_image",
                fallback: "One of the shared images is invalid or too large to process safely."
            )
        case .appGroupUnavailable:
            return L10n.string(
                "share.error.app_group",
                fallback: "Mise sharing isn’t configured on this installation."
            )
        case .invalidContent:
            return L10n.string(
                "share.error.invalid_content",
                fallback: "The shared content couldn’t be saved safely."
            )
        case .couldNotSave:
            return L10n.string(
                "share.error.save",
                fallback: "Mise couldn’t save the shared item. Check available storage and try again."
            )
        }
    }
}

private enum L10n {
    static func string(_ key: String, fallback: String) -> String {
        NSLocalizedString(
            key,
            tableName: nil,
            bundle: .main,
            value: fallback,
            comment: ""
        )
    }

    static func format(_ key: String, fallback: String, _ value: Int) -> String {
        String(format: string(key, fallback: fallback), value)
    }
}
