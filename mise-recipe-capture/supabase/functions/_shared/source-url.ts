import { HttpError } from "./http.ts";

export type RemotePlatform =
  | "youtube"
  | "bilibili"
  | "tiktok"
  | "xiaohongshu"
  | "douyin";

interface HostRule {
  readonly platform: RemotePlatform;
  readonly canonicalHost: string;
  readonly shortLink: boolean;
  readonly validPath: (url: URL) => boolean;
}

const contentId = "[A-Za-z0-9_-]+";
const youtubePath = (url: URL): boolean =>
  (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) ||
  new RegExp(`^/(shorts|live)/${contentId}/?$`).test(url.pathname);
const bilibiliPath = (url: URL): boolean =>
  /^\/video\/(BV[A-Za-z0-9]+|av[0-9]+)\/?$/.test(url.pathname);
const tiktokPath = (url: URL): boolean =>
  /^\/@[^/]+\/(video|photo)\/[0-9]+\/?$/.test(url.pathname);
const xiaohongshuPath = (url: URL): boolean =>
  new RegExp(`^/(explore|discovery/item)/${contentId}/?$`).test(url.pathname);
const douyinPath = (url: URL): boolean =>
  /^\/video\/[0-9]+\/?$/.test(url.pathname);
const shortPath = (url: URL): boolean =>
  new RegExp(`^/${contentId}/?$`).test(url.pathname);

const HOSTS: Readonly<Record<string, HostRule>> = {
  "youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: youtubePath,
  },
  "www.youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: youtubePath,
  },
  "m.youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: youtubePath,
  },
  "youtu.be": {
    platform: "youtube",
    canonicalHost: "youtu.be",
    shortLink: true,
    validPath: shortPath,
  },
  "bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: bilibiliPath,
  },
  "www.bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: bilibiliPath,
  },
  "m.bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: bilibiliPath,
  },
  "b23.tv": {
    platform: "bilibili",
    canonicalHost: "b23.tv",
    shortLink: true,
    validPath: shortPath,
  },
  "tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: tiktokPath,
  },
  "www.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: tiktokPath,
  },
  "m.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: tiktokPath,
  },
  "vm.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "vm.tiktok.com",
    shortLink: true,
    validPath: shortPath,
  },
  "vt.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "vt.tiktok.com",
    shortLink: true,
    validPath: shortPath,
  },
  "xiaohongshu.com": {
    platform: "xiaohongshu",
    canonicalHost: "xiaohongshu.com",
    shortLink: false,
    validPath: xiaohongshuPath,
  },
  "www.xiaohongshu.com": {
    platform: "xiaohongshu",
    canonicalHost: "xiaohongshu.com",
    shortLink: false,
    validPath: xiaohongshuPath,
  },
  "xhslink.com": {
    platform: "xiaohongshu",
    canonicalHost: "xhslink.com",
    shortLink: true,
    validPath: shortPath,
  },
  "douyin.com": {
    platform: "douyin",
    canonicalHost: "douyin.com",
    shortLink: false,
    validPath: douyinPath,
  },
  "www.douyin.com": {
    platform: "douyin",
    canonicalHost: "douyin.com",
    shortLink: false,
    validPath: douyinPath,
  },
  "v.douyin.com": {
    platform: "douyin",
    canonicalHost: "v.douyin.com",
    shortLink: true,
    validPath: shortPath,
  },
};

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "share_app_id",
  "share_item_id",
  "share_link_id",
  "share_source",
  "share_token",
  "source",
  "spm_id_from",
  "timestamp",
  "tt_from",
  "u_code",
  "si",
]);

export interface NormalizedSourceUrl {
  readonly originalUrl: string;
  readonly canonicalUrl: string;
  readonly platform: RemotePlatform;
  readonly requiresRedirectResolution: boolean;
}

/**
 * This is a syntactic allowlist only. No network request is made here.
 * The worker must resolve short links and all redirects itself, re-check every
 * destination host, resolve DNS, and reject private/reserved IP ranges before
 * opening a socket. Never forward user headers or cookies across redirects.
 */
export function normalizeSourceUrl(input: string): NormalizedSourceUrl {
  const originalUrl = input.trim();
  if (originalUrl.length === 0 || originalUrl.length > 2_048) {
    throw new HttpError(400, "UNSUPPORTED_URL", "URL length is invalid");
  }
  if (originalUrl.includes("\\")) {
    throw new HttpError(
      400,
      "UNSUPPORTED_URL",
      "Backslashes are not allowed in source URLs",
    );
  }

  let url: URL;
  try {
    url = new URL(originalUrl);
  } catch {
    throw new HttpError(400, "UNSUPPORTED_URL", "URL is malformed");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError(
      400,
      "UNSUPPORTED_URL",
      "Only HTTP(S) source URLs are supported",
    );
  }
  if (url.username || url.password || url.port) {
    throw new HttpError(
      400,
      "UNSUPPORTED_URL",
      "URL credentials and explicit ports are not allowed",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const rule = HOSTS[hostname];
  if (!rule) {
    throw new HttpError(
      400,
      "UNSUPPORTED_URL",
      "Source host is not supported",
    );
  }
  if (!rule.validPath(url)) {
    throw new HttpError(
      400,
      "UNSUPPORTED_URL",
      "URL is not a supported public post URL",
    );
  }

  for (const key of [...url.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith("utm_") ||
      TRACKING_PARAMETERS.has(normalizedKey)
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  url.protocol = "https:";
  url.hostname = rule.canonicalHost;
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return {
    originalUrl,
    canonicalUrl: url.toString(),
    platform: rule.platform,
    requiresRedirectResolution: rule.shortLink,
  };
}
