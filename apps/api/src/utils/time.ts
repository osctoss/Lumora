export function formatIso(date: Date = new Date()): string {
  return date.toISOString();
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function diffSeconds(dateA: Date, dateB: Date): number {
  return Math.floor((dateA.getTime() - dateB.getTime()) / 1000);
}
