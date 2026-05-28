import { useCallback, useState } from "react";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch, getRestaurantId } from "@/lib/api";
import { PreparationLevel, Restaurant } from "@/types/api";

export const PREP_LEVEL_LABELS: Record<PreparationLevel, string> = {
  EASY: "~15 min",
  MEDIUM: "~25 min",
  BUSY: "~40 min",
};

export function useAffluence() {
  const { selectedRestaurant, refresh } = useRestaurant();
  const [optimisticLevel, setOptimisticLevel] = useState<PreparationLevel | null>(null);
  const [optimisticIsOpen, setOptimisticIsOpen] = useState<boolean | null>(null);

  const level: PreparationLevel =
    optimisticLevel ?? selectedRestaurant?.preparationLevel ?? "EASY";

  const isOpen: boolean =
    optimisticIsOpen ?? selectedRestaurant?.isOpen ?? false;

  const setLevel = useCallback(
    async (newLevel: PreparationLevel) => {
      const previous = selectedRestaurant?.preparationLevel ?? null;
      setOptimisticLevel(newLevel);
      const result = await apiFetch<Restaurant>(
        `/restaurants/${getRestaurantId()}/preparation-level`,
        {
          method: "PATCH",
          body: JSON.stringify({ preparationLevel: newLevel }),
        },
      );
      if ("error" in result) {
        setOptimisticLevel(previous);
      } else {
        await refresh();
        setOptimisticLevel(null);
      }
    },
    [selectedRestaurant?.preparationLevel, refresh],
  );

  const setOpen = useCallback(
    async (next: boolean) => {
      const previous = selectedRestaurant?.isOpen ?? false;
      setOptimisticIsOpen(next);
      const result = await apiFetch(
        `/restaurants/${getRestaurantId()}/open-state`,
        {
          method: "PATCH",
          body: JSON.stringify({ isOpen: next }),
        },
      );
      if ("error" in result) {
        setOptimisticIsOpen(previous);
      } else {
        await refresh();
        setOptimisticIsOpen(null);
      }
    },
    [selectedRestaurant?.isOpen, refresh],
  );

  return { level, setLevel, isOpen, setOpen };
}
