import { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";

function remainingSeconds(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function Countdown({
  expiresAt,
  className,
}: {
  expiresAt: string | null;
  className?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(() => remainingSeconds(expiresAt));

  useEffect(() => {
    setRemaining(remainingSeconds(expiresAt));
    const id = setInterval(() => setRemaining(remainingSeconds(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return null;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Text variant="muted" className={className}>
      {remaining <= 0 ? "Expirée" : `${mm}:${ss}`}
    </Text>
  );
}
