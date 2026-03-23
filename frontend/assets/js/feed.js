document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.API_BASE_URL + '/api';
    const feedContainer = document.getElementById('feedContainer');

    window.timeAgo = function (dateStr) {
        const date = new Date(dateStr.replace(' ', 'T')); // Fix for Safari/iOS parsing
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return "vài giây trước";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} tuần trước`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} tháng trước`;
        return `${Math.floor(days / 365)} năm trước`;
    };

    // --- Render Explore Feed (Reviews/Posts) ---
    async function loadFeed() {
        if (!feedContainer) return;
        try {
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            const uid = user ? user.id : 0;
            const res = await fetch(`${API_URL}/places.php?action=get_feed&user_id=${uid}`);
            let data = await res.json();

            if (Array.isArray(data)) {
                // 🚀 Logic: Ưu tiên hiển thị Review của Người đang theo dõi lên đầu mục Khám Phá
                if (uid > 0) {
                    try {
                        const followRes = await fetch(`${API_URL}/interactions.php?action=get_following&user_id=${uid}`);
                        const followInfo = await followRes.json();

                        if (followInfo.status === 'success' && followInfo.data) {
                            const followingIds = followInfo.data.map(u => String(u.id));
                            const followedReviews = data.filter(r => followingIds.includes(String(r.user_id)));
                            const otherReviews = data.filter(r => !followingIds.includes(String(r.user_id)));
                            data = [...followedReviews, ...otherReviews]; // Sort: ưu tiên list follwing
                        }
                    } catch (e) {
                        console.log("Error sorting feed by followers", e);
                    }
                }

                renderFeed(data);
            }
        } catch (err) {
            console.error("Gặp lỗi tải feed:", err);
        }
    }

    function renderFeed(reviews) {
        feedContainer.innerHTML = '';

        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-darkCard rounded-3xl p-5 mb-4 shadow-sm border border-gray-50 dark:border-[#2c2c2e]';
            card.dataset.id = review.id;

            // Thumbnail xử lý (nếu có nhiều ảnh)
            let imageHtml = '';
            if (review.images && review.images.length > 0) {
                imageHtml += '<div class="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 mt-4 select-none">';
                const imgUrls = review.images.map(img => img.startsWith('http') ? img : `${API_URL}/../${img}`);
                const imgUrlsJson = JSON.stringify(imgUrls).replace(/"/g, '&quot;');

                imgUrls.forEach((imgUrl, idx) => {
                    imageHtml += `
                        <div class="flex-shrink-0 snap-center relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer shadow-sm group" onclick="window.showLightbox(${imgUrlsJson}, ${idx})">
                            <img src="${imgUrl}" class="w-full h-full object-cover group-active:scale-95 transition-transform">
                        </div>
                    `;
                });
                imageHtml += '</div>';
            }

            const randomBg = review.user_id % 2 === 0 ? 'ff5500' : 'ff8800'; // Default Orange Tints
            const avatarUrl = (review.avatar && review.avatar !== 'default_avatar.png') ? review.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(review.fullname)}&background=${randomBg}&color=fff&rounded=true&bold=true`;
            const likeColor = review.currentUser_liked == 1 ? 'text-[#ff5500]' : 'text-gray-400';

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100">
                    <div class="flex-1">
                        <h4 class="font-extrabold text-sm flex items-center gap-2">${review.fullname} <button class="text-[#ff5500] text-[10px] uppercase tracking-wider bg-[#fff5f0] px-2 py-0.5 rounded-full" onclick="window.toggleFollowUser(this, ${review.user_id})"><i class="fa-solid fa-plus mr-1"></i>Follow</button></h4>
                        <p class="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <i class="fa-solid fa-location-dot"></i> <span>Đã đánh giá tại <b class="text-[#ff5500] hover:underline cursor-pointer" onclick="window.openPlaceDetail({id: ${review.place_id}})">${review.place_name}</b></span>
                        </p>
                    </div>
                    <div class="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <i class="fa-solid fa-star"></i> ${review.rating}
                    </div>
                </div>
                
                <p class="text-gray-600 dark:text-gray-300 text-sm mt-3 mb-2 leading-relaxed place-card-click cursor-pointer">${review.content}</p>
                
                ${imageHtml}
                
                <div class="flex items-center gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-white/5">
                    <button class="flex items-center gap-2 ${likeColor} text-sm font-bold group" onclick="window.toggleLikeReview(this, ${review.id})">
                        <i class="${(review.liked_by_me == 1) ? 'fa-solid' : 'fa-regular'} fa-heart group-hover:scale-110 transition-transform"></i>
                        <span class="likes-count">${parseInt(review.likes_count) || 0}</span>
                    </button>
                    <button class="flex items-center gap-2 text-gray-400 text-sm font-bold group" onclick="window.openComments(${review.id})">
                        <i class="fa-regular fa-comment-dots group-hover:scale-110 transition-transform"></i>
                        <span>${parseInt(review.comments_count) || 0}</span>
                    </button>
                    <div class="flex gap-4 ml-auto">
                        <button class="flex items-center gap-2 ${review.saved_by_me ? 'text-red-500' : 'text-gray-400'} text-sm font-bold active:text-red-500 group" onclick="window.toggleSaveReview(this, ${review.id})">
                            <i class="${review.saved_by_me ? 'fa-solid' : 'fa-regular'} fa-bookmark group-hover:scale-110 transition-transform"></i>
                        </button>
                        <button class="flex items-center gap-2 text-gray-400 text-sm font-bold active:text-[#ff5500] group" onclick="window.shareReview('${review.place_name.replace(/'/g, "\\'")}', '${review.content.replace(/'/g, "\\'")}', ${review.id})">
                            <i class="fa-solid fa-share-nodes group-hover:scale-110 transition-transform"></i>
                        </button>
                    </div>
                </div>
            `;

            // Add click listener cho Image và Text để mở Place Detail
            const clickAreas = card.querySelectorAll('.place-card-click');
            clickAreas.forEach(area => {
                const imgArg = review.images && review.images.length > 0 ? `${API_URL}/../${review.images[0]}` : '';
                area.addEventListener('click', () => openPlaceDetail({
                    id: review.place_id,
                    name: review.place_name,
                    address: "Đang cập nhật...", // Mock
                    category_id: 1
                }, imgArg, review.rating, review.total_comments));
            });

            feedContainer.appendChild(card);
        });
    }

    // --- Detail Modal ---
    const placeDetailModal = document.getElementById('placeDetailModal');
    const closePlaceDetail = document.getElementById('closePlaceDetail');

    async function openPlaceDetail(placeInput, imgUrl, rating, reviewCount) {
        if (!placeDetailModal) return;

        let place = placeInput;

        try {
            // Fetch real details including coords
            const res = await fetch(`${API_URL}/places.php?action=get_place_detail&id=${placeInput.id}`);
            const data = await res.json();
            if (data && data.id) {
                place = data;
                // update parameters if they were poorly mocked
                rating = data.average_rating || rating;
                reviewCount = data.review_count || reviewCount;
            }
        } catch (e) {
            console.error("Error fetching place detail", e);
        }

        // Hiển thị thông tin cơ bản
        const imageContainer = document.getElementById('detailPlaceImageContainer');
        if (imageContainer) {
            let imagesHtml = '';
            if (place.images && place.images.length > 0) {
                place.images.forEach(img => {
                    const fullUrl = img.startsWith('http') ? img : `${API_URL}/../${img}`;
                    imagesHtml += `<img src="${fullUrl}" class="w-full h-full object-cover flex-shrink-0 snap-center">`;
                });
            } else {
                const imgUrl = place.thumbnail ? (place.thumbnail.startsWith('http') ? place.thumbnail : `${API_URL}/../${place.thumbnail}`) : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=60&w=300';
                imagesHtml = `<img src="${imgUrl}" class="w-full h-full object-cover flex-shrink-0 snap-center">`;
            }
            imageContainer.innerHTML = imagesHtml;
        }
        document.getElementById('detailPlaceName').textContent = place.name;
        const addressEl = document.getElementById('detailPlaceAddress');
        addressEl.querySelector('span').textContent = place.address;
        // Thêm tính năng click để cuộn xuống Map
        addressEl.classList.add('cursor-pointer', 'active:opacity-50', 'transition-opacity');
        addressEl.onclick = () => {
            // Close place detail modal
            document.getElementById('placeDetailModal').classList.add('translate-y-full');
            setTimeout(() => {
                document.getElementById('placeDetailModal').classList.add('hidden');
            }, 300);

            // Switch to Map Tab
            const mapTabBtn = document.querySelector('.nav-btn[data-target="map"]');
            if (mapTabBtn) mapTabBtn.click();

            // Move Map position and zoom
            setTimeout(() => {
                if (window.mapInstance && place.latitude && place.longitude) {
                    window.mapInstance.flyTo({
                        center: [parseFloat(place.longitude), parseFloat(place.latitude)],
                        zoom: 16
                    });
                }
            }, 500);
        };

        // Category label
        const categories = { 1: 'Ăn uống', 2: 'Giải trí', 3: 'Khách sạn', 4: 'Du lịch', 5: 'Khác' };
        document.getElementById('detailPlaceCategory').textContent = place.category_name || categories[place.category_id] || 'Địa điểm';

        document.getElementById('detailPlaceDesc').textContent = place.description || "Chưa có thông tin mô tả chi tiết cho địa điểm này.";

        document.getElementById('detailStatRating').textContent = (rating == null || rating == 0) ? 'Chưa có đánh giá' : parseFloat(rating).toFixed(1);
        document.getElementById('detailStatReviews').textContent = reviewCount || '0';

        // Initialize TrackAsia GL Map
        const mapContainer = document.getElementById('detailPlaceMap');
        if (mapContainer && place.latitude && place.longitude && typeof trackasiagl !== 'undefined') {
            mapContainer.classList.add('relative');
            mapContainer.innerHTML = `
                <div id='detailPlaceMapInner' class='w-full h-full rounded-2xl'></div>
                <div id='detailPlaceMapOverlay' class='absolute inset-0 z-10 cursor-pointer'></div>
            `;
            mapContainer.parentElement.classList.remove('hidden');

            document.getElementById('detailPlaceMapOverlay').onclick = addressEl.onclick; // Trỏ chung hàm chạy map lớn

            const position = [parseFloat(place.longitude), parseFloat(place.latitude)]; // Lng, Lat cho TrackAsia

            setTimeout(() => {
                const detailMap = new trackasiagl.Map({
                    container: 'detailPlaceMapInner',
                    style: 'https://maps.track-asia.com/styles/v2/streets.json?key=0b01772742917cee17029230a2aa2225b1',
                    center: position,
                    zoom: 15,
                    attributionControl: false,
                    interactive: false // Không cho kéo trượt trên modal mini
                });

                const el = document.createElement('div');
                el.innerHTML = `
                    <div style="position: relative; text-align: center; width: 32px; height: 32px; margin-top: -16px;">
                        <i class="fa-solid fa-location-dot text-[#ff5500]" style="font-size: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"></i>
                    </div>
                `;

                new trackasiagl.Marker({ element: el })
                    .setLngLat(position)
                    .addTo(detailMap);

                setTimeout(() => detailMap.resize(), 150);
            }, 50);
        } else if (mapContainer) {
            mapContainer.parentElement.classList.add('hidden');
        }

        // Setup Share Button
        const btnShare = document.getElementById('btnSharePlace');
        if (btnShare) {
            btnShare.onclick = async () => {
                const shareData = {
                    title: `Khám phá ${place.name} trên Kon Tum Local`,
                    text: `Xem ngay thông tin và vị trí của ${place.name} - Kon Tum Local`,
                    url: window.location.origin + window.location.pathname + '?place=' + place.id
                };

                try {
                    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                    } else {
                        // Fallback clipboard
                        await navigator.clipboard.writeText(shareData.url);
                        if (typeof window.showToast === 'function') {
                            window.showToast("Đã copy link địa điểm!", "success");
                        } else {
                            alert("Đã copy link: " + shareData.url);
                        }
                    }
                } catch (err) {
                    console.log('User cancelled share or error:', err);
                }
            };
        }

        // Gắn ID hiện tại vào nút viết review ngay từ trong chi tiết
        const btnWriteReview = document.getElementById('btnWriteReviewFromDetail');
        if (btnWriteReview) {
            btnWriteReview.onclick = () => {
                if (!localStorage.getItem('user_vtkt')) {
                    typeof showToast === 'function' ? showToast("Vui lòng đăng nhập để đánh giá!", "error") : alert("Vui lòng đăng nhập!");
                    return;
                }
                closePlaceDetail.click();
                setTimeout(() => {
                    const reviewModal = document.getElementById('reviewModal');
                    if (reviewModal) {
                        reviewModal.classList.remove('hidden');
                        setTimeout(() => reviewModal.classList.remove('translate-y-full'), 10);
                    }

                    // Hacky cách select địa điểm
                    setTimeout(() => {
                        const select = document.getElementById('reviewPlace');
                        if (select) {
                            if (select.querySelector(`option[value="${place.id}"]`)) {
                                select.value = place.id;
                            } else {
                                const opt = document.createElement('option');
                                opt.value = place.id;
                                opt.textContent = place.name;
                                select.appendChild(opt);
                                select.value = place.id;
                            }
                            // Ẩn dropdown chọn địa điểm
                            select.parentElement.classList.add('hidden');
                            
                            // Tuỳ chỉnh placeholder
                            const reviewContent = document.getElementById('reviewContent');
                            if (reviewContent) {
                                reviewContent.placeholder = `Hãy chia sẻ trải nghiệm của bạn tại ${place.name}... (ít nhất 10 ký tự)`;
                            }
                        }
                    }, 500);
                }, 300);
            }
        }

        // Xử lý nút Save Place
        const btnSavePlace = document.getElementById('btnToggleSavePlace');
        if (btnSavePlace) {
            btnSavePlace.onclick = async () => {
                const user = JSON.parse(localStorage.getItem('user_vtkt'));
                if (!user) return typeof showToast === 'function' ? showToast("Vui lòng đăng nhập!", "error") : alert("Vui lòng đăng nhập!");

                try {
                    const res = await fetch(`${API_URL}/interactions.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'toggle_save', user_id: user.id, place_id: place.id })
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                        if (data.saved) {
                            btnSavePlace.querySelector('i').classList.replace('fa-regular', 'fa-solid');
                            btnSavePlace.classList.add('text-red-500');
                        } else {
                            btnSavePlace.querySelector('i').classList.replace('fa-solid', 'fa-regular');
                            btnSavePlace.classList.remove('text-red-500');
                        }
                        if (typeof showToast === 'function') showToast(data.message, "success");
                    }
                } catch (e) { }
            };
        }

        // Xử lý nút Report Place
        const btnReportPlace = document.getElementById('btnReportPlace');
        if (btnReportPlace) {
            btnReportPlace.onclick = () => {
                if (typeof window.openReportModal === 'function') {
                    window.openReportModal('place', place.id, place.name);
                }
            };
        }

        // Xử lý nút Admin Delete Place và Edit Place
        const btnAdminDeletePlace = document.getElementById('btnAdminDeletePlace');
        const btnAdminEditPlace = document.getElementById('btnAdminEditPlace');

        if (currentUser && currentUser.is_admin == 1) {
            if (btnAdminDeletePlace) {
                btnAdminDeletePlace.classList.remove('hidden');
                btnAdminDeletePlace.classList.add('flex');
                btnAdminDeletePlace.onclick = (e) => {
                    if (e) e.stopPropagation();
                    const confirmMsg = `Xoá địa điểm ${place.name}?`;
                    const executeDelete = () => {
                        const warning = "Nội dung vi phạm quy chuẩn cộng đồng.";
                        fetch(`${API_URL}/admin.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'admin_delete_place', admin_id: currentUser.id, place_id: place.id, warning_message: warning })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (window.showToast) showToast(data.message, data.status);
                                else alert(data.message);
                                if (data.status === 'success') {
                                    document.getElementById('closePlaceDetail').click();
                                    loadHomePlaces(); // reload main feed
                                }
                            });
                    };

                    if (window.showConfirm) {
                        window.showConfirm(confirmMsg, executeDelete);
                    } else {
                        if (confirm(confirmMsg)) executeDelete();
                    }
                };
            }

            if (btnAdminEditPlace) {
                btnAdminEditPlace.classList.remove('hidden');
                btnAdminEditPlace.classList.add('flex');
                btnAdminEditPlace.onclick = () => {
                    document.getElementById('editPlaceId').value = place.id;
                    document.getElementById('editPlaceName').value = place.name;
                    document.getElementById('editPlaceAddress').value = place.address;
                    const catSelect = document.getElementById('editPlaceCategory');
                    if (catSelect) catSelect.value = place.category_id || 1;
                    const descInput = document.getElementById('editPlaceDesc');
                    if (descInput) descInput.value = place.description || '';

                    // Load existing images
                    const container = document.getElementById('editPlaceImagePreviewContainer');
                    if (container) {
                        // Keep only the "upload new" button, remove existing previews
                        const existingPreviews = container.querySelectorAll('.preview-img-wrapper');
                        existingPreviews.forEach(el => el.remove());
                        
                        if (place.image_objects && place.image_objects.length > 0) {
                            place.image_objects.forEach(img => {
                                const div = document.createElement('div');
                                div.className = 'w-24 h-24 flex-shrink-0 relative rounded-2xl overflow-hidden preview-img-wrapper existing-image';
                                div.innerHTML = `
                                    <img src="${img.url.startsWith('http') ? img.url : API_URL + '/../' + img.url}" class="w-full h-full object-cover">
                                    <button class="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                                        onclick="window.deletePlaceImage(${img.id}, this.parentElement)"><i class="fa-solid fa-times"></i></button>`;
                                container.insertBefore(div, container.firstChild);
                            });
                        }
                    }

                    const editModal = document.getElementById('editPlaceModal');
                    if (editModal) {
                        editModal.classList.remove('hidden');
                        setTimeout(() => editModal.classList.remove('translate-y-full'), 10);
                    }
                };
            }
        } else {
            if (btnAdminDeletePlace) {
                btnAdminDeletePlace.classList.add('hidden');
                btnAdminDeletePlace.classList.remove('flex');
            }
            if (btnAdminEditPlace) {
                btnAdminEditPlace.classList.add('hidden');
                btnAdminEditPlace.classList.remove('flex');
            }
        }

        // Fetch reviews cho địa điểm này
        const reviewsContainer = document.getElementById('detailPlaceReviewsList');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic text-center py-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải đánh giá...</p>';

            const currentUserStr = localStorage.getItem('user_vtkt');
            const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
            const userIdParam = currentUser ? `&user_id=${currentUser.id}` : '';

            fetch(`${API_URL}/places.php?action=get_place_reviews&place_id=${place.id}${userIdParam}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        let html = '';
                        data.forEach(r => {
                            const randomBg = r.user_id % 2 === 0 ? 'ff5500' : 'ff8800';
                            const avatarUrl = r.avatar && r.avatar !== 'default_avatar.png' ? r.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullname)}&background=${randomBg}&color=fff&rounded=true&bold=true`;
                            const starHtml = '<i class="fa-solid fa-star text-yellow-400 text-[10px]"></i>'.repeat(r.rating);
                            const unstarHtml = '<i class="fa-regular fa-star text-gray-300 text-[10px]"></i>'.repeat(5 - r.rating);

                            // Nếu có ảnh
                            let imgHtml = '';
                            if (r.images && r.images.length > 0) {
                                imgHtml += '<div class="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 mt-4 select-none">';
                                const imgUrls = r.images.map(img => img.startsWith('http') ? img : `${window.API_URL}/../${img}`);
                                const imgUrlsJson = JSON.stringify(imgUrls).replace(/"/g, '&quot;');

                                imgUrls.forEach((imgUrl, idx) => {
                                    imgHtml += `
                                        <div class="flex-shrink-0 snap-center relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer shadow-sm group" onclick="window.showLightbox(${imgUrlsJson}, ${idx})">
                                            <img src="${imgUrl}" class="w-full h-full object-cover group-active:scale-95 transition-transform">
                                        </div>
                                    `;
                                });
                                imgHtml += '</div>';
                            }
                            const isLiked = (r.liked_by_me == 1) ? 'fa-solid text-red-500' : 'fa-regular text-gray-500';
                            const likesCount = parseInt(r.likes_count) || 0;
                            const commentsCount = parseInt(r.comments_count) || 0;

                            html += `
                                <div class="bg-gray-50 dark:bg-[#2c2c2e] p-4 rounded-2xl relative group">
                                    <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors" onclick="if(window.openReportModal) window.openReportModal('review', ${r.id}, 'đánh giá của ${r.fullname.replace(/'/g, "\\'")}')">
                                        <i class="fa-solid fa-flag text-xs"></i>
                                    </button>
                                    ${currentUser && currentUser.is_admin == 1 ? `
                                    <button class="absolute top-4 right-10 text-gray-300 hover:text-red-500 transition-colors" onclick="window.adminDeleteReview(${r.id}, '${r.place_id}', event)" title="Xoá đánh giá">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>` : ''}
                                    <div class="flex items-center gap-3 mb-2 pr-10">
                                        <img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover">
                                        <div>
                                            <p class="font-bold text-sm leading-none text-gray-900 dark:text-white">${r.fullname}</p>
                                            <div class="flex mt-1">${starHtml}${unstarHtml}</div>
                                            <p class="text-[10px] text-gray-400 mt-1.5">${window.timeAgo ? window.timeAgo(r.created_at) : r.created_at}</p>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 dark:text-gray-300">${r.content}</p>
                                    ${imgHtml}
                                    
                                    <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <button onclick="window.toggleReviewLikeInDetail(${r.id}, this)" class="flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80">
                                            <i class="${isLiked} fa-heart text-base"></i>
                                            <span class="${(r.liked_by_me == 1) ? 'text-red-500' : 'text-gray-500'}">${likesCount}</span>
                                        </button>
                                        <button onclick="window.openReviewComments(${r.id})" class="flex items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-blue-500">
                                            <i class="fa-regular fa-comment text-base"></i>
                                            <span>${commentsCount}</span>
                                        </button>
                                        <div class="flex gap-4 ml-auto">
                                            <button class="flex items-center gap-2 ${r.saved_by_me ? 'text-red-500' : 'text-gray-400'} text-xs font-bold active:text-red-500 group" onclick="window.toggleSaveReview(this, ${r.id})">
                                                <i class="${r.saved_by_me ? 'fa-solid' : 'fa-regular'} fa-bookmark text-base group-hover:scale-110 transition-transform"></i>
                                            </button>
                                            <button class="flex items-center gap-2 text-gray-400 text-xs font-bold active:text-[#ff5500] group" onclick="window.shareReview('${(place.name || '').replace(/'/g, "\\'")}', '${r.content.replace(/'/g, "\\'")}', ${r.id})">
                                                <i class="fa-solid fa-share-nodes text-base group-hover:scale-110 transition-transform"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        reviewsContainer.innerHTML = html;
                    } else {
                        reviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic text-center py-4">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>';
                    }
                })
                .catch(err => {
                    reviewsContainer.innerHTML = '<p class="text-sm text-red-500 italic text-center py-4">Lỗi tải đánh giá.</p>';
                });
        }

        // Hiện modal
        placeDetailModal.classList.remove('hidden');
        setTimeout(() => placeDetailModal.classList.remove('translate-y-full'), 10);
    }

    if (closePlaceDetail) {
        closePlaceDetail.addEventListener('click', () => {
            placeDetailModal.classList.add('translate-y-full');
            setTimeout(() => placeDetailModal.classList.add('hidden'), 300);
        });
    }

    // --- Render Home Categories ---
    const homeCategoryGrid = document.getElementById('homeCategoryGrid');

    async function loadCategories() {
        if (!homeCategoryGrid) return;
        try {
            const res = await fetch(`${API_URL}/places.php?action=get_categories`);
            const categories = await res.json();

            homeCategoryGrid.innerHTML = '';

            // Limit to 7 categories + 1 "More" button
            const displayCats = categories.slice(0, 7);

            const iconMap = {
                'Ăn uống': 'fa-solid fa-utensils',
                'Giải trí': 'fa-solid fa-masks-theater',
                'Khách sạn': 'fa-solid fa-bed',
                'Du lịch': 'fa-solid fa-umbrella-beach',
                'Khác': 'fa-solid fa-border-all',
                'Check-in': 'fa-solid fa-camera',
                'Đặc sản': 'fa-solid fa-bowl-food'
            };

            displayCats.forEach(cat => {
                const finalIcon = iconMap[cat.name] || cat.icon || 'fa-solid fa-tag';
                const el = document.createElement('div');
                el.className = 'flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95';
                el.onclick = () => window.openCategoryPlacesModal(cat.id, cat.name);
                el.innerHTML = `
                    <div class="w-14 h-14 bg-[#fff5f0] dark:bg-[#2c1a12] rounded-2xl flex items-center justify-center text-[#ff5500] border border-[#ffe0d1] dark:border-[#4d2614] shadow-sm">
                        <i class="${finalIcon} text-xl"></i>
                    </div>
                    <span class="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center line-clamp-1">${cat.name}</span>
                `;
                homeCategoryGrid.appendChild(el);
            });

            // Add "Gần đây" button
            const nearbyBtn = document.createElement('div');
            nearbyBtn.className = 'flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95';
            nearbyBtn.onclick = () => {
                if (window.loadNearbyPlaces) {
                    window.loadNearbyPlaces();
                } else {
                    if (typeof showToast === 'function') showToast("Đang phát triển chức năng Gần Đây");
                }
            };
            nearbyBtn.innerHTML = `
                <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-800 shadow-sm">
                    <i class="fa-solid fa-location-crosshairs text-xl"></i>
                </div>
                <span class="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center">Gần bạn</span>
            `;
            homeCategoryGrid.appendChild(nearbyBtn);

        } catch (err) {
            console.error("Gặp lỗi tải danh mục:", err);
        }
    }

    // --- Render Home Places ---
    const homePlacesList = document.getElementById('homePlacesList');
    const homeNewPlacesList = document.getElementById('homeNewPlacesList');
    const homeSuggestedPlacesList = document.getElementById('homeSuggestedPlacesList');

    async function loadHomePlaces() {
        try {
            // Load Featured (default sort)
            if (homePlacesList) {
                fetch(`${API_URL}/places.php?action=get_places&limit=5`)
                    .then(res => res.json())
                    .then(data => renderHorizontalPlaces(homePlacesList, data));
            }

            // Load New Places (sort=new, limited)
            if (homeNewPlacesList) {
                fetch(`${API_URL}/places.php?action=get_places&sort=new&limit=5`)
                    .then(res => res.json())
                    .then(data => renderHorizontalPlaces(homeNewPlacesList, data));
            }

            // Load Suggested/Top Rated (sort=top_rated, limited)
            if (homeSuggestedPlacesList) {
                fetch(`${API_URL}/places.php?action=get_places&sort=top_rated&limit=5`)
                    .then(res => res.json())
                    .then(data => renderHorizontalPlaces(homeSuggestedPlacesList, data));
            }

        } catch (err) {
            console.error("Gặp lỗi tải home places:", err);
        }
    }

    function renderHorizontalPlaces(container, data) {
        let places = [];
        if (Array.isArray(data)) places = data;
        else if (data.status === 'success') places = data.data;

        container.innerHTML = '';
        if (places.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 px-4">Chưa có dữ liệu</p>';
            return;
        }

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'snap-start w-40 flex-shrink-0 space-y-2 cursor-pointer active:scale-[0.98] transition-transform';

            // IMPORTANT FIX: Use place.thumbnail instead of place.image_url. If raw URL is present, prepend API relative path.
            let imgUrl = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400';
            if (place.thumbnail && place.thumbnail !== 'default_place.jpg') {
                imgUrl = place.thumbnail.startsWith('http') ? place.thumbnail : `${API_URL}/../${place.thumbnail}`;
            }

            const rating = Number(place.average_rating || 0).toFixed(1);
            const reviewCount = Number(place.review_count || 0);

            card.innerHTML = `
                <div class="aspect-square bg-gray-200 rounded-3xl overflow-hidden relative shadow-md">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                    <div class="absolute top-3 right-3 bg-white/90 text-gray-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <i class="fa-solid fa-star text-yellow-500"></i> ${rating > 0 ? rating : 'Mới'}
                    </div>
                </div>
                <p class="text-[10px] font-bold text-[#ff5500] uppercase mt-3 line-clamp-1">${place.category_name || 'Khám phá'}</p>
                <h4 class="font-bold text-[15px] line-clamp-1">${place.name}</h4>
                <p class="text-[11px] text-gray-500 line-clamp-1"><i class="fa-solid fa-location-dot"></i> ${place.address}</p>
            `;

            card.addEventListener('click', () => {
                openPlaceDetail(place, imgUrl, rating, reviewCount);
            });

            container.appendChild(card);
        });
    }

    // --- Render Hero Banners ---
    const heroBannerImages = document.getElementById('heroBannerImages');
    const heroBannerIndicators = document.getElementById('heroBannerIndicators');
    let bannerInterval;
    let currentBannerIndex = 0;

    async function loadBanners() {
        if (!heroBannerImages || !heroBannerIndicators) return;
        try {
            const res = await fetch(`${API_URL}/places.php?action=get_active_banners&t=${Date.now()}`);
            const banners = await res.json();

            if (banners.length > 0) {
                heroBannerImages.innerHTML = '';
                heroBannerIndicators.innerHTML = '';

                // Allow swiping container
                const containerParent = heroBannerImages.parentElement;
                containerParent.style.overflowX = 'auto';
                containerParent.style.scrollSnapType = 'x mandatory';
                containerParent.style.scrollbarWidth = 'none';
                containerParent.style.msOverflowStyle = 'none';

                // Important: Need to hide scrollbar for webkit (Chrome/Safari) via code if css class not present
                if (!containerParent.classList.contains('scrollbar-hide')) {
                    containerParent.classList.add('scrollbar-hide');
                }

                heroBannerImages.style.display = 'flex';
                heroBannerImages.style.width = 'max-content';
                heroBannerImages.style.height = '100%';

                banners.forEach((banner, idx) => {
                    // Image container for snap
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'h-full flex-shrink-0 snap-center relative';
                    // We need the width of the container to match the parent
                    imgContainer.style.width = containerParent.clientWidth + 'px';

                    const imgUrl = banner.image_url.startsWith('http') ? banner.image_url : `${API_URL}/../${banner.image_url}`;

                    imgContainer.innerHTML = `
                        <img src="${imgUrl}" class="w-full h-full object-cover">
                        ${(banner.title || banner.subtitle) ? `
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                                ${banner.title ? `<h3 class="text-white font-bold text-lg leading-tight line-clamp-2 shadow-sm">${banner.title}</h3>` : ''}
                                ${banner.subtitle ? `<p class="text-white/80 text-sm mt-1 line-clamp-2">${banner.subtitle}</p>` : ''}
                            </div>
                        ` : ''}
                    `;

                    heroBannerImages.appendChild(imgContainer);

                    // Indicator
                    const dot = document.createElement('div');
                    dot.className = `h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`;
                    heroBannerIndicators.appendChild(dot);
                });

                // Handle resize
                window.addEventListener('resize', () => {
                    const containers = heroBannerImages.querySelectorAll('.flex-shrink-0');
                    containers.forEach(c => c.style.width = containerParent.clientWidth + 'px');
                });

                // Handle scroll/swipe to update indicators
                containerParent.addEventListener('scroll', () => {
                    const scrollLeft = containerParent.scrollLeft;
                    const items = heroBannerImages.querySelectorAll('.flex-shrink-0');
                    if (items.length > 0) {
                        const itemWidth = items[0].clientWidth;
                        currentBannerIndex = Math.round(scrollLeft / itemWidth);

                        // Update dots
                        const dots = heroBannerIndicators.children;
                        for (let i = 0; i < dots.length; i++) {
                            if (i === currentBannerIndex) {
                                dots[i].className = 'h-1.5 rounded-full transition-all duration-300 w-4 bg-white';
                            } else {
                                dots[i].className = 'h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/50';
                            }
                        }
                    }
                });

                // Auto play
                if (banners.length > 1) {
                    bannerInterval = setInterval(() => {
                        const items = heroBannerImages.querySelectorAll('.flex-shrink-0');
                        if (items.length > 0) {
                            currentBannerIndex = (currentBannerIndex + 1) % items.length;
                            containerParent.scrollTo({
                                left: currentBannerIndex * items[0].clientWidth,
                                behavior: 'smooth'
                            });
                        }
                    }, 3500);

                    // Pause on touch to let user swipe freely
                    containerParent.addEventListener('touchstart', () => clearInterval(bannerInterval), { passive: true });
                }
            }
        } catch (err) {
            console.error('Error loadBanners', err);
        }
    }

    // Expose to global window
    window.openPlaceDetail = openPlaceDetail;

    // Init
    loadFeed();
    loadCategories();
    loadHomePlaces();
    loadBanners();
});

// --- Global Context for Inline OnClick ---
window.toggleFollowUser = async function (btn, authorId) {
    const user = JSON.parse(localStorage.getItem('user_vtkt'));
    if (!user) {
        if (typeof showToast === 'function') showToast("Vui lòng đăng nhập!", "error");
        else alert("Vui lòng đăng nhập!");
        return;
    }

    if (user.id == authorId) {
        if (typeof showToast === 'function') showToast("Bạn không thể follow chính mình!", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/interactions.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_follow', follower_id: user.id, followed_id: authorId })
        });
        const data = await res.json();

        if (data.status === 'success') {
            if (data.following) {
                btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Following';
                btn.classList.add('bg-gray-100', 'text-gray-500');
                btn.classList.remove('bg-[#fff5f0]', 'text-[#ff5500]');
            } else {
                btn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i>Follow';
                btn.classList.remove('bg-gray-100', 'text-gray-500');
                btn.classList.add('bg-[#fff5f0]', 'text-[#ff5500]');
            }
            if (typeof showToast === 'function') showToast(data.message, "success");
        }
    } catch (e) {
        console.error(e);
    }
};


window.shareReview = async function (placeName, content, reviewId) {
    const shareData = {
        title: `Đánh giá về ${placeName}`,
        text: `Đọc bài đánh giá mới nhất về ${placeName} trên KonTum Explore! "${content.substring(0, 50)}..."`,
        url: `${window.location.origin}?review_id=${reviewId}`
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            if (typeof showToast === 'function') showToast("Đã chia sẻ thành công!", "success");
        } else {
            await navigator.clipboard.writeText(shareData.url);
            if (typeof showToast === 'function') showToast("Đã copy link bài viết!", "success");
        }
    } catch (e) { }
};

// --- Comment UI Logic ---
const commentsModal = document.getElementById('commentsModal');
const closeCommentsModal = document.getElementById('closeCommentsModal');
const commentsList = document.getElementById('commentsList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentReviewId = document.getElementById('commentReviewId');

if (closeCommentsModal) {
    closeCommentsModal.addEventListener('click', () => {
        const inner = commentsModal.querySelector('div');
        inner.classList.add('translate-y-full');
        setTimeout(() => commentsModal.classList.add('hidden'), 300);
    });
}

window.openComments = async function (reviewId) {
    if (!commentsModal) return;
    commentReviewId.value = reviewId;

    // Gán avatar user hiện tại
    const user = JSON.parse(localStorage.getItem('user_vtkt'));
    if (user && document.getElementById('commentUserAvatar')) {
        document.getElementById('commentUserAvatar').innerHTML = `<img src="${(user.avatar && user.avatar !== 'default_avatar.png') ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=random`}" class="w-full h-full object-cover">`;
    }

    commentsModal.classList.remove('hidden');
    setTimeout(() => {
        commentsModal.querySelector('div').classList.remove('translate-y-full');
    }, 10);

    await loadComments(reviewId);
};

async function loadComments(reviewId) {
    commentsList.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary"></i></div>';
    try {
        const res = await fetch(`${API_URL}/interactions.php?action=get_comments&review_id=${reviewId}`);
        const comments = await res.json();

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-regular fa-comments text-4xl mb-3"></i>
                    <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>`;
            return;
        }

        commentsList.innerHTML = '';
        comments.forEach(c => {
            const el = document.createElement('div');
            el.className = 'flex gap-3 items-start mb-4';
            el.innerHTML = `
                <img src="${(c.avatar && c.avatar !== 'default_avatar.png') ? c.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.fullname)}&background=random`}" class="w-8 h-8 rounded-full object-cover shadow-sm bg-gray-200 flex-shrink-0">
                <div class="flex-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none">
                            <h5 class="font-bold text-xs text-gray-800 dark:text-gray-300 mb-1 flex justify-between items-center">
                                ${c.fullname}
                                <span class="font-normal text-[10px] text-gray-400">${window.timeAgo(c.created_at)}</span>
                            </h5>
                    <p class="text-sm text-gray-700 dark:text-gray-200">${c.content}</p>
                </div>
            `;
            commentsList.appendChild(el);
        });

        // Scroll to bottom
        setTimeout(() => commentsList.scrollTop = commentsList.scrollHeight, 100);
    } catch (e) {
        commentsList.innerHTML = '<p class="text-center text-red-500">Lỗi tải bình luận</p>';
    }
}

window.openReviewComments = function (reviewId) {
    if (typeof window.openComments === 'function') {
        window.openComments(reviewId);
    }
};

window.toggleReviewLikeInDetail = function (reviewId, btnEl) {
    if (typeof window.toggleLikeReview === 'function') {
        window.toggleLikeReview(btnEl, reviewId);
    }
};

if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return typeof showToast === 'function' ? showToast("Vui lòng đăng nhập!", "error") : alert("Vui lòng đăng nhập!");

        const reviewId = commentReviewId.value;
        const content = commentInput.value.trim();
        if (!content) return;

        const btn = commentForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/interactions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_comment', user_id: user.id, review_id: reviewId, content: content })
            });
            const data = await res.json();
            if (data.status === 'success') {
                commentInput.value = '';
                await loadComments(reviewId);
            }
        } catch (e) { }
        finally {
            btn.disabled = false;
        }
    });
}

// --- Global Functions ---
window.toggleLikeReview = async (btn, reviewId) => {
    const user = JSON.parse(localStorage.getItem('user_vtkt'));
    if (!user) {
        if (typeof showToast === 'function') showToast("Vui lòng đăng nhập để thả tim!", "error");
        else alert("Vui lòng đăng nhập!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/interactions.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_like', user_id: user.id, review_id: reviewId })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            let count = parseInt(span.textContent);

            if (data.liked) {
                icon.classList.replace('fa-regular', 'fa-solid');
                btn.classList.add('text-[#ff5500]');
                btn.classList.remove('text-gray-400');
                count++;
            } else {
                icon.classList.replace('fa-solid', 'fa-regular');
                btn.classList.remove('text-[#ff5500]');
                btn.classList.add('text-gray-400');
                count--;
            }
            span.textContent = count;
        }
    } catch (e) { console.error(e); }
};

window.toggleSaveReview = async (btn, reviewId) => {
    const user = JSON.parse(localStorage.getItem('user_vtkt'));
    if (!user) {
        if (typeof showToast === 'function') showToast("Vui lòng đăng nhập để lưu!", "error");
        else alert("Vui lòng đăng nhập!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/interactions.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_save', user_id: user.id, entity_type: 'review', entity_id: reviewId })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const icon = btn.querySelector('i');
            if (data.saved) {
                icon.classList.replace('fa-regular', 'fa-solid');
                btn.classList.add('text-red-500');
                btn.classList.remove('text-gray-400');
            } else {
                icon.classList.replace('fa-solid', 'fa-regular');
                btn.classList.remove('text-red-500');
                btn.classList.add('text-gray-400');
            }
            if (typeof showToast === 'function') showToast(data.message, "success");
        }
    } catch (e) { console.error(e); }
};

window.showLightbox = function (images, initialIndex = 0) {
    // Basic fallback if missing lightbox modal dom
    let lightbox = document.getElementById('imageLightboxModal');
    let lightboxImg = document.getElementById('lightboxMainImage');

    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightboxModal';
        lightbox.className = 'fixed inset-0 z-[9999] bg-black/95 hidden flex flex-col transition-opacity duration-300 opacity-0';
        lightbox.innerHTML = `
            <div class="absolute top-0 inset-x-0 p-4 flex justify-end z-10">
                <button id="closeLightboxBtn" class="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            <div class="flex-1 flex items-center justify-center relative touch-pan-y" id="lightboxTouchArea">
                <img id="lightboxMainImage" src="" class="max-w-full max-h-full object-contain transition-transform duration-300">
                
                <button id="lightboxPrevBtn" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full items-center justify-center backdrop-blur-md hidden text-xl hover:bg-white/20 transition">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button id="lightboxNextBtn" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full items-center justify-center backdrop-blur-md hidden text-xl hover:bg-white/20 transition">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div class="p-4 text-center text-white/50 text-sm font-medium" id="lightboxCounter">1 / 1</div>
        `;
        document.body.appendChild(lightbox);
    }

    lightboxImg = document.getElementById('lightboxMainImage');
    const counter = document.getElementById('lightboxCounter');
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');

    // Update global variables for closures
    let currentIndex = initialIndex;

    function updateImage() {
        lightboxImg.style.opacity = '0';
        lightboxImg.style.transform = 'scale(0.95)';

        setTimeout(() => {
            lightboxImg.src = images[currentIndex];
            lightboxImg.style.opacity = '1';
            lightboxImg.style.transform = 'scale(1)';
            counter.textContent = `${currentIndex + 1} / ${images.length}`;

            if (images.length > 1) {
                prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
                nextBtn.style.display = currentIndex < images.length - 1 ? 'flex' : 'none';
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }, 150);
    }

    // Re-bind events every time so they catch the new images array
    document.getElementById('closeLightboxBtn').onclick = () => {
        lightbox.classList.remove('opacity-100');
        setTimeout(() => lightbox.classList.add('hidden'), 300);
    };

    prevBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            currentIndex--;
            updateImage();
        }
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentIndex < images.length - 1) {
            currentIndex++;
            updateImage();
        }
    };

    document.getElementById('imageLightboxModal').onclick = (e) => {
        if (e.target === document.getElementById('imageLightboxModal') || e.target === document.getElementById('lightboxTouchArea')) {
            document.getElementById('closeLightboxBtn').click();
        }
    };

    // Add touch swipe for mobile
    const touchArea = document.getElementById('lightboxTouchArea');
    let touchStartX = 0;
    let touchEndX = 0;

    touchArea.ontouchstart = e => touchStartX = e.changedTouches[0].screenX;
    touchArea.ontouchend = e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50 && currentIndex < images.length - 1) { // Swipe Left
            currentIndex++;
            updateImage();
        }
        if (touchEndX - touchStartX > 50 && currentIndex > 0) { // Swipe Right
            currentIndex--;
            updateImage();
        }
    };

    // Reset display
    updateImage();

    // Open Animation
    lightbox.classList.remove('hidden');
    // Force layout calculation
    void lightbox.offsetWidth;
    lightbox.classList.add('opacity-100');
};

// --- Category Places Modal Logic ---
window.openCategoryPlacesModal = function (categoryId, categoryName) {
    const modal = document.getElementById('categoryPlacesModal');
    const title = document.getElementById('categoryPlacesTitle');
    const list = document.getElementById('categoryPlacesList');

    if (!modal || !list) return;

    title.textContent = categoryName;
    list.innerHTML = '<div class="flex h-40 items-center justify-center text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.translate-y-full')?.classList.remove('translate-y-full');
    }, 10);

    let apiUrl = `${API_URL}/places.php?action=get_places`;
    if (categoryId) apiUrl += `&category_id=${categoryId}`;

    fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                list.innerHTML = '<div class="flex flex-col items-center justify-center h-48 text-gray-400"><i class="fa-solid fa-box-open text-3xl mb-2"></i><p>Chưa có địa điểm</p></div>';
                return;
            }

            let html = '<div class="grid grid-cols-2 gap-3 pb-8">';
            data.forEach(place => {
                const img = (place.images && place.images.length > 0) ? `${API_URL}/../${place.images[0]}` : 'https://placehold.co/400x300?text=No+Image';
                html += `
                    <div class="bg-white dark:bg-darkCard rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-95 transition-transform cursor-pointer border border-gray-100 dark:border-gray-800" onclick="window.openPlaceDetail({id: ${place.id}})">
                        <div class="h-32 w-full relative">
                            <img src="${img}" class="w-full h-full object-cover">
                            <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1">
                                <i class="fa-solid fa-star text-yellow-400 text-[10px]"></i>
                                <span class="text-white text-xs font-bold">${parseFloat(place.average_rating || 0).toFixed(1)}</span>
                            </div>
                        </div>
                        <div class="p-3 flex-1 flex flex-col">
                            <h3 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 mb-1">${place.name}</h3>
                            <p class="text-xs text-gray-500 line-clamp-1 mt-auto"><i class="fa-solid fa-location-dot mr-1"></i>${place.address}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            list.innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            list.innerHTML = '<p class="text-red-500 text-center py-4">Lỗi kết nối máy chủ</p>';
        });
};

