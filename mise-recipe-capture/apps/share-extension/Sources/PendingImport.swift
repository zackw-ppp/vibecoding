import Foundation
import UniformTypeIdentifiers

enum PendingImportLimits {
    static let maximumAttachmentCount = 12

    static let maximumURLCount = 8
    static let maximumURLBytes = 4 * 1_024

    static let maximumTextItemCount = 4
    static let maximumTextBytes = 32 * 1_024

    static let maximumImageCount = 4
    static let maximumImageBytes = 8 * 1_024 * 1_024
    static let maximumTotalImageBytes = 20 * 1_024 * 1_024
    static let maximumImageDimension = 12_000
    static let maximumImagePixelCount = 40_000_000
    static let maximumImageFrameCount = 50
    static let maximumDecodedPixelCount = 80_000_000

    static let maximumPayloadBytes = 128 * 1_024
}

struct PendingImport: Codable, Sendable {
    static let schemaIdentifier = "com.mise.recipes.pending-import"
    static let currentVersion = 1

    enum SourceType: String, Codable, Sendable {
        case url
        case text
        case image
        case mixed
    }

    struct ImageFileReference: Codable, Sendable {
        let relativePath: String
        let typeIdentifier: String
        let mimeType: String?
        let byteCount: Int
        let pixelWidth: Int
        let pixelHeight: Int
        let frameCount: Int
    }

    let schema: String
    let version: Int
    let identifier: UUID
    let sourceType: SourceType
    let urls: [String]
    let text: [String]
    let imageFiles: [ImageFileReference]
    let createdAt: Date

    private enum CodingKeys: String, CodingKey {
        case schema
        case version
        case identifier
        case sourceType
        case urls
        case text
        case imageFiles
        case createdAt
    }

    init(
        identifier: UUID = UUID(),
        urls: [String],
        text: [String],
        imageFiles: [ImageFileReference],
        createdAt: Date = Date()
    ) throws {
        self.schema = Self.schemaIdentifier
        self.version = Self.currentVersion
        self.identifier = identifier
        self.sourceType = try Self.deriveSourceType(
            hasURLs: !urls.isEmpty,
            hasText: !text.isEmpty,
            hasImages: !imageFiles.isEmpty
        )
        self.urls = urls
        self.text = text
        self.imageFiles = imageFiles
        self.createdAt = createdAt

        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        schema = try container.decode(String.self, forKey: .schema)
        version = try container.decode(Int.self, forKey: .version)
        identifier = try container.decode(UUID.self, forKey: .identifier)
        sourceType = try container.decode(SourceType.self, forKey: .sourceType)
        urls = try container.decode([String].self, forKey: .urls)
        text = try container.decode([String].self, forKey: .text)
        imageFiles = try container.decode(
            [ImageFileReference].self,
            forKey: .imageFiles
        )
        createdAt = try container.decode(Date.self, forKey: .createdAt)

        try validate()
    }

    func validate(now: Date = Date()) throws {
        guard schema == Self.schemaIdentifier else {
            throw PendingImportValidationError.invalidSchema
        }
        guard version == Self.currentVersion else {
            throw PendingImportValidationError.unsupportedVersion
        }
        guard createdAt <= now.addingTimeInterval(5 * 60) else {
            throw PendingImportValidationError.invalidTimestamp
        }

        let expectedSourceType = try Self.deriveSourceType(
            hasURLs: !urls.isEmpty,
            hasText: !text.isEmpty,
            hasImages: !imageFiles.isEmpty
        )
        guard sourceType == expectedSourceType else {
            throw PendingImportValidationError.invalidSourceType
        }

        guard urls.count <= PendingImportLimits.maximumURLCount else {
            throw PendingImportValidationError.tooManyURLs
        }
        for value in urls {
            guard !value.isEmpty,
                  value.utf8.count <= PendingImportLimits.maximumURLBytes,
                  !value.unicodeScalars.contains(where: {
                      CharacterSet.controlCharacters.contains($0)
                  }),
                  let components = URLComponents(string: value),
                  let scheme = components.scheme?.lowercased(),
                  scheme == "http" || scheme == "https",
                  components.host?.isEmpty == false
            else {
                throw PendingImportValidationError.invalidURL
            }
        }

        guard text.count <= PendingImportLimits.maximumTextItemCount else {
            throw PendingImportValidationError.tooManyTextItems
        }
        var totalTextBytes = 0
        for value in text {
            guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw PendingImportValidationError.invalidText
            }
            totalTextBytes += value.utf8.count
            guard totalTextBytes <= PendingImportLimits.maximumTextBytes else {
                throw PendingImportValidationError.textTooLarge
            }
        }

