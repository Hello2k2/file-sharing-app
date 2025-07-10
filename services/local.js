const fs = require('fs-extra');
const path = require('path');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function listFiles() {
    await fs.ensureDir(UPLOADS_DIR);
    const fileNames = await fs.readdir(UPLOADS_DIR);
    const fileDetails = await Promise.all(
        fileNames.map(async (fileName) => {
            const stats = await fs.stat(path.join(UPLOADS_DIR, fileName));
            return {
                name: fileName,
                cloud: 'Local',
                size: stats.size,
                uploadDate: stats.mtimeMs
            };
        })
    );
    return fileDetails;
}

async function upload(file, onProgress) {
    // Multer đã lưu file, không cần làm gì thêm
    // Báo cáo hoàn thành 100% ngay lập tức
    if (onProgress) onProgress(100);
    return Promise.resolve();
}

async function download(fileName) {
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!await fs.pathExists(filePath)) throw new Error('File không tồn tại');
    return fs.createReadStream(filePath);
}

async function deleteFile(fileName) {
    return fs.unlink(path.join(UPLOADS_DIR, fileName));
}

module.exports = { listFiles, upload, download, delete: deleteFile };