# CMS Coffee Frontend

Frontend quản lý quán cà phê được xây bằng Next.js 14. Dự án này cung cấp giao diện đăng nhập, tạo đơn hàng, quản lý nhân viên, sản phẩm, lương, kho và lịch làm việc.

## 1. Mục đích dự án

Hệ thống phục vụ 2 nhóm người dùng:

- `STAFF`: tạo đơn hàng, xem lịch làm việc, xem hồ sơ cá nhân.
- `ADMIN`: có toàn bộ quyền của `STAFF` và thêm quyền quản lý kinh doanh, nhân viên, sản phẩm, lương và kho.

## 2. Công nghệ đang dùng

- Next.js 14 (`App Router`)
- React 18
- TypeScript
- Ant Design
- Tailwind CSS
- Recoil
- Axios
- Notistack
- Recharts
- XLSX

## 3. Yêu cầu môi trường

- Node.js `>= 18`
- `npm`, `pnpm` hoặc `yarn`
- Backend API đang chạy và truy cập được từ frontend

## 4. Cài đặt và chạy dự án

### Cài dependencies

Chọn 1 package manager và dùng nhất quán:

```bash
npm install
```

hoặc:

```bash
pnpm install
```

### Cấu hình biến môi trường

Tạo hoặc chỉnh file `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Ý nghĩa:

- `NEXT_PUBLIC_API_URL`: URL backend mà frontend sẽ gọi tới.

### Chạy môi trường development

```bash
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:3003
```

Lưu ý: script `dev` đã cố định cổng `3003`.

### Build production

```bash
npm run build
```

### Chạy production

```bash
PORT=3003 npm run start
```

Lưu ý: script `start` hiện không hard-code cổng, nên nếu không truyền `PORT` thì Next.js sẽ chạy cổng mặc định `3000`.

## 5. Scripts hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 6. Luồng sử dụng cơ bản

### Đăng nhập

- Truy cập `/login`
- Nhập `email` và `password`
- Nếu đăng nhập thành công, hệ thống chuyển tới `/home` với `ADMIN` hoặc vẫn cho phép truy cập các màn hình được phân quyền
- Token được lưu ở `localStorage` (`authToken`) và state Recoil

### Quên mật khẩu

- `/forgot-password`: nhập email để gửi yêu cầu đặt lại mật khẩu
- `/reset-password`: nhập token từ email và mật khẩu mới

Tính năng này phụ thuộc backend có triển khai gửi email và xác thực token.

### Tạo đơn hàng

Trang `/orders` là màn hình thao tác chính cho nhân viên:

- Tìm kiếm sản phẩm
- Lọc theo nhóm sản phẩm
- Thêm sản phẩm vào giỏ hàng
- Chọn khu vực/bàn: `VIP 1`, `VIP 2`, `Sân vườn`, `Mang đi`
- Thanh toán bằng:
  - `Tiền mặt`
  - `QR` (đang gọi API tạo thanh toán)
- Sau khi tạo đơn thành công, hệ thống in hóa đơn

Lịch sử đơn hàng xem tại:

- `/orders/history`

### Quản lý dành cho ADMIN

Các route sau chỉ dành cho `ADMIN`:

- `/home`: dashboard kinh doanh, doanh thu, đơn hàng, top sản phẩm, nhập kho
- `/staff`: quản lý nhân viên, thêm/sửa/xóa/khóa tài khoản
- `/staff/[id]`: xem và cập nhật hồ sơ nhân viên
- `/products`: quản lý sản phẩm
- `/salarys`: xem bảng lương theo tháng, export Excel
- `/inventory`: nhập kho, xem lịch sử nhập kho, xóa batch nhập kho

### Lịch làm việc

Trang `/workschedules` dùng để:

- Xem lịch theo tháng
- Tạo ca làm việc
- Xóa ca làm việc
- Export Excel

Hệ thống có trạng thái khóa/mở chỉnh sửa lịch từ backend qua endpoint cấu hình.

## 7. Phân quyền và điều hướng

- Route `/` tự động chuyển tới `/orders`
- Nếu chưa có token hoặc token hết hạn, hệ thống chuyển về `/login`
- Nếu người dùng không đủ quyền truy cập trang `ADMIN`, hệ thống chuyển tới `/unauthorized`
- Menu sidebar sẽ thay đổi theo `role`

Role đang được sử dụng trong code:

- `ADMIN`
- `STAFF`

## 8. Backend cần hỗ trợ các nhóm API

Frontend hiện đang gọi các nhóm API sau:

- `auth`
- `user`
- `product`
- `order`
- `stock`
- `schedule`
- `system-settings`
- `payment`
- `income`

Một số endpoint tiêu biểu:

```text
/auth/login
/auth/me
/auth/forgot-password
/auth/reset-password
/auth/register
/user
/product
/order
/order/add
/stock/batches
/stock/add-multiple
/schedule
/system-settings/edit-schedule
/payment/create
/income/calculate-salaries
```

Nếu backend thiếu một trong các nhóm API trên, một phần giao diện sẽ không hoạt động đúng.

## 9. Tích hợp đặc biệt

### Thanh toán

Hệ thống hiện có 2 luồng thanh toán trong giao diện:

- `cash`: tạo đơn trực tiếp
- `qr`: gọi backend qua `/payment/create`

Ngoài ra code cũng có logic tạo QR ngân hàng và kiểm tra giao dịch, nhưng luồng đang dùng chính là gọi API thanh toán từ backend.

### In hóa đơn

Sau khi tạo đơn thành công, frontend sinh nội dung hóa đơn và mở luồng in ngay trên trình duyệt.

## 10. Cấu trúc thư mục chính

```text
src/
  app/
    (auth)/              # login, quên mật khẩu, đặt lại mật khẩu
    (dashbroad)/         # dashboard và các màn hình nghiệp vụ
    layout.tsx           # layout gốc
    page.tsx             # kiểm tra token và điều hướng
  components/            # component giao diện dùng lại
  shared/
    hooks/               # gọi API và xử lý nghiệp vụ
    providers/           # recoil, notification, progress bar
    store/Atoms/         # state toàn cục
    types/               # kiểu dữ liệu
  styles/                # CSS global
public/                  # ảnh, icon tĩnh
```

## 11. Lưu ý khi phát triển

- Frontend này phụ thuộc mạnh vào backend, không chạy độc lập hoàn toàn.
- `reactStrictMode` đang tắt trong `next.config.mjs`.
- Dự án chưa có test tự động trong repo hiện tại.
- Một số màn hình dùng dữ liệu thời gian thực từ backend, nên cần backend trả đúng định dạng dữ liệu.
- File `.env` đang dùng biến public nên chỉ đặt các giá trị an toàn cho frontend.

## 12. Khuyến nghị chạy local

1. Khởi động backend ở `http://localhost:3002`
2. Cấu hình `.env`
3. Chạy frontend bằng `npm run dev`
4. Mở `http://localhost:3003/login`
5. Đăng nhập bằng tài khoản được backend cấp

## 13. Tóm tắt nhanh

- Frontend: Next.js 14
- Port dev: `3003`
- Backend mặc định: `3002`
- Trang chính sau đăng nhập: `/orders` hoặc `/home` tùy luồng
- Quản trị: `ADMIN`
- Nhân viên: `STAFF`
