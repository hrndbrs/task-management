import type { PresenceMember } from "@/lib/presence";

const COLORS = [
  "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100",
  "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

export function AvatarStack({
  members,
  label,
  max = 4,
  className = "",
}: {
  members: PresenceMember[];
  label: string;
  max?: number;
  className?: string;
}) {
  const shown = members.slice(0, max);
  const hidden = members.length - shown.length;

  return (
    <ul aria-label={label} className={`flex -space-x-1.5 ${className}`}>
      {shown.map((member) => (
        <li
          key={member.id}
          title={member.name}
          className={`flex size-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white dark:ring-zinc-900 ${COLORS[member.id % COLORS.length]}`}
        >
          <span aria-hidden>{initials(member.name)}</span>
          <span className="sr-only">{member.name}</span>
        </li>
      ))}
      {hidden > 0 && (
        <li
          title={members.slice(max).map((m) => m.name).join(", ")}
          className="flex size-7 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-700 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-900"
        >
          <span aria-hidden>+{hidden}</span>
          <span className="sr-only">and {hidden} more</span>
        </li>
      )}
    </ul>
  );
}
