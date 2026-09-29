import type { SVGProps } from "react";

/** The LinkedIn glyph used by the prototype (rounded square, not the brand mark). */
export function LinkedInGlyph(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 15, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 11v6M8 7.5v.01M12 17v-6M12 13.5a2.5 2.5 0 0 1 5 0V17" />
    </svg>
  );
}
