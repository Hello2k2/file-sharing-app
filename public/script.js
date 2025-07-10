(function() {
    // Biến toàn cục để quản lý trạng thái
    let userPassword = null;
    let selectedFile = null;
    let selectedCloud = 'Local';
    let ws;
    let clientId;

    // ===================================
    // ===== WebSocket Client Setup =====
    // ===================================
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Đã kết nối tới WebSocket server.');
            clientId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            ws.send(JSON.stringify({ type: 'register', clientId: clientId }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'uploadProgress') {
                    const uploadProgress = document.getElementById('uploadProgress');
                    const uploadBar = document.getElementById('uploadBar');
                    const uploadStatus = document.getElementById('uploadStatus');

                    const stage2Progress = 50 + (message.progress / 2);
                    uploadBar.style.width = stage2Progress + '%';
                    uploadBar.innerText = Math.round(stage2Progress) + '%';

                    if (stage2Progress >= 100) {
                        uploadStatus.innerHTML = '<i class="fas fa-check-circle"></i> Hoàn tất!';
                        uploadStatus.className = 'success';
                        loadFileList();
                        
                        // ***** THAY ĐỔI QUAN TRỌNG NẰM Ở ĐÂY *****
                        // Đợi 2 giây để người dùng thấy chữ "Hoàn tất!" rồi mới ẩn đi
                        setTimeout(() => {
                            uploadProgress.style.display = 'none';
                        }, 2000);
                        // *******************************************
                    }
                }
            } catch (e) {
                console.error("Lỗi khi xử lý message từ WebSocket:", e);
            }
        };

        ws.onclose = () => {
            console.log('Mất kết nối WebSocket. Thử kết nối lại sau 3 giây...');
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
            console.error('Lỗi WebSocket:', error);
            ws.close();
        };
    }

    // ===================================
    // ===== Chức năng Xác thực & Tải lên =====
    // ===================================

    function promptForPassword() {
        const password = prompt("Vui lòng nhập mật khẩu để tiếp tục:", "");
        if (password) {
            userPassword = password;
            return true;
        }
        showToast("Cần có mật khẩu để thực hiện hành động này.");
        return false;
    }

    function uploadFile() {
        if (!userPassword && !promptForPassword()) return;

        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;
        if (!files.length) {
            showToast('Chọn file trước!');
            return;
        }

        const uploadStatus = document.getElementById('uploadStatus');
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadBar = document.getElementById('uploadBar');

        // Reset giao diện trước mỗi lần upload
        uploadProgress.style.display = 'block';
        uploadBar.style.width = '0%';
        uploadBar.innerText = '0%';
        uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải lên server... (Chặng 1/2)';
        uploadStatus.className = '';

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('cloud', selectedCloud);
        formData.append('password', userPassword);
        formData.append('clientId', clientId);

        const xhr = new XMLHttpRequest();

        // Chặng 1: Trình duyệt -> Server (chiếm 50% thanh tiến trình)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 50;
                uploadBar.style.width = percentComplete + '%';
                uploadBar.innerText = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                if (selectedCloud.toLowerCase() === 'local') {
                    uploadBar.style.width = '100%';
                    uploadBar.innerText = '100%';
                    uploadStatus.innerHTML = '<i class="fas fa-check-circle"></i> Tải lên thành công!';
                    uploadStatus.className = 'success';
                    loadFileList();
                    // Tự động ẩn sau 2 giây
                    setTimeout(() => {
                        uploadProgress.style.display = 'none';
                    }, 2000);
                } else {
                    // Chặng 1 hoàn tất, chuyển sang chờ phản hồi từ WebSocket cho Chặng 2
                    uploadStatus.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Đang tải lên Cloud... (Chặng 2/2)';
                }
            } else {
                uploadStatus.innerHTML = `<i class="fas fa-times-circle"></i> Lỗi: ${xhr.responseText || xhr.statusText}`;
                uploadStatus.className = 'error';
                if (xhr.status === 403) userPassword = null;
            }
        };

        xhr.onerror = () => {
            uploadStatus.innerHTML = '<i class="fas fa-times-circle"></i> Lỗi kết nối!';
            uploadStatus.className = 'error';
        };

        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    }

    // ===================================
    // ===== Chức năng Quản lý File =====
    // ===================================

    async function loadFileList() {
        if (!userPassword && !promptForPassword()) {
            document.getElementById('fileList').innerHTML = `<li class="list-group-item text-warning"><i class="fas fa-lock"></i> Vui lòng nhập mật khẩu để xem file.</li>`;
            return;
        }

        const fileList = document.getElementById('fileList');
        const searchInput = document.getElementById('searchInput');
        fileList.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách file...</li>';

        try {
            const response = await fetch(`/files?password=${userPassword}`);
            if (!response.ok) {
                if (response.status === 403) {
                    userPassword = null;
                    throw new Error('Sai mật khẩu!');
                }
                throw new Error('Lỗi server!');
            }
            const files = await response.json();

            const iconMap = {
                pdf: 'fa-file-pdf', jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image', gif: 'fa-file-image',
                mp4: 'fa-file-video', mov: 'fa-file-video', avi: 'fa-file-video',
                doc: 'fa-file-word', docx: 'fa-file-word',
                xls: 'fa-file-excel', xlsx: 'fa-file-excel',
                zip: 'fa-file-archive', rar: 'fa-file-archive', '7z': 'fa-file-archive',
                default: 'fa-file-alt'
            };

            window.renderFiles = (filter = '', page = 1, filesPerPage = 10) => {
                fileList.innerHTML = '';
                const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
                const start = (page - 1) * filesPerPage;
                const end = start + filesPerPage;
                const paginatedFiles = filteredFiles.slice(start, end);

                if (paginatedFiles.length === 0 && page === 1) {
                    fileList.innerHTML = '<li class="list-group-item">Không tìm thấy file nào.</li>';
                }

                paginatedFiles.forEach(file => {
                    const ext = file.name.split('.').pop().toLowerCase();
                    const icon = iconMap[ext] || iconMap.default;
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center list-group-item-action';
                    li.innerHTML = `
                        <div>
                            <i class="fas ${icon} me-2 text-primary"></i>
                            <span>${file.name}</span>
                            <span class="badge bg-secondary ms-2">${file.cloud}</span>
                        </div>
                        <span class="text-muted small">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    `;
                    li.onclick = () => showFileMenu(file.name, file.cloud);
                    fileList.appendChild(li);
                });

                const totalPages = Math.ceil(filteredFiles.length / filesPerPage);
                const existingPagination = document.querySelector('.pagination-container');
                if (existingPagination) existingPagination.remove();

                if (totalPages > 1) {
                    const pagination = document.createElement('div');
                    pagination.className = 'pagination-container mt-3 text-center';
                    pagination.innerHTML = `
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="renderFiles('${filter}', ${page - 1})" ${page === 1 ? 'disabled' : ''}>Trước</button>
                        <span>Trang ${page} / ${totalPages}</span>
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="renderFiles('${filter}', ${page + 1})" ${page === totalPages ? 'disabled' : ''}>Sau</button>
                    `;
                    fileList.parentElement.appendChild(pagination);
                }
            };

            renderFiles();
            searchInput.oninput = () => renderFiles(searchInput.value, 1);
        } catch (error) {
            fileList.innerHTML = `<li class="list-group-item text-danger"><i class="fas fa-exclamation-triangle"></i> Không tải được danh sách: ${error.message}</li>`;
            showToast('Không tải được danh sách: ' + error.message);
        }
    }

    function showFileMenu(fileName, cloud) {
        selectedFile = fileName;
        selectedCloud = cloud;
        document.getElementById('selectedFileName').innerText = fileName;
        document.getElementById('downloadProgress').style.display = 'none';
        const modal = new bootstrap.Modal(document.getElementById('fileMenuModal'));
        modal.show();
    }

    function viewFile() {
        if (!selectedFile || (!userPassword && !promptForPassword())) return;
        const fileUrl = `${window.location.origin}/files/${selectedFile}?cloud=${selectedCloud}&password=${userPassword}`;
        window.open(fileUrl, '_blank');
    }

    function downloadFileFromModal() {
        if (!selectedFile || (!userPassword && !promptForPassword())) return;

        const downloadProgress = document.getElementById('downloadProgress');
        const downloadBar = document.getElementById('downloadBar');
        downloadProgress.style.display = 'block';
        downloadBar.style.width = '0%';
        downloadBar.innerText = '0%';

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/files/${selectedFile}?cloud=${selectedCloud}&password=${userPassword}`, true);
        xhr.responseType = 'blob';

        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                downloadBar.style.width = percentComplete + '%';
                downloadBar.innerText = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const url = window.URL.createObjectURL(xhr.response);
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setTimeout(() => {
                    downloadProgress.style.display = 'none';
                    bootstrap.Modal.getInstance(document.getElementById('fileMenuModal')).hide();
                    showToast('Tải xuống thành công!');
                }, 1000);
            } else {
                showToast('Lỗi tải xuống: ' + xhr.statusText);
                downloadProgress.style.display = 'none';
            }
        };

        xhr.onerror = () => {
            showToast('Lỗi kết nối khi tải xuống!');
            downloadProgress.style.display = 'none';
        };

        xhr.send();
    }

    function deleteFile() {
        if (!selectedFile || (!userPassword && !promptForPassword())) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedFile} từ ${selectedCloud}?`)) return;

        fetch(`/files/${selectedFile}?cloud=${selectedCloud}`, {
            method: 'DELETE',
            headers: { 'X-Password': userPassword }
        }).then(response => {
            if (response.ok) {
                showToast('Xóa file thành công!');
                bootstrap.Modal.getInstance(document.getElementById('fileMenuModal')).hide();
                loadFileList();
            } else {
                response.text().then(text => showToast(`Lỗi khi xóa file: ${text}`));
                if (response.status === 403) userPassword = null;
            }
        }).catch(error => showToast('Lỗi kết nối: ' + error.message));
    }

    function copyFileLink() {
        if (!selectedFile || (!userPassword && !promptForPassword())) return;
        const fileUrl = `${window.location.origin}/files/${selectedFile}?cloud=${selectedCloud}&password=${userPassword}`;
        navigator.clipboard.writeText(fileUrl)
            .then(() => showToast('Đã sao chép link!'))
            .catch(err => showToast('Lỗi khi sao chép: ' + err.message));
    }

    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // ===================================
    // ===== Khởi tạo và Gán sự kiện =====
    // ===================================
    
    // Gán các hàm cần thiết vào window để HTML có thể gọi
    window.uploadFile = uploadFile;
    window.loadFileList = loadFileList;
    window.showStorageGrid = async () => {
        console.log("1. Bắt đầu thực hiện showStorageGrid...");
        try {
            const response = await fetch('/storage-info');
            console.log("2. Gọi API /storage-info thành công, status:", response.status);

            if (!response.ok) {
                throw new Error(`Lỗi mạng: ${response.statusText}`);
            }

            const storageInfo = await response.json();
            console.log("3. Đã nhận và phân tích JSON thành công:", storageInfo);

            const grid = document.getElementById('storageGrid');
            if (!grid) {
                console.error("LỖI NGHIÊM TRỌNG: Không tìm thấy phần tử #storageGrid trong HTML.");
                return;
            }

            grid.innerHTML = `
                <div class="storage-option" onclick="selectCloud('Local')">
                    <h6>Local</h6>
                    <p>Đã dùng: ${(storageInfo.Local?.used / 1024 / 1024 || 0).toFixed(2)} MB / Vô hạn</p>
                </div>
                <div class="storage-option" onclick="selectCloud('R2')">
                    <h6>Cloudflare R2</h6>
                    <p>Đã dùng: ${(storageInfo.R2?.used / 1024 / 1024 || 0).toFixed(2)} MB / 10 GB</p>
                </div>
                <div class="storage-option" onclick="selectCloud('Supabase')">
                    <h6>Supabase Storage</h6>
                    <p>Đã dùng: ${(storageInfo.Supabase?.used / 1024 / 1024 || 0).toFixed(2)} MB / 1 GB</p>
                </div>
            `;
            console.log("4. Đã cập nhật nội dung HTML cho modal.");

            const modalElement = document.getElementById('storageGridModal');
            if (!modalElement) {
                console.error("LỖI NGHIÊM TRỌNG: Không tìm thấy phần tử modal #storageGridModal trong HTML.");
                return;
            }
            
            const modal = new bootstrap.Modal(modalElement);
            console.log("5. Đã tạo đối tượng modal của Bootstrap.");
            
            modal.show();
            console.log("6. Đã gọi lệnh modal.show(). Menu phải đang được hiển thị.");

        } catch (err) {
            console.error("!! Đã xảy ra lỗi trong khối CATCH:", err);
            showToast('Lỗi khi hiển thị danh sách cloud: ' + err.message);
        }
    };
    window.selectCloud = (cloud) => {
        selectedCloud = cloud;
        document.getElementById('selectedCloudText').innerText = `Lưu trữ: ${cloud}`;
        showToast(`Đã chọn lưu trữ: ${cloud}`);
        bootstrap.Modal.getInstance(document.getElementById('storageGridModal')).hide();
    };
    window.viewFile = viewFile;
    window.downloadFileFromModal = downloadFileFromModal;
    window.deleteFile = deleteFile;
    window.copyFileLink = copyFileLink;
    window.renderFiles = window.renderFiles || function() {}; // Khởi tạo để tránh lỗi

    // Khởi tạo khi trang được tải
    window.onload = () => {
        connectWebSocket();
        loadFileList();

        const uploadCard = document.querySelector('.upload-card');
        const allowDrop = (e) => { e.preventDefault(); uploadCard.classList.add('dragover'); };
        const dropFile = (e) => {
            e.preventDefault();
            uploadCard.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                document.getElementById('fileInput').files = e.dataTransfer.files;
                uploadFile();
            }
        };
        uploadCard.addEventListener('dragenter', allowDrop);
        uploadCard.addEventListener('dragover', allowDrop);
        uploadCard.addEventListener('dragleave', () => uploadCard.classList.remove('dragover'));
        uploadCard.addEventListener('drop', dropFile);
    };
})();