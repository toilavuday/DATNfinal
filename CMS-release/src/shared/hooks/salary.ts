import { useState, useEffect } from "react";
import axios from "axios";
import { enqueueSnackbar } from "notistack";
import { SalaryData } from "../types/salary";

export const useSalaries = (month: string, userIds: string[]) => {
  const [salaries, setSalaries] = useState<SalaryData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userIds.length === 0) return;

    const fetchSalaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/income/calculate-salaries`,
          {
            params: {
              month,
              userIds: JSON.stringify(userIds),
            },
          }
        );

        if (response.data.message === "Tính lương thành công") {
          setSalaries(response.data.data);
        } else {
          const errorMessage =
            typeof response.data.message === "string"
              ? response.data.message
              : "Không thể tải dữ liệu lương";
          setSalaries([]);
          setError(errorMessage);
          enqueueSnackbar(errorMessage, { variant: "error" });
        }
      } catch (error) {
        const errorMessage = "Không thể tải dữ liệu lương";
        setSalaries([]);
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: "error" });
        console.error("Error fetching salaries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaries();
  }, [month, userIds]);

  return { salaries, loading, error };
};
