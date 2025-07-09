function getCloudService(cloudProvider) {
    try {
        // Luôn chuyển thành chữ thường để khớp với tên file
        const service = require(`./${cloudProvider.toLowerCase()}`);
        return service;
    } catch (error) {
        console.error(`Lỗi khi nạp service cho ${cloudProvider}:`, error);
        throw new Error(`Cloud provider "${cloudProvider}" không được hỗ trợ.`);
    }
}

module.exports = getCloudService;