        guard imageFiles.count <= PendingImportLimits.maximumImageCount else {
            throw PendingImportValidationError.tooManyImages
        }
        var totalImageBytes = 0
        for image in imageFiles {
            let pathParts = image.relativePath.split(
                separator: "/",
                omittingEmptySubsequences: false
            )
            let fileName = pathParts.count == 2 ? String(pathParts[1]) : ""
            let fileNameParts = fileName.split(
                separator: ".",
                maxSplits: 1,
                omittingEmptySubsequences: false
            )
            guard pathParts.count == 2,
                  pathParts[0] == "images",
                  !fileName.isEmpty,
                  !image.relativePath.contains("\\"),
                  (1...2).contains(fileNameParts.count),
                  UUID(uuidString: String(fileNameParts[0])) != nil
            else {
                throw PendingImportValidationError.invalidImagePath
            }
            if fileNameParts.count == 2 {
                let fileExtension = fileNameParts[1]
                guard (1...10).contains(fileExtension.count),
                      fileExtension.unicodeScalars.allSatisfy({
                          CharacterSet.alphanumerics.contains($0)
                      })
                else {
                    throw PendingImportValidationError.invalidImagePath
                }
            }

            guard image.typeIdentifier.utf8.count <= 128,
                  !image.typeIdentifier.contains("\n"),
                  !image.typeIdentifier.contains("\r"),
                  let contentType = UTType(image.typeIdentifier),
                  contentType.conforms(to: .image)
            else {
                throw PendingImportValidationError.invalidImageType
            }
            guard image.mimeType == contentType.preferredMIMEType else {
                throw PendingImportValidationError.invalidImageType
            }

            guard image.byteCount > 0,
                  image.byteCount <= PendingImportLimits.maximumImageBytes
            else {
                throw PendingImportValidationError.imageTooLarge
            }
            totalImageBytes += image.byteCount
            guard totalImageBytes <= PendingImportLimits.maximumTotalImageBytes else {
                throw PendingImportValidationError.imagesTooLarge
            }

            guard image.pixelWidth > 0,
                  image.pixelHeight > 0,
                  image.pixelWidth <= PendingImportLimits.maximumImageDimension,
                  image.pixelHeight <= PendingImportLimits.maximumImageDimension,
                  image.frameCount > 0,
                  image.frameCount <= PendingImportLimits.maximumImageFrameCount
            else {
                throw PendingImportValidationError.invalidImageDimensions
            }

            let (pixelCount, pixelOverflow) = image.pixelWidth.multipliedReportingOverflow(
                by: image.pixelHeight
            )
            guard !pixelOverflow,
                  pixelCount <= PendingImportLimits.maximumImagePixelCount
            else {
                throw PendingImportValidationError.invalidImageDimensions
            }

            let (decodedPixelCount, decodedPixelOverflow) = pixelCount.multipliedReportingOverflow(
                by: image.frameCount
            )
            guard !decodedPixelOverflow,
                  decodedPixelCount <= PendingImportLimits.maximumDecodedPixelCount
            else {
                throw PendingImportValidationError.invalidImageDimensions
            }
        }
    }

    private static func deriveSourceType(
        hasURLs: Bool,
        hasText: Bool,
        hasImages: Bool
    ) throws -> SourceType {
        let populatedTypeCount = [hasURLs, hasText, hasImages].filter { $0 }.count
        guard populatedTypeCount > 0 else {
            throw PendingImportValidationError.emptyPayload
        }
        guard populatedTypeCount == 1 else {
            return .mixed
        }

        if hasURLs {
            return .url
        }
        if hasText {
            return .text
        }
        return .image
    }
}

enum PendingImportValidationError: Error, Sendable {
    case emptyPayload
    case invalidSchema
    case unsupportedVersion
    case invalidTimestamp
    case invalidSourceType
    case tooManyURLs
    case invalidURL
    case tooManyTextItems
    case invalidText
    case textTooLarge
    case tooManyImages
    case invalidImagePath
    case invalidImageType
    case imageTooLarge
    case imagesTooLarge
    case invalidImageDimensions
}
