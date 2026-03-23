document.addEventListener('DOMContentLoaded', () => {
    const mainActionBtn = document.getElementById('mainActionBtn');
    const plusMenu = document.getElementById('plusMenu');
    const closePlusMenu = document.getElementById('closePlusMenu');
    const openAddPlaceModal = document.getElementById('openAddPlaceModal');
    const openAddReviewModal = document.getElementById('openAddReviewModal');

    const placeModal = document.getElementById('placeModal');
    const closePlaceModal = document.getElementById('closePlaceModal');
    const submitPlaceBtn = document.getElementById('submitPlaceBtn');

    const reviewModal = document.getElementById('reviewModal'); // Handled in review.js but we need to open it

    // --- 1. Mở Form Thêm Địa Điểm qua Nút Dấu Cộng ---
    if (mainActionBtn) {
        mainActionBtn.addEventListener('click', () => {
            if (!localStorage.getItem('user_vtkt')) {
                showToast("Vui lòng đăng nhập để đóng góp!", "error");
                document.querySelector('.nav-btn[data-target="profile"]').click();
                return;
            }
            placeModal.classList.remove('hidden');
            setTimeout(() => placeModal.classList.remove('translate-y-full'), 10);

            // Re-init Google Maps Autocomplete just in case
            if (window.initPlaceAutocomplete) window.initPlaceAutocomplete();
        });
    }

    // --- 3. Place Modal Close ---
    if (closePlaceModal) {
        closePlaceModal.addEventListener('click', () => {
            placeModal.classList.add('translate-y-full');
            setTimeout(() => placeModal.classList.add('hidden'), 300);
        });
    }

    // --- Xử lý tải ảnh địa điểm (Preview UI) ---
    const placeImageInput = document.getElementById('placeImageInput');
    const placeImagePreviewContainer = document.getElementById('placeImagePreviewContainer');
    let placeSelectedFiles = [];

    if (placeImageInput && placeImagePreviewContainer) {
        const defaultLabel = placeImagePreviewContainer.innerHTML;

        placeImageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Xoá nút upload label nếu có file
            if (placeSelectedFiles.length === 0) {
                placeImagePreviewContainer.innerHTML = '';
            }

            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                placeSelectedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'relative w-24 h-24 flex-shrink-0';
                    div.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <button type="button" class="remove-place-img-btn absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform">
                            <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                    `;
                    // Nút xoá ảnh
                    div.querySelector('.remove-place-img-btn').onclick = () => {
                        const idx = placeSelectedFiles.indexOf(file);
                        if (idx > -1) placeSelectedFiles.splice(idx, 1);
                        div.remove();
                        if (placeSelectedFiles.length === 0) {
                            placeImagePreviewContainer.innerHTML = defaultLabel;
                            // Gắn lại listener do bị ghi đè
                            const newInput = document.getElementById('placeImageInput');
                            if (newInput) {
                                newInput.addEventListener('change', placeImageInput.onchange);
                            }
                        }
                    };
                    placeImagePreviewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
            // Reset input
            placeImageInput.value = '';
        });
    }

    // --- 4. Submit Place Logic ---
    if (submitPlaceBtn) {
        submitPlaceBtn.addEventListener('click', async () => {
            const name = document.getElementById('placeName').value.trim();
            const category_id = document.getElementById('placeCategory').value;
            const address = document.getElementById('placeAddress').value.trim();
            const description = document.getElementById('placeDesc').value.trim();
            const user = JSON.parse(localStorage.getItem('user_vtkt'));

            if (!name || !address) {
                showToast("Vui lòng nhập tên và địa chỉ!", "error");
                return;
            }
            if (placeSelectedFiles.length === 0) {
                showToast("Vui lòng thêm ít nhất một hình ảnh cho địa điểm!", "error");
                return;
            }

            submitPlaceBtn.disabled = true;
            submitPlaceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            try {
                // 1. Upload ảnh trước (bắt buộc)
                let uploadedImageUrls = [];
                if (placeSelectedFiles.length > 0) {
                    const formDataImage = new FormData();
                    placeSelectedFiles.forEach(file => formDataImage.append('images[]', file));

                    const uploadRes = await fetch('/api/upload.php', { method: 'POST', body: formDataImage });
                    const uploadData = await uploadRes.json();
                    if (uploadData.status === 'success' || uploadData.status === 'partial') {
                        uploadedImageUrls = uploadData.urls || [];
                    } else {
                        throw new Error(uploadData.message || "Lỗi tải ảnh");
                    }
                }

                // Read real coordinates from coord picker hidden inputs
                const latVal = document.getElementById('placeLatitude')?.value;
                const lngVal = document.getElementById('placeLongitude')?.value;

                const res = await fetch('/api/places.php?action=add_place', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'add_place',
                        name,
                        category_id,
                        address,
                        description,
                        user_id: user.id,
                        latitude: latVal ? parseFloat(latVal) : null,
                        longitude: lngVal ? parseFloat(lngVal) : null,
                        images: uploadedImageUrls
                    })
                });
                const data = await res.json();

                if (data.status === 'success') {
                    showToast(data.message, "success");

                    // Update Points in local storage for instant feedback
                    user.points = (user.points || 0) + 15;
                    localStorage.setItem('user_vtkt', JSON.stringify(user));

                    // Sync Profile UI
                    if (document.getElementById('profilePoints')) {
                        document.getElementById('profilePoints').textContent = user.points;
                    }
                    if (document.getElementById('topBarPoints')) {
                        document.getElementById('topBarPoints').textContent = user.points;
                    }

                    // Reset & Close
                    document.getElementById('placeName').value = '';
                    document.getElementById('placeAddress').value = '';
                    document.getElementById('placeDesc').value = '';

                    if (placeImagePreviewContainer) {
                        const btnUpload = `<label class="w-24 h-24 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-darkCard border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <i class="fa-solid fa-camera text-2xl text-gray-400 mb-1"></i>
                                <span class="text-[10px] font-bold text-gray-500">Tải ảnh lên</span>
                                <input type="file" id="placeImageInput" accept="image/*" multiple class="hidden">
                            </label>`;
                        placeImagePreviewContainer.innerHTML = btnUpload;
                        placeSelectedFiles = [];
                        // Re-bind change event by clicking on the new label and trigger old listener 
                        // It's cleaner to reload the page or let user manually refresh but this will do.
                        setTimeout(() => location.reload(), 1500);
                    }

                    closePlaceModal.click();
                } else {
                    showToast(data.message, "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Lỗi kết nối máy chủ", "error");
            } finally {
                submitPlaceBtn.disabled = false;
                submitPlaceBtn.textContent = 'Gửi';
            }
        });
    }
});
