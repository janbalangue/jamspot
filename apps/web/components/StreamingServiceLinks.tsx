import Image from "next/image";

type ProviderLinkState = {
  url: string | null;
  isLoading: boolean;
};

type StreamingServiceLinksProps = {
  artistName: string;
  spotify: ProviderLinkState;
  appleMusic: ProviderLinkState;
};

const APPLE_MUSIC_BADGE_URL =
  "https://marketing.services.apple/api/storage/images/6408fd8630506600073b0d7e/en-us-large%401x.png";

export default function StreamingServiceLinks({
  artistName,
  spotify,
  appleMusic,
}: StreamingServiceLinksProps) {
  return (
    <div className="flex items-center gap-3">
      <AppleMusicLink artistName={artistName} {...appleMusic} />
      <SpotifyLink artistName={artistName} {...spotify} />
    </div>
  );
}

function AppleMusicLink({
  artistName,
  url,
  isLoading,
}: ProviderLinkState & { artistName: string }) {
  if (isLoading) {
    return <StreamingLinkSkeleton label="Apple Music" widthClass="w-[118px]" />;
  }

  if (!url) {
    return <UnavailableStreamingLink label="Apple Music" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Listen to ${artistName} on Apple Music (opens in a new tab)`}
      className="inline-flex h-12 items-center rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {/* Apple requires use of its unmodified, hosted badge artwork. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={APPLE_MUSIC_BADGE_URL}
        alt="Listen on Apple Music"
        className="h-10 w-auto max-w-none"
      />
    </a>
  );
}

function SpotifyLink({
  artistName,
  url,
  isLoading,
}: ProviderLinkState & { artistName: string }) {
  if (isLoading) {
    return <StreamingLinkSkeleton label="Spotify" widthClass="w-[166px]" />;
  }

  if (!url) {
    return <UnavailableStreamingLink label="Spotify" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Listen to ${artistName} on Spotify (opens in a new tab)`}
      className="inline-flex justify-center gap-2 h-12 items-center rounded-full bg-black pl-3 pr-7 text-sm font-semibold text-white outline-none transition-shadow hover:ring-1 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <span className="h-8 w-8 overflow-hidden rounded-full flex items-center justify-center">
        <Image
          src="/streaming/spotify-icon.svg"
          alt=""
          aria-hidden="true"
          width={44}
          height={44}
          className="h-11 w-11 shrink-0"
        />
      </span>

      <span>Listen on Spotify</span>
    </a>
  );
}

function StreamingLinkSkeleton({
  label,
  widthClass,
}: {
  label: string;
  widthClass: string;
}) {
  return (
    <span
      role="status"
      className={`inline-flex h-12 animate-pulse items-center rounded-lg border border-border bg-muted ${widthClass}`}
    >
      <span className="sr-only">Loading {label} link</span>
    </span>
  );
}

function UnavailableStreamingLink({ label }: { label: string }) {
  return (
    <span
      role="status"
      className="inline-flex h-12 items-center rounded-lg border border-border bg-muted px-4 text-xs text-muted-foreground opacity-70"
    >
      {label} unavailable
    </span>
  );
}
