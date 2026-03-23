let selectedFiles = [];
// --- 7. Compose Review Modal Logic ---
document.addEventListener('DOMContentLoaded', () => {

    const reviewModal = document.getElementById('reviewModal');
    const openAddReviewModal = document.getElementById('openAddReviewModal');
    const closeReviewModal = document.getElementById('closeReviewModal');
    const plusMenu = document.getElementById('plusMenu'); // to close the menu

    // Toggle modal
    if (openAddReviewModal && reviewModal) {
        openAddReviewModal.addEventListener('click', () => {
            if (!localStorage.getItem('user_vtkt')) {
                if (typeof showToast === 'function') showToast("Vui lòng đăng nhập để viết đánh giá!", "error");
                document.querySelector('.nav-btn[data-target="profile"]')?.click();
                return;
            }

            if (plusMenu) {
                plusMenu.classList.remove('active');
                setTimeout(() => plusMenu.classList.add('hidden'), 300);
                const mainPlusIcon = document.getElementById('mainPlusIcon');
                if (mainPlusIcon) mainPlusIcon.style.transform = 'rotate(0deg)';
            }
            reviewModal.classList.remove('hidden');

            // Re-show selector in case it was hidden by place detail
            const placeSelect = document.getElementById('reviewPlace');
            const reviewContent = document.getElementById('reviewContent');
            if (placeSelect && reviewContent) {
                placeSelect.parentElement.classList.remove('hidden');
                placeSelect.disabled = false;
                placeSelect.value = '';
                reviewContent.placeholder = 'Trải nghiệm của bạn thế nào?';
            }

            // Allow display block to apply before animating transform
            setTimeout(() => {
                reviewModal.classList.remove('translate-y-full');
            }, 10);

            // Fetch places to populate select dropdown
            fetchPlacesForDropdown();
        });
    }

    if (closeReviewModal && reviewModal) {
        closeReviewModal.addEventListener('click', () => {
            reviewModal.classList.add('translate-y-full');
            setTimeout(() => {
                reviewModal.classList.add('hidden');
            }, 300);
        });
    }

    // Star Rating system
    const starInput = document.getElementById('reviewRatingInput');
    const stars = document.querySelectorAll('#starRatingSystem i');

    if (stars.length > 0) {
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                starInput.value = rating;

                // Update UI
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.remove('fa-regular', 'text-gray-300', 'dark:text-gray-600');
                        s.classList.add('fa-solid', 'text-yellow-400');
                    } else {
                        s.classList.add('fa-regular', 'text-gray-300', 'dark:text-gray-600');
                        s.classList.remove('fa-solid', 'text-yellow-400');
                    }
                });
            });
        });
    }

    // Load Places for Dropdown
    async function fetchPlacesForDropdown() {
        const select = document.getElementById('reviewPlace');
        if (!select) return;

        try {
            const res = await fetch(`${API_URL}/places.php?action=get_places`);
            const places = await res.json();

            // clear old options except the first placeholder
            while (select.options.length > 1) {
                select.remove(1);
            }

            places.forEach(place => {
                const opt = document.createElement('option');
                opt.value = place.id;
                opt.textContent = place.name + ' - ' + place.address;
                select.appendChild(opt);
            });
        } catch (err) {
            console.error(err);
        }
    }

    // --- Image Preview Logic (UI only for prototype) ---
    const imageInput = document.getElementById('reviewImagesUpload');
    const previewContainer = document.getElementById('imagePreviewContainer');

    if (imageInput && previewContainer) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            files.forEach(file => {
                selectedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'shrink-0 relative w-24 h-24 rounded-xl overflow-hidden shadow-sm group';
                    imgDiv.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer remove-img-btn">
                            <i class="fa-solid fa-trash text-white text-xl"></i>
                        </div>
                    `;

                    // Insert before the add button
                    previewContainer.insertBefore(imgDiv, previewContainer.lastElementChild);

                    // Handle remove
                    imgDiv.querySelector('.remove-img-btn').addEventListener('click', () => {
                        imgDiv.remove();
                        selectedFiles = selectedFiles.filter(f => f !== file);
                    });
                }
                reader.readAsDataURL(file);
            });

            // Reset input so same file can trigger change event again if needed
            imageInput.value = '';
        });
    }
});

// --- 8. Submit Review & Upload Images ---
const submitReviewBtn = document.getElementById('submitReviewBtn');

if (submitReviewBtn) {
    submitReviewBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const placeId = document.getElementById('reviewPlace').value;
        const rating = document.getElementById('reviewRatingInput').value;
        const content = document.getElementById('reviewContent').value;

        if (!placeId) { showToast("Vui lòng chọn địa điểm!", "error"); return; }
        if (rating == 0) { showToast("Vui lòng chọn số sao đánh giá!", "error"); return; }
        if (!content.trim()) { showToast("Vui lòng nhập nội dung đánh giá!", "error"); return; }

        submitReviewBtn.disabled = true;
        submitReviewBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            // 1. Upload Images first (if any)
            let uploadedUrls = [];
            if (selectedFiles.length > 0) {
                const formData = new FormData();
                selectedFiles.forEach(file => {
                    formData.append('images[]', file);
                });

                const uploadRes = await fetch(`${API_URL}/upload.php`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();

                if (uploadData.status === 'success' || uploadData.status === 'partial') {
                    uploadedUrls = uploadData.urls;
                } else {
                    showToast("Lỗi upload ảnh: " + uploadData.message, "error");
                    submitReviewBtn.disabled = false;
                    submitReviewBtn.textContent = 'Đăng';
                    return;
                }
            }

            // 2. Submit Review Data
            const reviewRes = await fetch(`${API_URL}/interactions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_review',
                    place_id: placeId,
                    user_id: currentUser.id,
                    rating: rating,
                    content: content,
                    images: uploadedUrls
                })
            });
            const reviewData = await reviewRes.json();

            if (reviewData.status === 'success') {
                showToast(reviewData.message, "success");

                // Update Points in local storage for instant feedback
                currentUser.points = (currentUser.points || 0) + 10;
                localStorage.setItem('user_vtkt', JSON.stringify(currentUser));

                // Sync Profile UI
                if (document.getElementById('profilePoints')) {
                    document.getElementById('profilePoints').textContent = currentUser.points;
                }
                if (document.getElementById('topBarPoints')) {
                    document.getElementById('topBarPoints').textContent = currentUser.points;
                }
                if (document.getElementById('rewardsTabPoints')) {
                    document.getElementById('rewardsTabPoints').textContent = currentUser.points;
                }

                // Reset Form
                document.getElementById('reviewForm').reset();
                document.getElementById('reviewRatingInput').value = "0";
                document.querySelectorAll('#starRatingSystem i').forEach(s => {
                    s.classList.replace('fa-solid', 'fa-regular');
                    s.classList.replace('text-yellow-400', 'text-gray-300');
                });
                document.querySelectorAll('.remove-img-btn').forEach(btn => btn.click());
                selectedFiles = [];

                // Close modal and refresh feed
                closeReviewModal.click();
                setTimeout(() => {
                    if (typeof loadFeed === 'function') loadFeed();
                    if (typeof loadHomePlaces === 'function') loadHomePlaces();
                }, 500);

            } else {
                showToast(reviewData.message, "error");
            }

        } catch (err) {
            console.error(err);
            showToast("Lỗi kết nối máy chủ", "error");
        } finally {
            submitReviewBtn.disabled = false;
            submitReviewBtn.textContent = 'Đăng';
        }
    });
}

