export function getGradeBadgeStyle(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (grade.startsWith("B")) return "bg-sky-500/20 text-sky-400 border-sky-500/40";
  if (grade.startsWith("C")) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-rose-500/20 text-rose-400 border-rose-500/40";
}
