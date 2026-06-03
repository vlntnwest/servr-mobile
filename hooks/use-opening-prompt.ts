import { useCallback } from "react";
import { Alert } from "react-native";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";
import { getNextOpeningSlot } from "@/lib/opening-hours";
import type { OpeningHour } from "@/types/api";

const THIRTY_MIN_MS = 30 * 60 * 1000;

export function useOpeningPrompt() {
  const { selectedRestaurant, refresh } = useRestaurant();

  const check = useCallback(async () => {
    if (!selectedRestaurant) return;
    // autoOpen: no modal, the cron opens. Already open or already confirmed -> nothing.
    if (selectedRestaurant.autoOpen || selectedRestaurant.isOpen || selectedRestaurant.isReady) return;

    const result = await apiFetch<OpeningHour[]>(
      `/restaurants/${selectedRestaurant.id}/opening-hours`,
    );
    if ("error" in result) return;

    const next = getNextOpeningSlot(result.data, selectedRestaurant.timezone);
    if (!next) return;
    const msUntil = next.getTime() - Date.now();
    // window [openTime - 30min, openTime)
    if (msUntil > THIRTY_MIN_MS || msUntil < 0) return;
    const minsUntil = Math.round(msUntil / 60000);

    Alert.alert(
      `Prêt à ouvrir dans ${minsUntil} min ?`,
      "Le restaurant ouvrira automatiquement à l'heure si vous confirmez.",
      [
        { text: "Je n'ouvre pas", style: "cancel" },
        {
          text: "Je suis prêt",
          onPress: async () => {
            await apiFetch(`/restaurants/${selectedRestaurant.id}/opening-settings`, {
              method: "PATCH",
              body: JSON.stringify({ isReady: true }),
            });
            await refresh();
          },
        },
      ],
    );
  }, [selectedRestaurant, refresh]);

  return { check };
}
