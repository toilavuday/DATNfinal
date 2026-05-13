// hooks/order.ts
import { useCallback, useState } from "react";
import axios from "axios";
import { useRecoilState, useRecoilValue } from "recoil";
import { authState } from "../store/Atoms/auth";
import { ordersState } from "../store/Atoms/order";

export const useGetAllOrder = () => {
  const [orders, setOrders] = useRecoilState(ordersState);

  const getAllOrders = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/order`
      );
      setOrders(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      return [];
    }
  }, [setOrders]);

  return { orders, setOrders, getAllOrders };
};

export const useGetOrder = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const auth = useRecoilValue(authState);
  const id = auth?.user?.id;

  const getOrders = useCallback(async () => {
    if (!id) {
      setOrders([]);
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/order/user/${id}`
      );
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [id]);

  return { orders, getOrders };
};