document.getElementById('closeCategoryPlacesModal')?.addEventListener('click', () => {
    const modal = document.getElementById('categoryPlacesModal');
    const inner = modal.querySelector('div');
    inner.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
});

// --- Search Bar Logic ---
const searchInput = document.getElementById('mainSearchInput');
const suggestionsList = document.getElementById('searchSuggestionsList');
let searchTimeout = null;

if (searchInput && suggestionsList) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            suggestionsList.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                // Sử dụng API Backend Native Search thay vì Get_Places Local Filter
                const res = await fetch(`${API_URL}/places.php?action=search&q=${encodeURIComponent(query)}`);
                const places = await res.json();

                // Khử trùng lặp từ Database nếu có
                const uniquePlaces = [];
                const seenKeys = new Set();
                places.forEach(p => {
                    const key = p.name.trim().toLowerCase(); // Dùng tên làm key để gộp triệt để
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        uniquePlaces.push(p);
                    }
                });

                const filtered = uniquePlaces;

                if (filtered.length === 0) {
                    suggestionsList.innerHTML = '<div class="p-4 text-center text-sm text-gray-500">Không tìm thấy kết quả nào cho "' + query + '"</div>';
                } else {
                    let html = '';
                    filtered.forEach(p => {
                        let img = 'https://placehold.co/100x100?text=KT';
                        if (p.thumbnail && p.thumbnail !== 'default_place.jpg') {
                            img = p.thumbnail.startsWith('http') ? p.thumbnail : `${window.API_URL}/../${p.thumbnail}`;
                        }
                        const iconCat = p.icon || 'fa-solid fa-map-location';
                        html += `
                            <div class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800/50 first:rounded-t-2xl last:rounded-b-2xl" onclick="document.getElementById('searchSuggestionsList').classList.add('hidden'); window.openPlaceDetail({id: ${p.id}});">
                                <img src="${img}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">${p.name}</h4>
                                    <p class="text-xs text-gray-500 line-clamp-1">${p.address || ''}</p>
                                </div>
                                <div class="bg-gray-100 dark:bg-gray-800 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 text-xs">
                                    <i class="fa-solid fa-chevron-right"></i>
                                </div>
                            </div>
                        `;
                    });
                    suggestionsList.innerHTML = html;
                }
                suggestionsList.classList.remove('hidden');
            } catch (err) {
                console.error(err);
            }
        }, 400); // 400ms debounce
    });

    // Close suggestions when click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
}

