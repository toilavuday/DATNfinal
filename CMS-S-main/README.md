# CMS-S Backend

Backend cho hệ thống quản lý quán cà phê, xây dựng bằng NestJS, Prisma và MongoDB. Dự án cung cấp API cho đăng nhập, quản lý người dùng, sản phẩm, đơn hàng, lịch làm, lương, kho nguyên liệu, thanh toán và một số cấu hình hệ thống.

## 1. Tổng quan kiến trúc

Luồng chính của hệ thống:

1. Client gọi API NestJS.
2. Controller nhận request và chuyển vào service.
3. Service xử lý nghiệp vụ.
4. Prisma thao tác với MongoDB.
5. Một số nghiệp vụ gọi dịch vụ ngoài:
   - Cloudinary để upload/xóa ảnh.
   - Gmail SMTP qua Nodemailer để gửi mail quên mật khẩu.
   - MoMo để tạo giao dịch thanh toán.

Điểm vào ứng dụng nằm ở `src/main.ts`:

- Bật CORS.
- Khởi tạo Swagger tại `/api`.
- Chạy server ở `PORT`, mặc định là `3002`.

## 2. Công nghệ sử dụng

- NestJS 10
- Prisma ORM
- MongoDB
- JWT cho đăng nhập
- Cloudinary cho ảnh
- Nodemailer cho email
- Swagger cho tài liệu API
- pnpm để quản lý package

## 3. Cấu trúc thư mục chính

```text
src/
  main.ts
  app.module.ts
  modules/
    auth/
    user/
    product/
    order/
    payment/
    schedule/
    income/
    stock/
    system-setting/
    email/
  prisma/
  shared/
    dto/
    utils/
prisma/
  schema.prisma
```

Ý nghĩa:

- `modules/*`: từng domain nghiệp vụ.
- `shared/dto`: DTO validate input.
- `shared/utils`: upload/xóa file trên Cloudinary.
- `prisma/schema.prisma`: định nghĩa model dữ liệu.
- `src/prisma/prisma.service.ts`: Prisma client dùng chung.

## 4. Mô hình dữ liệu

Datasource hiện tại dùng MongoDB:

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

Các model chính:

- `User`: tài khoản người dùng, role, ảnh đại diện, lương theo giờ, thông tin ngân hàng, trạng thái khóa.
- `Product`: sản phẩm bán ra.
- `Order`: đơn hàng, danh sách item dạng JSON, phương thức thanh toán.
- `Schedule`: lịch làm việc theo ngày, ca làm, số giờ, trạng thái.
- `IncomeRecord`: bản ghi thu nhập theo tháng.
- `StockEntryBatch`: một lần nhập kho.
- `StockEntry`: từng nguyên liệu trong một batch nhập kho.
- `Activity`: hoạt động gắn với nhân viên.
- `SystemSetting`: cấu hình bật/tắt theo key.

## 5. Các module và cách hoạt động

### Auth

Base route: `/auth`

Chức năng:

- `POST /auth/register`

  - Nhận form-data gồm thông tin user và file ảnh.
  - Kiểm tra email trùng.
  - Hash mật khẩu bằng `bcrypt`.
  - Upload ảnh lên Cloudinary.
  - Lưu user vào MongoDB.

- `POST /auth/login`

  - Tìm user theo email.
  - So sánh mật khẩu bằng `bcrypt.compare`.
  - Từ chối nếu tài khoản bị khóa.
  - Trả về `accessToken` JWT.

- `GET /auth/me`

  - Lấy Bearer token từ header.
  - Decode token và trả về payload người dùng.

- `POST /auth/forgot-password`

  - Sinh `resetToken`.
  - Lưu token và thời gian hết hạn 15 phút.
  - Gửi email qua Gmail SMTP.

- `POST /auth/reset-password`
  - Kiểm tra token, email và hạn dùng.
  - Hash mật khẩu mới.
  - Xóa token sau khi dùng.

### User

