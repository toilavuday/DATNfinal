import { Product } from "@/shared/types/product";
import { atom } from "recoil";

export const productState = atom<Product[]>({
  key: "productState",
  default: [],
});

// State lưu trữ giỏ hàng
export const cartState = atom<Product[]>({
  key: "cartState",
  default: [],
});

// State lưu trữ từ khóa tìm kiếm
export const searchTermState = atom<string>({
  key: "searchTermState",
  default: "",
});

// State lưu trữ thương hiệu được chọn
export const selectedBrandState = atom<string>({
  key: "selectedBrandState",
  default: "",
});

// State lưu trữ bàn đã chọn
export const selectedTableState = atom<string>({
  key: "selectedTableState",
  default: "",
});