// --- Gần Đây (Nearby) ---
window.loadNearbyPlaces = function () {
    if (!navigator.geolocation) {
        if (typeof showToast === 'function') showToast('Trình duyệt không hỗ trợ Vị trí.', 'error');
        return;
    }
    if (typeof showToast === 'function') showToast('Đang định vị...', 'info');

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat1 = pos.coords.latitude;
        const lon1 = pos.coords.longitude;
        try {
            const res = await fetch(`${API_URL}/places.php?action=get_places`);
            let places = await res.json();

            // Haversine formula
            const R = 6371; // km
            places.forEach(p => {
                if (p.latitude && p.longitude) {
                    const dLat = (p.latitude - lat1) * Math.PI / 180;
                    const dLon = (p.longitude - lon1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    p.distance = R * c;
                } else {
                    p.distance = 99999;
                }
            });
            places.sort((a, b) => a.distance - b.distance);

            const modal = document.getElementById('categoryPlacesModal');
            const title = document.getElementById('categoryPlacesTitle');
            const list = document.getElementById('categoryPlacesList');

            if (modal && title && list) {
                title.textContent = "Địa điểm Gần bạn";
                list.innerHTML = '';

                places.slice(0, 15).forEach(p => {
                    const el = document.createElement('div');
                    el.className = 'flex items-center gap-4 bg-white dark:bg-[#1c1c1e] p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-[#2c2c2e] cursor-pointer';
                    let img = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200';
                    if (p.thumbnail && p.thumbnail !== 'default_place.jpg') {
                        img = p.thumbnail.startsWith('http') ? p.thumbnail : `${API_URL}/../${p.thumbnail}`;
                    }
                    el.innerHTML = `
                        <img src="${img}" class="w-16 h-16 rounded-2xl object-cover">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-[15px] truncate">${p.name}</h4>
                            <p class="text-xs text-gray-500 truncate mt-1"><i class="fa-solid fa-location-dot"></i> ${p.address}</p>
                            ${p.distance < 99999 ? `<p class="text-[10px] font-bold text-blue-500 mt-1"><i class="fa-solid fa-location-arrow"></i> Cách ${(p.distance).toFixed(1)} km</p>` : ''}
                        </div>
                    `;
                    el.onclick = () => window.openPlaceDetail(p, img, Number(p.average_rating || 0).toFixed(1), p.review_count || 0);
                    list.appendChild(el);
                });

                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.remove('translate-y-full'), 10);
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('Lỗi tải dữ liệu.', 'error');
        }

    }, () => {
        if (typeof showToast === 'function') showToast('Cần cấp quyền Vị trí để xem Gần Bạn.', 'error');
    });
};

