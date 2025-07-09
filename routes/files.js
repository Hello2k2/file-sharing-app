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
    try {
        const [localFiles, r2Files] = await Promise.all([
            getCloudService('Local').listFiles(),
            getCloudService('R2').listFiles(),
            getCloudService('Supabase').listFiles()
        ]);
        const allFiles = [...localFiles, ...r2Files];
        allFiles.sort((a, b) => b.uploadDate - a.uploadDate);
        res.json(allFiles);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách file:', err);
        res.status(500).send('Lỗi server: ' + err.message);
    }
});

router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const { cloud } = req.query;
        if (!cloud) return res.status(400).send('Cần cung cấp "cloud" trong query.');
        const service = getCloudService(cloud);
        const downloadStream = await service.download(filename);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        downloadStream.pipe(res);
    } catch (err) {
        res.status(404).send('Lỗi khi tải file: ' + err.message);
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