const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const getCloudService = require('../services/cloudFactory');
const router = express.Router();

const checkPassword = (req, res, next) => {
    const password = req.body.password;
    if (!password || password !== process.env.PASSWORD) {
        return res.status(403).send('Sai mật khẩu!');
    }
    next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.ensureDirSync('uploads/');
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

router.post('/', upload.array('files'), checkPassword, async (req, res) => {
    try {
        const { files } = req;
        const { cloud = 'Local', clientId } = req.body;
        if (!files || files.length === 0) return res.status(400).send('Không có file.');

        const clientWs = req.wss.clients.get(clientId);
        const service = getCloudService(cloud);

        for (const file of files) {
            const onProgress = (percentage) => {
                if (clientWs && clientWs.readyState === 1) { // 1 is OPEN
                    clientWs.send(JSON.stringify({
                        type: 'uploadProgress',
                        file: file.originalname,
                        progress: percentage
                    }));
                }
            };

            await service.upload(file, onProgress);
            if (cloud.toLowerCase() !== 'local') {
                await fs.unlink(file.path);
                console.log(`Đã xóa file tạm: ${file.path}`); // Thêm log để xác nhận
            }
        }
        res.status(200).send(`Tải lên thành công.`);
    } catch (err) {
        console.error('Lỗi khi tải lên:', err);
        res.status(500).send('Lỗi khi tải lên: ' + err.message);
    }
});

module.exports = router;