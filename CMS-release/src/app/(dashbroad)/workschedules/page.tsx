"use client";
import { BiAddToQueue } from "react-icons/bi";
import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  message,
  Switch,
  Grid,
  Popconfirm,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import localeData from "dayjs/plugin/localeData";
dayjs.extend(localeData);
import axios from "axios";
import * as XLSX from "xlsx";

import { useGetUser } from "@/shared/hooks/user";
import { Employees } from "@/shared/types/user";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";

const { Option } = Select;

const shifts = [
  { label: "Ca 1", value: "Ca 1", time: "08:00 - 16:00", color: "#FFA500" }, // Màu cam
  {
    label: "Ca 2",
    value: "Ca 2",
    time: "16:00 - 24:00",
    color: "#32CD32",
  }, // Màu xanh lá
  { label: "Ca 3 (+5k/h)", value: "Ca 3", time: "24:00 - 08:00", color: "#1E90FF" }, // Màu xanh dương
];

const WorkScheduleCalendar = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [form] = Form.useForm();
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [employees, setEmployees] = useState<Employees[]>([]);
  const auth = useRecoilValue(authState);
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { fetchUsers } = useGetUser();
  const [editSchedule, setEditSchedule] = useState<any>(null);
  const getUsers = useCallback(async () => {
    const users = await fetchUsers();
    setEmployees(users);
  }, [fetchUsers]);
  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/system-settings/edit-schedule`
      );
      console.log("Dữ liệu từ API:", response.data);
      setIsReadOnly(response.data.isEnabled);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      message.error("Không thể lấy trạng thái lịch!");
    }
  };
  useEffect(() => {
    void getUsers();

    void fetchData();
  }, [getUsers]);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule`
      );
      setSchedules(response.data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      message.error("Không thể tải dữ liệu lịch làm việc!");
    }
  };

  const handleAddSchedule = async (values: any) => {
    const { employeeId, shift, hoursWorked, notes } = values;

    if (!employeeId || !shift) {
      message.error("Vui lòng chọn nhân viên và ca làm việc.");
      return;
    }

    const selectedShift = shifts.find((s) => s.value === shift);

    if (!selectedShift) {
      message.error("Ca làm việc không hợp lệ.");
      return;
    }

    if (!selectedDate) {
      message.error("Vui lòng chọn ngày.");
      return;
    }

    const formattedDate = dayjs(selectedDate).toISOString();

    if (getShiftsCountForDate(selectedDate!, shift) >= 3) {
      message.error("Ca làm việc này đã đủ số lượng đăng ký!");
      return;
    }

    const hoursWorkedInt = Number(hoursWorked) || 8;
    const newSchedule = {
      userId: employeeId,
      date: formattedDate,
      shifts: [shift],
      hoursWorked: Number.isInteger(hoursWorkedInt) ? hoursWorkedInt : 8,
      status: "active",
      notes,
    };

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule`,
        newSchedule
      );
      message.success("Thêm lịch làm việc thành công!");
      form.resetFields();
      setIsModalVisible(false);
      fetchSchedules();
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể thêm lịch làm việc!";
      message.error(
        Array.isArray(errorMessage) ? errorMessage[0] : errorMessage
      );
    }
  };

  const getSchedulesForDate = (date: Dayjs) => {
    return schedules.filter((schedule) =>
      dayjs(schedule.date).isSame(date, "day")
    );
  };

  const getShiftsCountForDate = (date: Dayjs, shift: string) => {
    return schedules.filter(
      (schedule) =>
        dayjs(schedule.date).isSame(date, "day") && schedule.shift === shift
    ).length;
  };

  const dateCellRender = (value: Dayjs) => {
    const daySchedules = getSchedulesForDate(value);
    const visibleSchedules = isMobile ? daySchedules.slice(0, 1) : daySchedules;
    const hiddenSchedules = daySchedules.length - visibleSchedules.length;

    return (
      <div className="flex h-full flex-col gap-1">
        {auth?.user?.role === "ADMIN" && !isReadOnly && (
          <Button
            type="default"
            danger
            size={isMobile ? "small" : "middle"}
            onClick={() => {
              setSelectedDate(value);
              setIsModalVisible(true);
            }}
            className="self-end"
          >
            <BiAddToQueue />
          </Button>
        )}
        {visibleSchedules.map((schedule) => {
          const employee = employees.find((e) => e.id === schedule.userId);
          const shiftDetails = shifts.find(
            (s) => s.value === schedule.shifts[0]
          );
          return (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[11px] sm:text-[13px]"
              style={{
                backgroundColor: shiftDetails?.color || "#ccc",
                color: "#fff",
              }}
            >
              <span className="line-clamp-2 break-words text-left">
                {employee?.name} - {schedule.shifts.join(", ")}
              </span>

              {auth?.user?.role === "ADMIN" && !isReadOnly && (
                <div className="flex gap-1">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleEditSchedule(schedule)}
                    className="px-1 text-blue-500"
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Xóa lịch làm việc"
                    description="Bạn có chắc chắn muốn xóa lịch làm việc này không?"
                    onConfirm={() => handleDeleteSchedule(schedule.id)}
                    okText="Có"
                    cancelText="Không"
                  >
                    <Button
                      type="link"
                      danger
                      size="small"
                      className="px-1"
                    >
                      Xóa
                    </Button>
                  </Popconfirm>
                </div>
              )}
            </div>
          );
        })}
        {hiddenSchedules > 0 && (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            +{hiddenSchedules} ca khác
          </span>
        )}
      </div>
    );
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const exportToExcel = () => {
    const currentMonth = dayjs().month();
    const currentYear = dayjs().year();

    const filteredSchedules = schedules.filter((schedule) => {
      const scheduleDate = dayjs(schedule.date);
      return (
        scheduleDate.month() === currentMonth &&
        scheduleDate.year() === currentYear
      );
    });

    const scheduleData = filteredSchedules.map((schedule) => {
      const employee = employees.find((e) => e.id === schedule.userId);
      return {
        Ngày: dayjs(schedule.date).format("DD/MM/YYYY"),
        "Nhân viên": employee?.name,
        "Ca làm việc": schedule.shifts.join(", "),
        "Giờ làm": schedule.hoursWorked,
        "Ghi chú": schedule.notes || "N/A",
      };
    });

    if (scheduleData.length === 0) {
      message.info("Không có lịch làm việc trong tháng hiện tại!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(scheduleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lịch làm việc tháng hiện tại");

    const fileName = `lich_lam_viec_${dayjs().format("MM_YYYY")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule/${scheduleId}`
      );
      message.success("Xóa lịch làm việc thành công!");
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      message.error("Không thể xóa lịch làm việc!");
    }
  };

  const handleEditSchedule = (schedule: any) => {
    setEditSchedule(schedule);
    form.setFieldsValue({
      employeeId: schedule.userId,
      shift: schedule.shifts[0],
      hoursWorked: schedule.hoursWorked,
      notes: schedule.notes || "",
    });
    setIsModalVisible(true);
  };

  const handleUpdateSchedule = async (values: any) => {
    const { employeeId, shift, hoursWorked, notes } = values;

    if (!employeeId || !shift) {
      message.error("Vui lòng chọn nhân viên và ca làm việc.");
      return;
    }

    const selectedShift = shifts.find((s) => s.value === shift);

    if (!selectedShift) {
      message.error("Ca làm việc không hợp lệ.");
      return;
    }

    const hoursWorkedInt = Number(hoursWorked) || 8;
    const updatedSchedule = {
      userId: employeeId,
      date: dayjs(editSchedule.date).toISOString(),
      shifts: [shift],
      hoursWorked: Number.isInteger(hoursWorkedInt) ? hoursWorkedInt : 8,
      status: "active",
      notes,
    };

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule/${editSchedule.id}`,
        updatedSchedule
      );
      message.success("Cập nhật lịch làm việc thành công!");
      form.resetFields();
      setIsModalVisible(false);
      setEditSchedule(null);
      fetchSchedules();
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể cập nhật lịch làm việc!";
      message.error(
        Array.isArray(errorMessage) ? errorMessage[0] : errorMessage
      );
    }
  };

  const handleToggleEdit = async () => {
    const newStatus = !isReadOnly;
    setIsReadOnly(newStatus);
    try {
      setLoading(true);
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/system-settings/edit-schedule/toggle`,
        {
          isEnabled: newStatus,
        }
      );
      setIsReadOnly(newStatus);
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-3 rounded-xl bg-white p-3 shadow-md sm:m-6 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-center text-2xl font-bold text-gray-800 sm:text-3xl lg:text-left">
          Lịch làm việc hàng tháng
        </h2>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[auto_auto_auto] lg:items-center">
          <Button
            type="default"
            onClick={fetchData}
            className="h-11 w-full text-sm text-red-500 sm:text-base"
            disabled={loading}
          >
            Cập nhật chế độ chỉnh sửa lịch
          </Button>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
            <span className="text-sm font-medium text-slate-700 sm:text-base">
              {isReadOnly ? "Chỉ xem" : "Chỉnh sửa"}
            </span>
            <Switch
              checked={!isReadOnly}
              onChange={handleToggleEdit}
              disabled={auth?.user?.role === "STAFF" || loading}
            />
          </div>
          <Button
            type="primary"
            onClick={exportToExcel}
            className="h-11 w-full text-sm sm:text-base"
          >
            Xuất Excel
          </Button>
        </div>
      </div>
      {auth?.user?.role === "ADMIN" && !isReadOnly && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-600">
            {selectedDate
              ? `Ngày đang chọn: ${dayjs(selectedDate).format("DD/MM/YYYY")}`
              : "Chọn một ngày trên lịch để thêm ca làm việc"}
          </span>
          <Button
            type="primary"
            onClick={() => {
              if (!selectedDate) {
                message.info("Chọn ngày trước khi thêm lịch.");
                return;
              }

              setIsModalVisible(true);
            }}
            className="w-full sm:w-auto"
          >
            Thêm lịch cho ngày đã chọn
          </Button>
        </div>
      )}
      <Calendar
        className="work-schedule-calendar mt-4"
        cellRender={dateCellRender}
        fullscreen={!isMobile}
        onSelect={handleDateSelect}
        mode="month"
        style={{ fontSize: isMobile ? "14px" : "18px" }}
      />

      <Modal
        title={editSchedule ? "Sửa lịch làm việc" : "Thêm lịch làm việc mới"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditSchedule(null);
          form.resetFields();
        }}
        footer={null}
        style={{ fontSize: "20px" }}
        width={isMobile ? "calc(100vw - 24px)" : 520}
      >
        <Form layout="vertical" form={form} onFinish={editSchedule ? handleUpdateSchedule : handleAddSchedule}>
          <Form.Item
            label="Nhân viên"
            name="employeeId"
            rules={[{ required: true, message: "Vui lòng chọn nhân viên!" }]}
          >
            <Select placeholder="Chọn nhân viên">
              {employees.map((employee) => (
                <Option key={employee.id} value={employee.id}>
                  {employee.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Ca làm việc"
            name="shift"
            rules={[{ required: true, message: "Vui lòng chọn ca làm việc!" }]}
          >
            <Select placeholder="Chọn ca làm việc">
              {shifts.map((shift) => (
                <Option key={shift.value} value={shift.value}>
                  {shift.label} ({shift.time})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Số giờ làm việc"
            name="hoursWorked"
            rules={[{ required: true, message: "Vui lòng nhập số giờ!" }]}
          >
            <InputNumber
              min={1}
              max={24}
              style={{ width: "100%" }}
              placeholder="Nhập số giờ"
            />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea
              rows={3}
              placeholder="Thêm ghi chú (không bắt buộc)"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block disabled={isReadOnly}>
            {editSchedule ? "Cập nhật" : "Thêm"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkScheduleCalendar;
