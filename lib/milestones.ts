export type Stats = { visits: number; signups: number; paying_customers: number; in_hold: number; payable_now: number; paid_to_date: number };
export type Milestone = { id: string; label: string; achieved: boolean };

export const earnedTotal = (s: Stats) => s.in_hold + s.payable_now + s.paid_to_date;

// Non-monetary achievements that keep affiliates motivated. Cost nothing and change no rates.
export function milestones(s: Stats): Milestone[] {
  const earned = earnedTotal(s);
  return [
    { id: "first-click", label: "First link visit", achieved: s.visits >= 1 },
    { id: "first-signup", label: "First signup", achieved: s.signups >= 1 },
    { id: "first-paying", label: "First paying customer", achieved: s.paying_customers >= 1 },
    { id: "paying-5", label: "5 paying customers", achieved: s.paying_customers >= 5 },
    { id: "paying-10", label: "10 paying customers", achieved: s.paying_customers >= 10 },
    { id: "earned-100", label: "$100 earned", achieved: earned >= 100 },
    { id: "earned-500", label: "$500 earned", achieved: earned >= 500 },
    { id: "earned-1000", label: "$1,000 earned", achieved: earned >= 1000 },
  ];
}

// The next goal to chase, with progress from 0 to 1.
export function nextGoal(s: Stats): { label: string; progress: number; remaining: string } | null {
  const earned = earnedTotal(s);
  const steps: Array<{ label: string; value: number; target: number; fmt: (n: number) => string }> = [
    { label: "First link visit", value: s.visits, target: 1, fmt: (n) => `${n} more visit` },
    { label: "First signup", value: s.signups, target: 1, fmt: (n) => `${n} more signup` },
    { label: "First paying customer", value: s.paying_customers, target: 1, fmt: (n) => `${n} more customer` },
    { label: "5 paying customers", value: s.paying_customers, target: 5, fmt: (n) => `${n} more customers` },
    { label: "10 paying customers", value: s.paying_customers, target: 10, fmt: (n) => `${n} more customers` },
    { label: "$100 earned", value: earned, target: 100, fmt: (n) => `$${n.toFixed(0)} to go` },
    { label: "$500 earned", value: earned, target: 500, fmt: (n) => `$${n.toFixed(0)} to go` },
    { label: "$1,000 earned", value: earned, target: 1000, fmt: (n) => `$${n.toFixed(0)} to go` },
  ];
  const next = steps.find((x) => x.value < x.target);
  if (!next) return null;
  return { label: next.label, progress: Math.min(1, next.value / next.target), remaining: next.fmt(next.target - next.value) };
}
