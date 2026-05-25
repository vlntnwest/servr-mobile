import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useRestaurant } from "@/context/restaurant";
import { useAutoOpenClose } from "./use-auto-open-close";
import { useScheduleOpeningNotification } from "./use-schedule-opening-notification";

export function useAppLifecycle() {
  const { refresh } = useRestaurant();
  const { check: checkOpenClose } = useAutoOpenClose();
  const { check: checkNotification } = useScheduleOpeningNotification();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const prevState = appState.current;
        appState.current = nextState;

        if (nextState === "active" && prevState !== "active") {
          await refresh();
          await checkOpenClose();
          await checkNotification();
        }
      },
    );

    return () => subscription.remove();
  }, [refresh, checkOpenClose, checkNotification]);
}