Base route: `/user`

Chức năng:

- Lấy toàn bộ user.
- Lấy user theo id.
- Cập nhật thông tin user và ảnh đại diện.
- Khóa/mở khóa tài khoản bằng cách đảo `isLocked`.
- Xóa user và dọn dữ liệu liên quan:
  - `order`
  - `incomeRecord`
  - `schedule`
  - `activity`

Khi đổi ảnh hoặc xóa user, service sẽ xóa file cũ trên Cloudinary.

### Product

Base route: `/product`

Chức năng:

- Lấy toàn bộ sản phẩm.
- Tạo sản phẩm mới với ảnh upload lên Cloudinary.
- Cập nhật sản phẩm, hỗ trợ thay ảnh.
- Xóa sản phẩm và xóa luôn ảnh trên Cloudinary.

Lưu ý:

- `price` được ép kiểu sang số trong service.
- Khi tạo sản phẩm, giá phải lớn hơn `0`.

### Order

Base route: `/order`

Chức năng:

- Tạo đơn hàng.
- Lấy chi tiết đơn.
- Lấy danh sách đơn hàng.
- Xóa đơn hàng.

Luồng tạo đơn:

1. Nhận `userId`, `items`, `amount`, `paymentMethod`.
2. Với từng item, service truy vấn `Product`.
3. Chụp snapshot dữ liệu sản phẩm vào `items` của order:
   - `productId`
   - `productName`
   - `productPrice`
   - `quantity`
   - `total`
4. Lưu order với `status: success`.

Điểm đáng chú ý:

- `items` của `Order` được lưu dưới dạng `Json`, nên order giữ được thông tin sản phẩm tại thời điểm mua.

### Payment

Base route: `/payment`

Chức năng:

- `POST /payment/create`: tạo request thanh toán MoMo.
- `POST /payment/webhook`: nhận callback/webhook từ MoMo.

Luồng:

1. Service đọc cấu hình MoMo từ biến môi trường.
2. Tạo chữ ký HMAC SHA256.
3. Gọi API MoMo bằng `axios`.
4. Trả response từ MoMo về client.

Hiện trạng:

- Webhook mới log kết quả và trả trạng thái thành công/thất bại.
- Chưa có logic cập nhật `Order` sau thanh toán trong `PaymentService`.

### Schedule

Base route: `/schedule`

Chức năng:

- Lấy danh sách lịch, có thể lọc theo `userId` và `month`.
- Lấy chi tiết lịch theo id.
- Tạo lịch mới.
- Cập nhật lịch.
- Xóa lịch.

Rule nghiệp vụ khi tạo lịch:

- Không được trùng ca trong cùng một ngày cho cùng một nhân viên.
- Mỗi ngày tối đa 3 ca.

### Income

Base route: `/income`

Chức năng:

- `GET /income/calculate-salaries`

Luồng tính lương:

1. Nhận `month` và `userIds`.
2. Lấy danh sách nhân viên theo `userIds`.
3. Lấy lịch làm trong tháng.
4. Cộng `hoursWorked`.
5. Tính lương theo công thức:

```text
salary = totalHoursWorked * hourlyRate
```

Hiện trạng:

- Service mới trả kết quả tính toán.
- Chưa ghi kết quả vào `IncomeRecord`.

### Stock

Base route: `/stock`

Chức năng:

- Thêm nhiều nguyên liệu trong một lần nhập kho.
- Lấy danh sách batch nhập kho.
- Lấy danh sách entry của một batch.
- Cập nhật số lượng một entry.
- Xóa một entry.
- Xóa cả batch.

Luồng nhập kho:

1. Nhận mảng nguyên liệu.
2. Validate tên nguyên liệu, đơn vị, số lượng.
3. Tạo một `StockEntryBatch`.
4. Tạo nhiều `StockEntry` lồng trong batch đó.

### System Setting

Base route: `/system-settings`

Chức năng:

