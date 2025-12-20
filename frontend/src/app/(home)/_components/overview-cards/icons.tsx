import type { SVGProps } from "react";

type SVGPropsType = SVGProps<SVGSVGElement>;

// Total Cases Icon - File/Document icon
export function TotalCases(props: SVGPropsType) {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none" {...props}>
      <circle cx={29} cy={29} r={29} fill="#3FD97F" />
      <path
        d="M20 18h18a2 2 0 012 2v18a2 2 0 01-2 2H20a2 2 0 01-2-2V20a2 2 0 012-2z"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M24 24h10M24 28h10M24 32h6"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Total Case Owners Icon - Users/People icon
export function CaseOwners(props: SVGPropsType) {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none" {...props}>
      <circle cx={29} cy={29} r={29} fill="#FF9C55" />
      <circle
        cx={22}
        cy={22}
        r="4"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx={36}
        cy={22}
        r="4"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M15 36c0-3.314 3.134-6 7-6s7 2.686 7 6M29 36c0-3.314 3.134-6 7-6s7 2.686 7 6"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Total Solved Cases Icon - Checkmark/Check circle icon
export function SolvedCases(props: SVGPropsType) {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none" {...props}>
      <circle cx={29} cy={29} r={29} fill="#8155FF" />
      <circle
        cx={29}
        cy={29}
        r="12"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M23 29l4 4 8-8"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Total Pending Cases Icon - Clock/Hourglass icon
export function PendingCases(props: SVGPropsType) {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none" {...props}>
      <circle cx={29} cy={29} r={29} fill="#18BFFF" />
      <circle
        cx={29}
        cy={29}
        r="12"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M29 21v8l6 4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Keep old exports for backward compatibility (if needed elsewhere)
export const Views = TotalCases;
export const Profit = CaseOwners;
export const Product = SolvedCases;
export const Users = PendingCases;
