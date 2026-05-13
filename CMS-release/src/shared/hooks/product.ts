"use client";
import { useCallback } from "react";
import { useSetRecoilState } from "recoil";
import { productState } from "../store/Atoms/product";
import { Product } from "../types/product";
import axios from "axios";

export const useGetProduct = () => {
  const setProducts = useSetRecoilState(productState);

  const getProduct = useCallback(async (): Promise<Product[]> => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/product`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Lỗi khi lấy sản phẩm:", error.message);
        console.error("Chi tiết lỗi từ server:", error.response);
      } else {
        console.error("Lỗi không mong đợi:", error);
      }
      return [];
    }
  }, []);

  return { setProducts, getProduct };
};

export const useAddProduct = () => {
  const setProducts = useSetRecoilState(productState);

  const addProduct = async (newProduct: Product) => {
    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("price", String(newProduct.price));
    formData.append("description", newProduct.description);
    formData.append("brand", newProduct.brand);
    formData.append("category", newProduct.category || "Cà phê");
    if (newProduct.recipe) {
      formData.append("recipe", JSON.stringify(newProduct.recipe));
    }
    if (newProduct.image) {
      formData.append("image", newProduct.image);
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/product`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setProducts((prevProducts) => [...prevProducts, response.data]);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Lỗi khi thêm sản phẩm:", error.message);
        console.error("Chi tiết lỗi:", error.response);
      } else {
        console.error("Lỗi không mong đợi:", error);
      }
    }
  };

  return { addProduct };
};

export const useUpdateProduct = () => {
  const setProducts = useSetRecoilState(productState);

  const updateProduct = async (updatedProduct: Product) => {
    const formData = new FormData();
    formData.append("name", updatedProduct.name);
    formData.append("price", String(updatedProduct.price));
    formData.append("description", updatedProduct.description);
    formData.append("brand", updatedProduct.brand);
    if (updatedProduct.category) {
      formData.append("category", updatedProduct.category);
    }
    if (updatedProduct.recipe) {
      formData.append("recipe", JSON.stringify(updatedProduct.recipe));
    }
    if (updatedProduct.image instanceof File) {
      formData.append("image", updatedProduct.image);
    }

    try {
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/product/${updatedProduct.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === updatedProduct.id ? response.data : product
        )
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật sản phẩm:", error);
    }
  };

  return { updateProduct };
};

export const useDeleteProduct = () => {
  const setProducts = useSetRecoilState(productState);

  const deleteProduct = async (id: string) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/product/${id}`);
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product.id !== id)
      );
    } catch (error) {
      console.error("Lỗi khi xoá sản phẩm:", error);
    }
  };

  return { deleteProduct };
};
