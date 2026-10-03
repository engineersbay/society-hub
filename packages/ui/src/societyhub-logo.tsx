import { useId, type SVGProps } from "react";

type SocietyHubLogoProps = {
  size?: number;
  title?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children">;

/**
 * SocietyHub mark — stacked society blocks + community courtyard on brand gradient.
 * Replaces the temporary "SH" letter badge in app chrome and auth screens.
 */
export function SocietyHubLogo({
  size = 40,
  title = "SocietyHub",
  className,
  ...rest
}: SocietyHubLogoProps) {
  const uid = useId().replaceAll(":", "");
  const grad = `sh-logo-grad-${uid}`;
  const sheen = `sh-logo-sheen-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
      {...rest}
    >
      <defs>
        <linearGradient id={grad} x1="6" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F2A65A" />
          <stop offset="45%" stopColor="#E87722" />
          <stop offset="100%" stopColor="#8B1E3F" />
        </linearGradient>
        <linearGradient id={sheen} x1="10" y1="4" x2="38" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="15" fill={`url(#${grad})`} />
      <rect width="64" height="64" rx="15" fill={`url(#${sheen})`} />

      {/* Stacked residential blocks */}
      <rect x="24" y="14" width="16" height="11" rx="2.5" fill="#fff" />
      <rect x="17" y="26" width="14.5" height="11" rx="2.5" fill="#fff" />
      <rect x="32.5" y="26" width="14.5" height="11" rx="2.5" fill="#fff" />
      <rect x="15" y="38" width="16" height="12" rx="2.5" fill="#fff" />
      <rect x="33" y="38" width="16" height="12" rx="2.5" fill="#fff" />

      {/* Soft seam between wings */}
      <rect x="31.2" y="27.5" width="1.6" height="21" rx="0.8" fill={`url(#${grad})`} opacity="0.35" />

      {/* Community courtyard diamond */}
      <path
        fill="#fff"
        d="M32 42.2 37.2 47.4 32 52.6 26.8 47.4 32 42.2Z"
      />
      {/* Inner hub — four-point courtyard opening */}
      <path
        fill={`url(#${grad})`}
        d="M32 44.6c.55 1.35 1.7 2.5 3.05 3.05-1.35.55-2.5 1.7-3.05 3.05-.55-1.35-1.7-2.5-3.05-3.05 1.35-.55 2.5-1.7 3.05-3.05Z"
      />
    </svg>
  );
}
