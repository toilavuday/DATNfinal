import { useState } from "react";
import axios from "axios";
import { enqueueSnackbar } from "notistack";

interface MoMoResponse {
  payUrl: string;
  deeplink: string;
  qrCodeUrl: string;
  resultCode: number;
  message: string;
}

export const useMoMo = () => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [deeplink, setDeeplink] = useState<string | null>(null);

  const createMoMoPayment = async (amount: number, orderInfo: string) => {
    setLoading(true);
    try {
      const response = await axios.post<MoMoResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/payment/create`,
        {
          amount,
          orderInfo,
        }
      );

      if (response.data.resultCode === 0) {
        setPaymentUrl(response.data.payUrl);
        setDeeplink(response.data.deeplink);
        setQrCodeUrl(response.data.qrCodeUrl);

        if (response.data.payUrl) {
          window.location.href = response.data.payUrl;
        }
      } else {
        enqueueSnackbar(`Lỗi: ${response.data.message}`, { variant: "error" });
      }
    } catch {
      enqueueSnackbar("Lỗi khi tạo thanh toán MoMo", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return { createMoMoPayment, paymentUrl, qrCodeUrl, deeplink, loading };
};
