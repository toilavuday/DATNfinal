import React, { useState, useEffect } from "react";
import { Button } from "antd";
import Image from "next/image";
import { Product } from "@/shared/types/product";

interface UpdateProductModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  updateProduct: (product: Product) => void;
}

const UpdateProductModal: React.FC<UpdateProductModalProps> = ({
  visible,
  onClose,
  product,
  updateProduct,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    description: "",
  });
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price,
        description: product.description,
      });
      setImage(typeof product.image === "string" ? product.image : null);
    }
  }, [product]);

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

  const handleSave = () => {
    if (product) {
      const updatedProduct = {
        ...product,
        ...formData,
        image: image || product.image,
      };
      updateProduct(updatedProduct);
      onClose();
    }
  };

  return visible ? (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Update Product</h2>
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
          <input
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex space-x-4">
          <Button color="primary" onClick={handleSave}>
            Save
          </Button>
          <Button color="danger" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  ) : null;
};

export default UpdateProductModal;
