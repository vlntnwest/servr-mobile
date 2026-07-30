import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AuthContextType = {
  session: Session | null;
  initialized: boolean;
  // Pendant une réinitialisation de mot de passe, verifyOtp ouvre une session
  // mais on ne veut PAS router l'utilisateur dans l'app tant qu'il n'a pas
  // choisi son nouveau mot de passe. Ce flag suspend le garde-fou du layout.
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  initialized: false,
  recovering: false,
  setRecovering: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      supabase.realtime.setAuth(session?.access_token ?? null);
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
        setInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, initialized, recovering, setRecovering }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
