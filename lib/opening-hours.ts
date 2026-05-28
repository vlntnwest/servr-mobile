import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { OpeningHour } from "@/types/api";

function getZonedParts(now: Date, timezone: string) {
  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const isoDow = parseInt(formatInTimeZone(now, timezone, "i"), 10);
  const dayOfWeek = isoDow === 7 ? 0 : isoDow;
  const currentTime = formatInTimeZone(now, timezone, "HH:mm");
  return { todayStr, dayOfWeek, currentTime };
}

export function getNextOpeningSlot(
  openingHours: OpeningHour[],
  timezone: string,
  now = new Date(),
): Date | null {
  if (!openingHours || openingHours.length === 0) return null;

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkInstant = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const { todayStr, dayOfWeek } = getZonedParts(checkInstant, timezone);

    const slots = openingHours
      .filter((h) => h.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.openTime.localeCompare(b.openTime));

    for (const slot of slots) {
      const slotDate = fromZonedTime(`${todayStr}T${slot.openTime}:00`, timezone);
      if (slotDate > now) return slotDate;
    }
  }

  return null;
}