// --- Admin Delete Review API ---
window.adminDeleteReview = function (reviewId, placeId, e) {
    if (e) e.stopPropagation();

    const userStr = localStorage.getItem('user_vtkt');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    if (user.is_admin != 1) return;

    const btn = e ? e.currentTarget : (window.event ? window.event.currentTarget : null);

    const confirmMsg = "Bạn có chắc chắn muốn xoá bài đánh giá này?";
    const executeDelete = () => {
        const warning = "Bài viết vi phạm chuẩn mực cộng đồng.";
        fetch(`${window.API_URL || '/api'}/admin.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_delete_review', admin_id: user.id, review_id: reviewId, warning_message: warning })
        })
            .then(res => res.json())
            .then(data => {
                if (window.showToast) showToast(data.message, data.status);
                else alert(data.message);
                if (data.status === 'success') {
                    if (typeof window.openPlaceDetail === 'function') {
                        if (typeof loadHomePlaces === 'function') setTimeout(loadHomePlaces, 500);
                        if (btn) btn.closest('.group').remove();
                    }
                }
            });
    };

    if (window.showConfirm) {
        window.showConfirm(confirmMsg, executeDelete);
    } else {
        if (confirm(confirmMsg)) executeDelete();
    }
};

window.deletePlaceImage = function(imageId, element) {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này?')) return;
    const userStr = localStorage.getItem('user_vtkt');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    fetch(`${window.API_URL || '/api'}/admin.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_delete_place_image', admin_id: user.id, image_id: imageId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (element) element.remove();
        } else {
            if (window.showToast) showToast(data.message, 'error');
            else alert(data.message);
        }
    });
};

