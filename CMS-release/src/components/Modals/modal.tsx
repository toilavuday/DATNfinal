import React, { useState, useEffect } from "react";
import { Button, message } from "antd";
import Image from "next/image";
import { Product } from "@/shared/types/product";

interface ProductModalProps {
  currentProduct: Product | null;
  closeModal: () => void;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (updatedProduct: Product) => void;
  products: Product[];
}

const ProductModal: React.FC<ProductModalProps> = ({
  currentProduct,
  closeModal,
  addProduct,
  updateProduct,
  products,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    description: "",
  });

  useEffect(() => {
    if (currentProduct) {
      setFormData({
        name: currentProduct.name,
        price: currentProduct.price,
        description: currentProduct.description,
      });
      setImage(
        typeof currentProduct.image === "string" ? currentProduct.image : null,
      );
    }
  }, [currentProduct]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (currentProduct) {
      // Update existing product
      updateProduct({
        ...currentProduct,
        ...formData,
        image: image || currentProduct.image,
      });
    } else {
      // Add new product
      const newProduct: Product = {
        id: `${products.length + 1}`,
        ...formData,
        image: image || "",
        brand: "",
      };
      await addProduct(newProduct);
    }
    message.success("Lưu sản phẩm thành công.");
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">
          {currentProduct ? "Edit Product" : "Add Product"}
        </h2>
        {image && (
          <div className="mb-4 flex justify-center">
            <Image
              src={image}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-md border-4 border-gray-300"
              width={128}
              height={128}
              unoptimized
            />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex space-x-4">
          <Button color="primary" variant="solid" onClick={handleSave}>
            Save
          </Button>
          <Button color="danger" variant="outlined" onClick={closeModal}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
