import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";
import { Row, IconBox } from "@/components/ui/printerRow";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";

const AUTO_PRINT_KEY = "autoValidate";

export default function General() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [autoPrint, setAutoPrint] = useState(false);

  const { selectedRestaurant, refresh } = useRestaurant();

  useEffect(() => {
    AsyncStorage.getItem(AUTO_PRINT_KEY).then((val) => {
      if (val !== null) setAutoPrint(val === "true");
    });
  }, []);

  const toggle = async (value: boolean) => {
    setAutoPrint(value);
    await AsyncStorage.setItem(AUTO_PRINT_KEY, String(value));
  };

  const toggleAutoOpen = async (value: boolean) => {
    if (!selectedRestaurant) return;
    await apiFetch(`/restaurants/${selectedRestaurant.id}/opening-settings`, {
      method: "PATCH",
      body: JSON.stringify({ autoOpen: value }),
    });
    await refresh();
  };

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-background"
      edges={isTablet ? ["top"] : []}
    >
      <View style={{ flex: 1 }}>
        <View className="pt-4 pb-1">
          <Text variant="h2">Général</Text>
        </View>

        <ScrollView style={{ flex: 1 }}>
          <View className="px-5">
            <Text variant="caption" className="mb-1.5 mt-5">
              Ouverture
            </Text>
            <View className="rounded-[30px] overflow-hidden">
              <Row
                label="Ouverture automatique"
                sub="Le restaurant ouvre et ferme selon les horaires configurés"
                left={
                  <IconBox bg={BRAND.forest}>
                    <IconSymbol name="clock.fill" size={15} color="white" />
                  </IconBox>
                }
                right={
                  <Switch
                    checked={selectedRestaurant?.autoOpen ?? false}
                    onCheckedChange={toggleAutoOpen}
                  />
                }
                showSeparator={false}
              />
            </View>

            <Text variant="caption" className="mb-1.5 mt-5">
              Impression
            </Text>
            <View className="rounded-[30px] overflow-hidden">
              <Row
                label="Validation automatique"
                sub="Accepte automatiquement les commandes lors des horaires d'ouvertures"
                left={
                  <IconBox bg={BRAND.orange}>
                    <IconSymbol name="printer.fill" size={15} color="white" />
                  </IconBox>
                }
                right={<Switch checked={autoPrint} onCheckedChange={toggle} />}
                showSeparator={false}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
