import type { OpeningHour, ExceptionalHour } from "@/types/api";

function getTimeParts(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const { type, value } of parts) map[type] = value;

  const WEEKDAY: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    todayStr: `${map.year}-${map.month}-${map.day}`,
    dayOfWeek: WEEKDAY[map.weekday],
    currentTime: `${map.hour}:${map.minute}`,
  };
}

export function isWithinHours(
  openingHours: OpeningHour[],
  exceptionalHours: ExceptionalHour[],
  timezone: string,
  now = new Date(),
): boolean {
  if (!openingHours || openingHours.length === 0) return true;

  const { todayStr, dayOfWeek, currentTime } = getTimeParts(timezone, now);

  const exceptional = exceptionalHours.find(
    (eh) => eh.date.slice(0, 10) === todayStr,
  );

  if (exceptional) {
    if (exceptional.isClosed) return false;
    if (exceptional.openTime && exceptional.closeTime) {
      return currentTime >= exceptional.openTime && currentTime < exceptional.closeTime;
    }
  }

  const todayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (todayRanges.length === 0) return false;
  return todayRanges.some((h) => currentTime >= h.openTime && currentTime < h.closeTime);
}

export function getNextOpeningSlot(
  openingHours: OpeningHour[],
  timezone: string,
  now = new Date(),
): Date | null {
  if (!openingHours || openingHours.length === 0) return null;

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const { todayStr, dayOfWeek, currentTime } = getTimeParts(timezone, checkDate);

    const slots = openingHours
      .filter((h) => h.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.openTime.localeCompare(b.openTime));

    for (const slot of slots) {
      if (daysAhead === 0 && slot.openTime <= currentTime) continue;

      const [openHour, openMinute] = slot.openTime.split(":").map(Number);
      const approx = new Date(`${todayStr}T${slot.openTime}:00Z`);
      const { currentTime: approxLocal } = getTimeParts(timezone, approx);
      const [ah, am] = approxLocal.split(":").map(Number);
      const offsetMs = ((openHour - ah) * 60 + (openMinute - am)) * 60_000;
      const slotDate = new Date(approx.getTime() - offsetMs);

      if (slotDate > now) return slotDate;
    }
  }

  return null;
}
