import { useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";
import { getNextOpeningSlot } from "@/lib/opening-hours";
import type { OpeningHour } from "@/types/api";

const NOTIFICATION_ID = "opening-reminder";
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function useScheduleOpeningNotification() {
  const { selectedRestaurant } = useRestaurant();

  const check = useCallback(async () => {
    if (!selectedRestaurant) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const result = await apiFetch<OpeningHour[]>(
      `/restaurants/${selectedRestaurant.id}/opening-hours`,
    );
    if ("error" in result) return;

    const openingHours = result.data;
    const nextSlot = getNextOpeningSlot(openingHours, selectedRestaurant.timezone);

    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});

    if (!nextSlot) return;

    const targetTime = new Date(nextSlot.getTime() - THIRTY_MINUTES_MS);
    if (targetTime <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: "Ouverture dans 30 min",
        body: "Ouvrez l'app pour activer le restaurant",
        data: { type: "opening-reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetTime,
      },
    });
  }, [selectedRestaurant]);

  return { check };
}
