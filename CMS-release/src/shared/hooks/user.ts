import { useCallback } from "react";
import axios from "axios";
import { enqueueSnackbar } from "notistack";
import { useSetRecoilState } from "recoil";
import { Employees } from "@/shared/types/user";
import { usersState } from "../store/Atoms/user";
import { authState } from "../store/Atoms/auth";

export const useGetMe = () => {
  const setAuth = useSetRecoilState(authState);

  const getMeData = useCallback(async (): Promise<Employees | null> => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Khong co token trong localStorage");
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const userData = response.data;
      setAuth((prev) => ({
        ...prev,
        isLoggedIn: true,
        accessToken: token,
        user: userData,
      }));
      return userData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Loi khi lay thong tin nguoi dung:", error.message);
        console.error("Chi tiet loi tu server:", error.response?.data);
      } else {
        console.error("Loi khong mong doi:", error);
      }
      return null;
    }
  }, [setAuth]);

  return { getMeData };
};

export const useGetUser = () => {
  const setUsers = useSetRecoilState(usersState);

  const fetchUsers = useCallback(async (): Promise<Employees[]> => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/user`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Loi khi lay nguoi dung:", error.message);
        console.error("Chi tiet loi tu server:", error.response);
      } else {
        console.error("Loi khong mong doi:", error);
      }

      return [];
    }
  }, []);

  return { fetchUsers, setUsers };
};

export const useGetById = () => {
  const setUsers = useSetRecoilState(usersState);

  const getUserById = useCallback(
    async (id: string): Promise<Employees> => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${id}`,
        );

        const user: Employees = response.data;
        setUsers((prevUsers) => [...prevUsers, user]);
        return user;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Error fetching user:", error.message);
          console.error("Response:", error.response);
        } else {
          console.error("Unexpected error:", error);
        }

        throw error;
      }
    },
    [setUsers],
  );

  return { getUserById };
};

export const useAddUser = () => {
  const setUsers = useSetRecoilState(usersState);

  const addUser = async (newUser: Employees) => {
    const formData = new FormData();

    formData.append("name", newUser.name);
    formData.append("email", newUser.email);

    if (newUser.password) {
      formData.append("password", newUser.password);
    }

    if (newUser.image) {
      formData.append("image", newUser.image);
    }

    if (newUser.role) {
      formData.append("role", newUser.role);
    }

    if (newUser.hourlyRate !== undefined && newUser.hourlyRate !== null) {
      formData.append("hourlyRate", String(newUser.hourlyRate));
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setUsers((prevUsers) => [...prevUsers, response.data]);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          throw new Error("Email da ton tai");
        }
        console.error("Error adding user:", error.message);
      } else {
        console.error("Unexpected error:", error);
      }
      throw error;
    }
  };

  return { addUser };
};

export const useUpdateUser = () => {
  const setUsers = useSetRecoilState(usersState);

  const updateUser = async (updateUser: Employees) => {
    const formData = new FormData();

    if (updateUser.name) formData.append("name", updateUser.name);
    if (updateUser.email) formData.append("email", updateUser.email);
    if (updateUser.bankCode !== undefined && updateUser.bankCode !== null) {
      formData.append("bankCode", String(updateUser.bankCode));
    }
    if (updateUser.bank) formData.append("bank", updateUser.bank);
    if (updateUser.role) formData.append("role", updateUser.role);
    if (updateUser.hourlyRate !== undefined && updateUser.hourlyRate !== null) {
      formData.append("hourlyRate", String(updateUser.hourlyRate));
    }
    if (updateUser.image) {
      formData.append("image", updateUser.image);
    }

    try {
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/${updateUser.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === updateUser.id ? response.data : user,
        ),
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Cap nhat tai khoan that bai";
        enqueueSnackbar(errorMessage, {
          variant: "error",
          autoHideDuration: 1500,
        });
      } else {
        console.error("Unexpected error:", error);
      }
      throw error;
    }
  };

  return { updateUser };
};

export const useDelete = () => {
  const setUsers = useSetRecoilState(usersState);

  const deleteUser = async (id: string) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/user/${id}`);

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
      enqueueSnackbar("Xoa tai khoan thanh cong", {
        variant: "success",
        autoHideDuration: 1500,
      });
    } catch (error: any) {
      const errorMessage =
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : "Xay ra loi khi xoa tai khoan";
      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 1500,
      });

      throw error;
    }
  };

  return { deleteUser };
};

export const useLockUser = () => {
  const setUsers = useSetRecoilState(usersState);

  const lockUser = async (id: string) => {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/user/${id}/lock`,
      );

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === id ? response.data : user)),
      );
      enqueueSnackbar("Cap nhat trang thai tai khoan thanh cong", {
        variant: "success",
        autoHideDuration: 1500,
      });
    } catch (error: any) {
      const errorMessage =
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : "Cap nhat trang thai tai khoan that bai";
      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 1500,
      });
    }
  };

  return { lockUser };
};
