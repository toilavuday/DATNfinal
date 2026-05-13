import React, { useState, useEffect } from "react";

const DateTime: React.FC = () => {
  const [timeNow, setTimeNow] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      );
      setTimeNow(now.toLocaleTimeString("vi-VN"));
    };

    // Initial update
    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="font-semibold text-lg">
      <span>{currentDate}</span>
      <span> - {timeNow}</span>
    </div>
  );
};

export default DateTime;
