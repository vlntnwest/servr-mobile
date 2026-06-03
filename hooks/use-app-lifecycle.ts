import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useRestaurant } from "@/context/restaurant";
import { useOpeningPrompt } from "./use-opening-prompt";
import { useScheduleOpeningNotification } from "./use-schedule-opening-notification";

export function useAppLifecycle() {
  const { refresh } = useRestaurant();
  const { check: checkOpeningPrompt } = useOpeningPrompt();
  const { check: checkNotification } = useScheduleOpeningNotification();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    checkOpeningPrompt();
    checkNotification();
  }, [checkOpeningPrompt, checkNotification]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const prevState = appState.current;
        appState.current = nextState;

        if (nextState === "active" && prevState !== "active") {
          await refresh();
          await checkOpeningPrompt();
          await checkNotification();
        }
      },
    );

    return () => subscription.remove();
  }, [refresh, checkOpeningPrompt, checkNotification]);
}