// Logic Edit Place Admin Submit
document.addEventListener('DOMContentLoaded', () => {
    const closeEditPlaceModal = document.getElementById('closeEditPlaceModal');
    const editPlaceModal = document.getElementById('editPlaceModal');
    const submitEditPlaceBtn = document.getElementById('submitEditPlaceBtn');
    
    // IMAGE UPLOAD LOGIC
    const editPlaceImageInput = document.getElementById('editPlaceImageInput');
    const editPlaceImagePreviewContainer = document.getElementById('editPlaceImagePreviewContainer');
    let currentEditPlaceImages = []; // Store files to upload

    if (editPlaceImageInput) {
        editPlaceImageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                if (!editPlaceImagePreviewContainer) return;
                
                // Clear the non-existing previews
                const existingPreviews = editPlaceImagePreviewContainer.querySelectorAll('.preview-img-wrapper:not(.existing-image)');
                existingPreviews.forEach(el => el.remove());
                currentEditPlaceImages = files;
                
                files.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const div = document.createElement('div');
                        div.className = 'w-24 h-24 flex-shrink-0 relative rounded-2xl overflow-hidden preview-img-wrapper new-image';
                        div.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">
                                         <button type="button" class="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                                            onclick="this.parentElement.remove(); window.removeEditPlaceImage(${index});"><i class="fa-solid fa-times"></i></button>`;
                        editPlaceImagePreviewContainer.appendChild(div);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    window.removeEditPlaceImage = function(index) {
        currentEditPlaceImages.splice(index, 1);
        if (currentEditPlaceImages.length === 0 && editPlaceImageInput) {
            editPlaceImageInput.value = '';
        }
    };

    if (closeEditPlaceModal && editPlaceModal) {
        closeEditPlaceModal.addEventListener('click', () => {
            editPlaceModal.classList.add('translate-y-full');
            setTimeout(() => editPlaceModal.classList.add('hidden'), 300);
            
            // Clear image input when closing if needed
            if(editPlaceImageInput) editPlaceImageInput.value = '';
            const existingPreviews = editPlaceImagePreviewContainer?.querySelectorAll('.preview-img-wrapper');
            if(existingPreviews) existingPreviews.forEach(el => el.remove());
            currentEditPlaceImage = null;
        });
    }

    if (submitEditPlaceBtn) {
        submitEditPlaceBtn.addEventListener('click', () => {
            const placeId = document.getElementById('editPlaceId').value;
            const name = document.getElementById('editPlaceName').value.trim();
            const address = document.getElementById('editPlaceAddress').value.trim();
            const category_id = document.getElementById('editPlaceCategory').value;
            const description = document.getElementById('editPlaceDesc').value.trim();

            if (!name || !address) {
                if (window.showToast) showToast("Vui lòng điền tên và địa chỉ", "error");
                else alert("Điền thiếu thông tin");
                return;
            }

            const pbBtn = submitEditPlaceBtn.innerHTML;
            submitEditPlaceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            const closeModalSuccess = () => {
                editPlaceModal.classList.add('translate-y-full');
                setTimeout(() => editPlaceModal.classList.add('hidden'), 300);
                
                // Reset image selection
                if(editPlaceImageInput) editPlaceImageInput.value = '';
                const existingPreviews = editPlaceImagePreviewContainer?.querySelectorAll('.preview-img-wrapper');
                if(existingPreviews) existingPreviews.forEach(el => el.remove());
                currentEditPlaceImages = [];

                if (document.getElementById('closePlaceDetail')) {
                    document.getElementById('closePlaceDetail').click();
                }
                if (typeof loadHomePlaces === 'function') loadHomePlaces();
            };

            const performEditRequest = () => {
                const payload = {
                    action: 'admin_edit_place',
                    place_id: placeId,
                    name, address, category_id, description
                };
                
                fetch(`${window.API_URL || '/api'}/admin.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            // Now upload images if any
                            if (currentEditPlaceImages && currentEditPlaceImages.length > 0) {
                                let uploadedCount = 0;
                                let hasError = false;
                                
                                const uploadPromises = currentEditPlaceImages.map(file => {
                                    const formData = new FormData();
                                    formData.append('place_id', placeId);
                                    formData.append('thumbnail', file);
                                    const userStr = localStorage.getItem('user_vtkt');
                                    if(userStr) formData.append('admin_id', JSON.parse(userStr).id);
                                    
                                    return fetch(`${window.API_URL || '/api'}/upload_place_image.php`, {
                                        method: 'POST',
                                        body: formData
                                    }).then(r => r.json());
                                });

                                Promise.all(uploadPromises).then(results => {
                                    submitEditPlaceBtn.innerHTML = pbBtn;
                                    if (window.showToast) showToast('Cập nhật địa điểm và ảnh thành công', 'success');
                                    else alert('Cập nhật thành công');
                                    closeModalSuccess();
                                }).catch(err => {
                                    submitEditPlaceBtn.innerHTML = pbBtn;
                                    console.error(err);
                                    if (window.showToast) showToast('Cập nhật địa điểm thành công nhưng có lỗi khi tải ảnh', 'error');
                                    closeModalSuccess();
                                });
                            } else {
                                submitEditPlaceBtn.innerHTML = pbBtn;
                                if (window.showToast) showToast(data.message, data.status);
                                else alert(data.message);
                                closeModalSuccess();
                            }
                        } else {
                            submitEditPlaceBtn.innerHTML = pbBtn;
                            if (window.showToast) showToast(data.message, data.status);
                            else alert(data.message);
                        }
                    })
                    .catch(err => {
                        submitEditPlaceBtn.innerHTML = pbBtn;
                        console.error(err);
                    });
            };

            performEditRequest();
        });
    }
});
