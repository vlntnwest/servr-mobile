import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Printer,
  PrinterConstants,
  usePrintersDiscovery,
} from "react-native-esc-pos-printer";
import {
  Order,
  OrderProduct,
  PrinterTypes,
  PrinterStatus,
  Restaurant,
  UsePrinterReturn,
} from "@/types/api";

const PrinterContext = createContext<UsePrinterReturn | null>(null);

// Largeur du rouleau en caractères (Font A) : 42 pour du 80mm, 32 pour du 58mm.
const LINE_WIDTH = 42;

const divider = "-".repeat(LINE_WIDTH) + "\n";

// Place un libellé à gauche et une valeur à droite sur la même ligne.
const row = (left: string, right: string) => {
  const space = Math.max(1, LINE_WIDTH - left.length - right.length);
  return left + " ".repeat(space) + right + "\n";
};

// Regroupe les produits par nom de catégorie (MAIN MENU, SIDE DISHES…).
const groupByCategory = (order: Order): [string, OrderProduct[]][] => {
  const groups = new Map<string, OrderProduct[]>();
  for (const op of order.orderProducts) {
    const name = op.product.productCategories?.[0]?.categorie?.name ?? "Autres";
    const key = name.toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(op);
  }
  return Array.from(groups.entries());
};

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const { start, isDiscovering, printers, printerError } =
    usePrintersDiscovery();
  const [status, setStatus] = useState<PrinterStatus>("idle");
  const [savedPrinter, setSavedPrinter] = useState<PrinterTypes | null>(null);

  const printerInstance = useMemo(
    () =>
      new Printer({
        target: savedPrinter?.target || "",
        deviceName: savedPrinter?.deviceName || "",
      }),
    [savedPrinter],
  );

  const storeData = async (key: string, value: PrinterTypes) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.log("Error storing data", e);
    }
  };

  const getData = async (key: string) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.log("Error getting data", e);
    }
  };

  const checkConnection = async (printer: PrinterTypes): Promise<boolean> => {
    try {
      const instance = new Printer({
        target: printer.target,
        deviceName: printer.deviceName,
      });
      await instance.connect(3000);
      const s = await instance.getStatus();
      await instance.disconnect();
      return s?.online?.statusCode === PrinterConstants.TRUE;
    } catch {
      return false;
    }
  };

  const scan = () => {
    start();
  };

  const connect = async (printer: PrinterTypes) => {
    try {
      setStatus("connecting");
      const instance = new Printer({
        target: printer.target,
        deviceName: printer.deviceName,
      });
      await instance.connect();
      await storeData("printer", printer);
      setSavedPrinter(printer);
      setStatus("connected");
      await instance.disconnect();
    } catch (error) {
      console.error("Error connecting to printer", error);
      setStatus("error");
    }
  };

  const disconnect = async () => {
    if (savedPrinter) {
      await AsyncStorage.removeItem("printer");
      setSavedPrinter(null);
      setStatus("idle");
    }
  };

  const printTest = async () => {
    if (!savedPrinter || status !== "connected") return;

    try {
      const res = await printerInstance.addQueueTask(async () => {
        await Printer.tryToConnectUntil(
          printerInstance,
          (status) => status.online.statusCode === PrinterConstants.TRUE,
        );

        await printerInstance.addText("Hello World");
        await printerInstance.addFeedLine(3);
        await printerInstance.addCut();

        const result = await printerInstance.sendData();
        await printerInstance.disconnect();
        return result;
      });
      if (res) {
        console.log(res);
      }
    } catch (error) {
      console.error("Error printing test", error);
      await printerInstance.disconnect();
      setStatus("error");
    }
  };

  const printOrder = async (order: Order, restaurant?: Restaurant | null) => {
    if (!savedPrinter || status !== "connected") return;

    try {
      await printerInstance.addQueueTask(async () => {
        await Printer.tryToConnectUntil(
          printerInstance,
          (s) => s.online.statusCode === PrinterConstants.TRUE,
        );

        // ── En-tête restaurant ─────────────────────────────
        await printerInstance.addTextAlign(PrinterConstants.ALIGN_CENTER);
        if (restaurant?.name) {
          await printerInstance.addTextStyle({ em: PrinterConstants.TRUE });
          await printerInstance.addTextSize(2, 2);
          await printerInstance.addText(`${restaurant.name}\n`);
          await printerInstance.addTextSize(1, 1);
          await printerInstance.addTextStyle({ em: PrinterConstants.FALSE });
          if (restaurant.address)
            await printerInstance.addText(
              `${restaurant.address}\n${restaurant.zipCode} ${restaurant.city}\n`,
            );
          if (restaurant.phone)
            await printerInstance.addText(`${restaurant.phone}\n`);
          await printerInstance.addFeedLine(1);
        }

        // ── Bandeau inversé (blanc sur noir) ───────────────
        await printerInstance.addTextStyle({ reverse: PrinterConstants.TRUE });
        await printerInstance.addTextSize(1, 2);
        await printerInstance.addText("   COMMANDE   \n");
        await printerInstance.addTextSize(1, 1);
        await printerInstance.addTextStyle({ reverse: PrinterConstants.FALSE });

        // ── Gros numéro de commande ────────────────────────
        await printerInstance.addTextSize(3, 3);
        await printerInstance.addText(
          `#${order.orderNumber ?? order.id.slice(0, 6)}\n`,
        );
        await printerInstance.addTextSize(1, 1);
        if (order.fullName)
          await printerInstance.addText(`${order.fullName}\n`);

        await printerInstance.addTextAlign(PrinterConstants.ALIGN_LEFT);
        await printerInstance.addText(divider);

        // ── Produits regroupés par catégorie ───────────────
        for (const [category, items] of groupByCategory(order)) {
          const count = items.reduce((n, it) => n + it.quantity, 0);
          await printerInstance.addTextStyle({ em: PrinterConstants.TRUE });
          await printerInstance.addText(`${category} (${count})\n`);
          await printerInstance.addTextStyle({ em: PrinterConstants.FALSE });

          for (const op of items) {
            const lineTotal = parseFloat(op.product.price) * op.quantity;
            await printerInstance.addText(
              row(`${op.quantity}x ${op.product.name}`, lineTotal.toFixed(2)),
            );
            for (const opt of op.orderProductOptions) {
              await printerInstance.addText(
                `   + ${opt.optionChoice.name}\n`,
              );
            }
          }
          await printerInstance.addFeedLine(1);
        }

        // ── Récapitulatif ──────────────────────────────────
        const itemCount = order.orderProducts.reduce(
          (n, op) => n + op.quantity,
          0,
        );
        await printerInstance.addText(divider);
        await printerInstance.addText(
          row("Nombre d'articles", String(itemCount)),
        );
        await printerInstance.addText(divider);

        await printerInstance.addTextSize(1, 2);
        await printerInstance.addText(
          row("TOTAL", `${parseFloat(order.totalPrice).toFixed(2)} EUR`),
        );
        await printerInstance.addTextSize(1, 1);

        await printerInstance.addFeedLine(1);
        await printerInstance.addText(
          `Soumis le ${new Date(order.createdAt).toLocaleString("fr-FR")}\n`,
        );

        // ── QR code de suivi ───────────────────────────────
        await printerInstance.addTextAlign(PrinterConstants.ALIGN_CENTER);
        await printerInstance.addFeedLine(1);
        await printerInstance.addSymbol({
          type: PrinterConstants.SYMBOL_QRCODE_MODEL_2,
          data: `https://servr.app/orders/${order.id}`,
          level: PrinterConstants.LEVEL_M,
          width: 5,
          height: 5,
          size: 0,
        });
        await printerInstance.addText("Merci !\n");

        await printerInstance.addFeedLine(3);
        await printerInstance.addCut();

        await printerInstance.sendData();
        await printerInstance.disconnect();
      });
    } catch (error) {
      console.error("Error printing order", error);
      await printerInstance.disconnect();
      setStatus("error");
    }
  };

  useEffect(() => {
    getData("printer").then(async (printer) => {
      if (printer) {
        setSavedPrinter(printer);
        setStatus("connecting");
        const online = await checkConnection(printer);
        setStatus(online ? "connected" : "error");
      }
    });
  }, []);

  return (
    <PrinterContext.Provider
      value={{
        scan,
        printers: printers || [],
        connect,
        disconnect,
        printTest,
        printOrder,
        isDiscovering,
        status,
        printerError,
        savedPrinter,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter(): UsePrinterReturn {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within a PrinterProvider");
  return ctx;
}
