import { create } from "zustand";

export type QuickAddType = "HOTEL" | "TRANSPORT" | "ACTIVITY";

export interface QuickAddCreatedItem {
  type: QuickAddType;
  id: string;
  name: string;
  cost_price: number;
  selling_price?: number;
  metadata?: any;
}

interface QuickAddState {
  isOpen: boolean;
  itemType: QuickAddType;
  targetDayIndex: number | null;
  targetItemIndex: number | null;
  initialName: string;
  destinationId?: string;

  // Actions
  openQuickAdd: (params: {
    type: QuickAddType;
    dayIndex: number;
    itemIndex: number;
    initialName?: string;
    destinationId?: string;
  }) => void;
  closeQuickAdd: () => void;
  onItemCreatedCallback: ((item: QuickAddCreatedItem) => void) | null;
  setOnItemCreatedCallback: (cb: ((item: QuickAddCreatedItem) => void) | null) => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  itemType: "HOTEL",
  targetDayIndex: null,
  targetItemIndex: null,
  initialName: "",
  destinationId: undefined,
  onItemCreatedCallback: null,

  openQuickAdd: ({ type, dayIndex, itemIndex, initialName = "", destinationId }) =>
    set({
      isOpen: true,
      itemType: type,
      targetDayIndex: dayIndex,
      targetItemIndex: itemIndex,
      initialName,
      destinationId,
    }),

  closeQuickAdd: () =>
    set({
      isOpen: false,
      targetDayIndex: null,
      targetItemIndex: null,
      initialName: "",
    }),

  setOnItemCreatedCallback: (cb) => set({ onItemCreatedCallback: cb }),
}));