- `GET /system-settings/edit-schedule`: lấy trạng thái cho phép sửa lịch.
- `PUT /system-settings/edit-schedule/toggle`: bật/tắt cho phép sửa lịch.

Cấu hình đang được lưu trong collection `SystemSetting` với key:

- `edit_schedule_enabled`

### Email

`MailService` dùng `nodemailer` với Gmail để gửi email quên mật khẩu.

## 6. Swagger và kiểm thử API

Sau khi chạy server:

- API base local: `http://localhost:3002`
- Swagger UI: `http://localhost:3002/api`

## 7. Biến môi trường cần có

Tối thiểu cần cấu hình:

```env
DATABASE_URL=
PORT=3002

EMAIL_USER=
EMAIL_PASS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=cms

MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=
MOMO_IPN_URL=
MOMO_REQUEST_TYPE=
MOMO_API_ENDPOINT=
```

Ghi chú quan trọng:

- `CLOUDINARY_FOLDER` là tùy chọn, mặc định backend sẽ dùng folder `cms`.
- Nếu database đang còn URL ảnh cũ từ Firebase, backend mới sẽ không thể xóa các file đó trên Firebase; cần dọn thủ công phía storage cũ nếu muốn.

## 8. Cài đặt và chạy project

Yêu cầu:

- Node.js 20+ hoặc 21
- pnpm
- MongoDB đang chạy và có `DATABASE_URL`

Cài đặt:

```bash
pnpm install
pnpm prisma generate
pnpm prisma db push
```

Chạy project:

```bash
pnpm start
```

Chạy watch mode:

```bash
pnpm start:release
```

Build production:

```bash
pnpm build
pnpm start:prod
```

Lưu ý:

- Script `start:release` thực tế đang chạy `nodemon`, tức là watch mode chứ không phải release mode.

## 9. Luồng tích hợp ngoài

### Upload ảnh

1. Client gửi file qua multipart/form-data.
2. `FileInterceptor` lấy file.
3. `FileUploadService` upload file lên Cloudinary.
4. Service nhận URL ảnh và lưu vào MongoDB.

### Quên mật khẩu

1. User nhập email.
2. Hệ thống sinh token reset.
3. Token được lưu vào `User`.
4. `MailService` gửi token qua email.
5. User gửi token + mật khẩu mới để đặt lại.

### Thanh toán MoMo

1. Client gọi `/payment/create`.
2. Hệ thống tạo chữ ký và gửi request sang MoMo.
3. Client hoàn tất thanh toán ở phía MoMo.
4. MoMo gọi webhook về `/payment/webhook`.

## 10. Một số lưu ý kỹ thuật khi phát triển tiếp

- `JwtModule` và `JwtStrategy` đang dùng secret hard-code là `your_jwt_secret`; nên chuyển sang biến môi trường.
- `GET /auth/me` đang `decode` token chứ không `verify` token.
- Phần lớn endpoint hiện chưa gắn guard xác thực/ phân quyền.
- `IncomeRecord` đã có trong schema nhưng hiện chưa được dùng khi tính lương.
- Có biến môi trường `VNP_*` trong `.env` nhưng code hiện tại chưa dùng.

## 11. Tóm tắt nhanh

Đây là một backend quản lý quán cà phê theo kiểu module hóa:

- `auth` và `user` quản lý tài khoản nhân viên/người dùng.
- `product` và `order` xử lý bán hàng.
- `payment` tích hợp MoMo.
- `schedule` và `income` phục vụ vận hành nhân sự.
- `stock` theo dõi nhập nguyên liệu.
- `system-setting` lưu các cờ cấu hình hệ thống.

Nếu cần mở rộng tiếp, điểm nên ưu tiên là:

1. Thêm guard cho các API cần bảo vệ.
2. Chuyển các secret sang `.env`.
3. Hoàn thiện luồng đồng bộ thanh toán vào `Order`.
4. Kiểm tra đủ biến môi trường Cloudinary trước khi deploy.
