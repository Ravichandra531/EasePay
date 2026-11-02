import { createElement, type SVGProps } from "react";
import { iconNodes } from "./icon-nodes";
export type IconName = keyof typeof iconNodes;
export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {iconNodes[name].map(([tag, attrs]) => createElement(tag, { ...attrs }))}
    </svg>
  );
}
