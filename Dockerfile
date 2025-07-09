# ===== Giai đoạn 1: Build (Xây dựng) =====
# Sử dụng phiên bản Node.js 20, dòng "slim" nhẹ hơn và an toàn hơn
FROM node:20-slim AS builder

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Sao chép file package.json và package-lock.json vào trước
# Điều này tận dụng cơ chế cache của Docker, nếu 2 file này không đổi,
# Docker sẽ không chạy lại 'npm install', giúp build nhanh hơn rất nhiều.
COPY package*.json ./

# Cài đặt tất cả các dependencies, bao gồm cả devDependencies để build nếu cần
RUN npm install

# Sao chép toàn bộ mã nguồn còn lại của bạn vào
COPY . .

# (Tùy chọn) Nếu bạn có bước build cho frontend (ví dụ: React, Vue),
# bạn sẽ chạy lệnh build ở đây. Với dự án hiện tại thì không cần.
# RUN npm run build


# ===== Giai đoạn 2: Production (Chạy thực tế) =====
# Bắt đầu lại từ một image Node.js nhẹ hơn nữa để chạy
FROM node:20-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file package.json và package-lock.json
COPY package*.json ./

# Chỉ cài đặt các dependencies cần thiết để chạy (production dependencies)
# Điều này giúp image cuối cùng nhẹ hơn và an toàn hơn
RUN npm install --omit=dev

# Sao chép mã nguồn đã được build từ giai đoạn 'builder'
# Bao gồm cả thư mục 'node_modules' đã được cài đặt ở trên
COPY --from=builder /app .

# Mở cổng mà ứng dụng của bạn đang lắng nghe (được lấy từ biến môi trường PORT)
# Railway sẽ tự động cung cấp biến này
EXPOSE 3000

# Lệnh để khởi động ứng dụng

CMD ["npm", "start"]