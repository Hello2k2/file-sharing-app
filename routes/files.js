const express = require('express');
const router = express.Router();
const getCloudService = require('../services/cloudFactory');

const checkPassword = (req, res, next) => {
    const password = req.query.password || req.body.password || req.headers['x-password'];
    if (!password || password !== process.env.PASSWORD) {
        return res.status(403).send('Sai mật khẩu hoặc mật khẩu không được cung cấp!');
    }
    next();
};

router.use(checkPassword);

router.get('/', async (req, res) => {
    // Định nghĩa các dịch vụ cần lấy file
    const services = ['Local', 'R2', 'Supabase', 'Backblaze'];

    // Dùng Promise.allSettled để không bị sập khi một service lỗi
    const results = await Promise.allSettled(
        services.map(serviceName => getCloudService(serviceName).listFiles())
    );

    let allFiles = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            // Nếu thành công, thêm file vào danh sách
            allFiles = allFiles.concat(result.value);
        } else {
            // Nếu thất bại, ghi log lỗi ra console nhưng không làm sập app
            console.error(`Lỗi khi lấy danh sách từ service "${services[index]}":`, result.reason.message);
        }
    });

    // Sắp xếp và gửi về cho client
    allFiles.sort((a, b) => b.uploadDate - a.uploadDate);
    res.json(allFiles);
});

router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const { cloud } = req.query;

        if (!cloud) {
            return res.status(400).send('Cần cung cấp "cloud" trong query.');
        }

        const service = getCloudService(cloud);
        const downloadStream = await service.download(filename);

        // --- Logic mới để xử lý xem trước/tải về ---
        const fileExtension = path.extname(filename).toLowerCase();
        
        // Bản đồ các loại file phổ biến
        const mimeTypes = {
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.wav': 'audio/wav',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript'
        };

        // Các loại file có thể xem trực tiếp trong trình duyệt
        const inlineFileTypes = ['.mp3', '.mp4', '.webm', '.ogg', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];

        // Thiết lập Content-Type để trình duyệt biết đây là file gì
        res.setHeader('Content-Type', mimeTypes[fileExtension] || 'application/octet-stream');
        
        // Quyết định xem nên xem trước (inline) hay tải về (attachment)
        if (inlineFileTypes.includes(fileExtension)) {
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }
        // --- Kết thúc logic mới ---

        downloadStream.pipe(res).on('error', (err) => {
            console.error('Lỗi khi stream file:', err);
            if (!res.headersSent) {
                res.status(500).send('Lỗi khi stream file.');
            }
        });

    } catch (err) {
        console.error('Lỗi khi xử lý file:', err.message);
        if (!res.headersSent) {
            res.status(404).send('Lỗi khi xử lý file: ' + err.message);
        }
    }
});

router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const { cloud } = req.query;
        if (!cloud) return res.status(400).send('Cần cung cấp "cloud" trong query.');
        const service = getCloudService(cloud);
        await service.delete(filename);
        res.status(200).send(`File "${filename}" đã được xóa.`);
    } catch (err) {
        res.status(500).send('Lỗi khi xóa file: ' + err.message);
    }
});

module.exports = router;
