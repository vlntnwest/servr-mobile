import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import {
  OtpInput as OtpEntry,
  type OtpInputRef,
} from "react-native-otp-entry";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

/**
 * Champ OTP basé sur `react-native-otp-entry` (pur JS, gère collage + clavier
 * numérique nativement). Conserve une interface contrôlée simple
 * (value / onChange / onComplete) pour l'écran de réinitialisation.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  autoFocus,
  editable = true,
}: OtpInputProps) {
  const ref = useRef<OtpInputRef>(null);

  // Reset externe (ex. code invalide) : quand le parent remet value à "", on vide.
  useEffect(() => {
    if (value === "") ref.current?.clear();
  }, [value]);

  return (
    <OtpEntry
      ref={ref}
      numberOfDigits={length}
      type="numeric"
      autoFocus={autoFocus}
      disabled={!editable}
      blurOnFilled
      focusColor="#1A1A1A"
      onTextChange={onChange}
      onFilled={onComplete}
      theme={{
        pinCodeContainerStyle: {
          backgroundColor: "#FFFFFF",
          borderColor: "#DDD5C4",
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 12,
          height: 56,
        },
        focusedPinCodeContainerStyle: {
          borderColor: "#1A1A1A",
          borderWidth: 1.5,
        },
        pinCodeTextStyle: {
          fontSize: 22,
          color: "#1A1A1A",
        },
      }}
    />
  );
}
