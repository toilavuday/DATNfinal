import { atom, selector } from "recoil";

export interface DashboardOrder {
  createdAt: Date | string;
  items: { productName: string; quantity: number }[];
  userId: string;
  amount?: number;
}

export const ordersState = atom<DashboardOrder[]>({
  key: "ordersState",
  default: [],
});

export const totalOrdersSelector = selector({
  key: "totalOrdersSelector",
  get: ({ get }) => {
    const orders = get(ordersState);
    return orders.length;
  },
});
