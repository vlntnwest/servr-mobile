import { useCallback } from "react";
import { Alert } from "react-native";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";
import { isWithinHours } from "@/lib/opening-hours";
import type { OpeningHour, ExceptionalHour } from "@/types/api";

export function useAutoOpenClose() {
  const { selectedRestaurant, refresh } = useRestaurant();

  const check = useCallback(async () => {
    if (!selectedRestaurant) return;

    const [hoursResult, exceptionalResult] = await Promise.all([
      apiFetch<OpeningHour[]>(
        `/restaurants/${selectedRestaurant.id}/opening-hours`,
      ),
      apiFetch<ExceptionalHour[]>(
        `/restaurants/${selectedRestaurant.id}/exceptional-hours`,
      ),
    ]);

    if ("error" in hoursResult) return;
    if ("error" in exceptionalResult) return;

    const openingHours = hoursResult.data;
    const exceptionalHours = exceptionalResult.data;

    const inHours = isWithinHours(
      openingHours,
      exceptionalHours,
      selectedRestaurant.timezone,
    );

    if (inHours && selectedRestaurant.preparationLevel === "CLOSED") {
      Alert.alert(
        "Ouvrir le restaurant ?",
        "Le restaurant est actuellement fermé. Voulez-vous l'ouvrir ?",
        [
          { text: "Non", style: "cancel" },
          {
            text: "Oui",
            onPress: async () => {
              await apiFetch(
                `/restaurants/${selectedRestaurant.id}/preparation-level`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ preparationLevel: "EASY" }),
                },
              );
              await refresh();
            },
          },
        ],
      );
      return;
    }

    if (!inHours && selectedRestaurant.preparationLevel !== "CLOSED") {
      await apiFetch(
        `/restaurants/${selectedRestaurant.id}/preparation-level`,
        {
          method: "PATCH",
          body: JSON.stringify({ preparationLevel: "CLOSED" }),
        },
      );
      await refresh();
    }
  }, [selectedRestaurant, refresh]);

  return { check };
}
