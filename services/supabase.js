const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const stream = require('stream');

// Khởi tạo Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseBucketName = process.env.SUPABASE_BUCKET_NAME;

// Lấy danh sách file từ bucket
async function listFiles() {
    const { data, error } = await supabase.storage.from(supabaseBucketName).list('', {
        limit: 1000, // Giới hạn số lượng file trả về
        sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
        console.error("Lỗi khi lấy danh sách từ Supabase:", error);
        throw error;
    }

    if (!data) return [];

    return data
        // Supabase trả về cả các thư mục rỗng, ta cần lọc bỏ chúng
        .filter(file => file.id !== null)
        .map(file => ({
            name: file.name,
            cloud: 'Supabase',
            size: file.metadata?.size || 0,
            uploadDate: new Date(file.created_at).getTime()
        }));
}

// Tải file lên Supabase
async function upload(file, onProgress) {
    // Supabase SDK v2 yêu cầu buffer, không hỗ trợ stream trực tiếp cho onProgress
    // Chúng ta sẽ đọc toàn bộ file vào buffer
    const fileBuffer = fs.readFileSync(file.path);

    const { error } = await supabase.storage
        .from(supabaseBucketName)
        .upload(file.originalname, fileBuffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true // Ghi đè nếu file đã tồn tại
        });

    if (error) {
        console.error("Lỗi khi upload lên Supabase:", error);
        throw error;
    }
    
    // Vì không có stream tiến trình, chúng ta báo 100% khi hoàn tất
    if (onProgress) onProgress(100);
}

// Tải file từ Supabase về
async function download(fileName) {
    const { data, error } = await supabase.storage
        .from(supabaseBucketName)
        .download(fileName);

    if (error) {
        console.error("Lỗi khi download từ Supabase:", error);
        throw error;
    }
    
    // Chuyển Blob thành Stream để pipe về cho client
    const readableStream = new stream.Readable();
    readableStream._read = () => {}; // Cần thiết cho Readable stream
    data.arrayBuffer().then(buffer => {
        readableStream.push(Buffer.from(buffer));
        readableStream.push(null); // Báo hiệu kết thúc stream
    });

    return readableStream;
}

// Xóa file trên Supabase
async function deleteFile(fileName) {
    const { error } = await supabase.storage
        .from(supabaseBucketName)
        .remove([fileName]);

    if (error) {
        console.error("Lỗi khi xóa file trên Supabase:", error);
        throw error;
    }
}

module.exports = { listFiles, upload, download, delete: deleteFile };