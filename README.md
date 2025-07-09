# 🚀 File Sharing - Nền tảng Chia sẻ File Đa đám mây
Một ứng dụng chia sẻ file mạnh mẽ, hiện đại được xây dựng trên nền tảng Node.js, cho phép bạn dễ dàng tải lên, quản lý và chia sẻ file của mình trên nhiều dịch vụ lưu trữ đám mây khác nhau hoặc ngay tại máy chủ local.
Tính Năng Nổi Bật
Hỗ trợ Đa Đám Mây: Dễ dàng chuyển đổi và lưu trữ file trên Local Storage, Cloudflare R2, và Supabase Storage.

Giao Diện Hiện Đại: Giao diện người dùng sạch sẽ, dễ sử dụng được xây dựng với Bootstrap 5.

Upload Kéo-Thả: Tải file lên nhanh chóng bằng cách kéo thả trực tiếp vào cửa sổ trình duyệt.

Thanh Tiến Trình 2 Giai Đoạn: Theo dõi chính xác tiến trình upload, từ trình duyệt lên server (Chặng 1) và từ server lên cloud (Chặng 2), mang lại trải nghiệm người dùng mượt mà, không bị "treo".

Quản lý File Toàn Diện: Xem danh sách, tìm kiếm, tải xuống và xóa file một cách an toàn.

Bảo Mật: Truy cập được bảo vệ bằng mật khẩu duy nhất cấu hình qua biến môi trường.

Sẵn sàng cho Production: Tối ưu hóa để triển khai dễ dàng trên các nền tảng như Railway, Heroku.

🛠️ Công Nghệ Sử Dụng
Backend: Node.js, Express.js

Frontend: HTML5, CSS3, JavaScript, Bootstrap 5

Lưu trữ: Cloudflare R2, Supabase Storage, Local File System

Real-time: WebSocket (ws)

Upload: Multer

⚙️ Cài Đặt và Chạy Thử Tại Local
Yêu Cầu
Node.js (phiên bản 18.x trở lên)

npm (thường đi kèm với Node.js)

Các Bước Cài Đặt
Sao chép (Clone) Repository:

Bash

git clone https://github.com/your-username/your-repository-name.git
cd your-repository-name
Cài đặt các gói phụ thuộc:

Bash

npm install
Tạo file cấu hình môi trường:

Sao chép file .env.example thành một file mới tên là .env.

Mở file .env và điền đầy đủ các thông tin của bạn vào.

Đoạn mã

# Cấu hình Server
PORT=3000
PASSWORD=your_secret_password_here

# Cloudflare R2
R2_ENDPOINT=https://<your_account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your_r2_access_key_id>
R2_SECRET_ACCESS_KEY=<your_r2_secret_access_key>
R2_BUCKET_NAME=<your_r2_bucket_name>

# Supabase
SUPABASE_URL=https://<your_project_id>.supabase.co
SUPABASE_KEY=<your_service_role_key>
SUPABASE_BUCKET_NAME=<your_supabase_bucket_name>
Khởi động Server:

Bash

npm start
Truy cập ứng dụng:
Mở trình duyệt và truy cập vào http://localhost:3000. Ứng dụng sẽ yêu cầu bạn nhập mật khẩu đã cấu hình trong file .env.
