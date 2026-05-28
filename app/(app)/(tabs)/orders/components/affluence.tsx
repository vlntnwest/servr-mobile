import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { useAffluence, PREP_LEVEL_LABELS } from "@/hooks/use-affluence";
import { PreparationLevel } from "@/types/api";

const LEVELS: PreparationLevel[] = ["EASY", "MEDIUM", "BUSY"];

const ACTIVE_STYLE: Record<PreparationLevel, { bg: string; text: string }> = {
  EASY: { bg: "bg-brand-forest/20", text: "text-brand-forest" },
  MEDIUM: { bg: "bg-brand-yellow/40", text: "text-brand-ink" },
  BUSY: { bg: "bg-brand-orange/20", text: "text-brand-orange" },
};

export default function Affluence() {
  const { level, setLevel, isOpen, setOpen } = useAffluence();

  return (
    <View className="mx-5 mb-2 gap-2">
      {/* Ouvert / Fermé toggle */}
      <View className="flex-row items-center justify-between bg-brand-sand rounded-xl px-4 py-3">
        <Text className="text-action font-sans-medium">
          {isOpen ? "Ouvert" : "Fermé"}
        </Text>
        <Switch checked={isOpen} onCheckedChange={setOpen} />
      </View>

      {/* Segmented prep-speed control — disabled when closed */}
      <View
        className={`flex-row bg-brand-sand rounded-xl p-1 ${!isOpen ? "opacity-40" : ""}`}
      >
        {LEVELS.map((l) => {
          const active = level === l;
          const { bg, text } = ACTIVE_STYLE[l];
          return (
            <Pressable
              key={l}
              onPress={() => {
                if (isOpen) setLevel(l);
              }}
              disabled={!isOpen}
              className={`flex-1 py-2 rounded-lg items-center ${active ? bg : ""}`}
            >
              <Text
                className={`text-action font-sans-medium ${active ? text : "text-brand-stone"}`}
              >
                {PREP_LEVEL_LABELS[l]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
