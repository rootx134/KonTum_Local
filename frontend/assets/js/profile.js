document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.API_URL || '/api';
    
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditProfileModal = document.getElementById('closeEditProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');

    const btnOpenSavedPlaces = document.getElementById('btnOpenSavedPlaces');
    const savedPlacesModal = document.getElementById('savedPlacesModal');
    const closeSavedPlacesModal = document.getElementById('closeSavedPlacesModal');
    const darkModeSwitch = document.getElementById('darkModeSwitch');

    // Notifications elements
    const btnOpenNotifications = document.getElementById('btnOpenNotifications');
    const notificationsModal = document.getElementById('notificationsModal');
    const closeNotificationsModal = document.getElementById('closeNotificationsModal');
    const notifBadge = document.getElementById('notifBadge');

    const modalInner = editProfileModal ? editProfileModal.querySelector('div') : null;
    const savedInner = savedPlacesModal ? savedPlacesModal.querySelector('div') : null;
    const notifInner = notificationsModal ? notificationsModal.querySelector('div') : null;

    // --- 1. Lắng nghe Dark Mode đổi trạng thái ---
    if (darkModeSwitch) {
        // Init state from localstorage
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (user && user.dark_mode == 1) {
            darkModeSwitch.checked = true;
            document.documentElement.classList.add('dark');
        }

        darkModeSwitch.addEventListener('change', async (e) => {
            const isDark = e.target.checked;
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');

            if (user) {
                user.dark_mode = isDark ? 1 : 0;
                localStorage.setItem('user_vtkt', JSON.stringify(user));

                // Gửi API cập nhật Preference
                try {
                    await fetch('/api/auth.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'update_settings', user_id: user.id, dark_mode: isDark })
                    });
                } catch (e) { console.error('Lỗi khi lưu cài đặt chế độ tối', e); }
            }
        });
    }

    // --- 2. Edit Profile Modal ---
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user) return showToast("Vui lòng đăng nhập", "error");

            // Fill data
            document.getElementById('editFullname').value = user.fullname || '';
            document.getElementById('editPhone').value = user.phone || '';

            editProfileModal.classList.remove('hidden');
            setTimeout(() => modalInner.classList.remove('translate-y-full'), 10);
        });
    }

    if (closeEditProfileModal) {
        closeEditProfileModal.addEventListener('click', () => {
            modalInner.classList.add('translate-y-full');
            setTimeout(() => editProfileModal.classList.add('hidden'), 300);
        });
    }

    // Process Profile Info update
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            const fullname = document.getElementById('editFullname').value.trim();
            const phone = document.getElementById('editPhone').value.trim();
            const btn = document.getElementById('btnSubmitEditProfile');

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                const res = await fetch('/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', user_id: user.id, fullname, phone, avatar: user.avatar })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast(data.message, "success");
                    user.fullname = fullname;
                    user.phone = phone;
                    localStorage.setItem('user_vtkt', JSON.stringify(user));

                    if (document.getElementById('userNameProfile')) {
                        document.getElementById('userNameProfile').textContent = fullname;
                    }
                    closeEditProfileModal.click();
                } else {
                    showToast(data.message, "error");
                }
            } catch (e) {
                showToast("Lỗi máy chủ", "error");
            } finally {
                btn.disabled = false;
            }
        });
    }

    // --- 2b. Avatar Upload Handle ---
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user) return showToast("Vui lòng đăng nhập", "error");

            const formData = new FormData();
            formData.append('images[]', file);

            try {
                // Upload ảnh qua upload.php
                const upRes = await fetch('/api/upload.php', {
                    method: 'POST',
                    body: formData
                });
                const upData = await upRes.json();

                if (upData.status === 'success' && upData.urls && upData.urls.length > 0) {
                    const newAvatarUrl = '/' + upData.urls[0];

                    // Update auth backend
                    const authRes = await fetch('/api/auth.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'update_avatar', user_id: user.id, avatar_url: newAvatarUrl })
                    });
                    const authData = await authRes.json();

                    if (authData.status === 'success') {
                        // Cập nhật localStorage
                        user.avatar = newAvatarUrl;
                        localStorage.setItem('user_vtkt', JSON.stringify(user));

                        // Cập nhật DOM
                        const avatarEl = document.getElementById('profileAvatar');
                        if (avatarEl) avatarEl.src = newAvatarUrl;

                        showToast('Đã đổi avatar', 'success');
                    } else {
                        showToast(authData.message || 'Lỗi cập nhật', 'error');
                    }
                } else {
                    showToast(upData.message || 'Lỗi upload ảnh', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối máy chủ', 'error');
            }
            // Reset input
            e.target.value = '';
        });
    }

    // --- 2c. Settings & Edit Profile Modal ---
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const settingsProfileForm = document.getElementById('settingsProfileForm');
    const btnChangePassword = document.getElementById('btnChangePassword');
    const btnLogoutProfile = document.getElementById('btnLogout');

    if (btnOpenSettings && settingsModal && closeSettingsModal) {
        btnOpenSettings.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            setTimeout(() => {
                settingsModal.children[0].classList.remove('scale-95', 'opacity-0');
            }, 10);

            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (user) {
                document.getElementById('editProfileName').value = user.fullname || '';
            }
        });

        closeSettingsModal.addEventListener('click', () => {
            settingsModal.children[0].classList.add('scale-95', 'opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
        });
    }

    if (settingsProfileForm) {
        settingsProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('editProfileName').value.trim();
            if (!newName) {
                if (typeof window.showToast === 'function') window.showToast("Vui lòng nhập tên", "error");
                return;
            }

            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user) return;

            const btn = settingsProfileForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                const res = await fetch('/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', user_id: user.id, fullname: newName })
                });
                const data = await res.json();

                if (data.status === 'success') {
                    user.fullname = newName;
                    localStorage.setItem('user_vtkt', JSON.stringify(user));
                    const nameEl = document.getElementById('profileName');
                    if (nameEl) nameEl.textContent = newName;

                    if (typeof window.showToast === 'function') window.showToast("Cập nhật thành công!", "success");
                    if (closeSettingsModal) closeSettingsModal.click();
                } else {
                    if (typeof window.showToast === 'function') window.showToast(data.message || "Lỗi cập nhật", "error");
                }
            } catch (err) {
                if (typeof window.showToast === 'function') window.showToast("Lỗi kết nối máy chủ", "error");
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', () => {
            if (closeSettingsModal) closeSettingsModal.click();
            setTimeout(() => {
                const pwModal = document.getElementById('changePasswordModal');
                if (pwModal) {
                    pwModal.classList.remove('hidden');
                    setTimeout(() => pwModal.querySelector('div').classList.remove('scale-95', 'opacity-0'), 10);
                }
            }, 300);
        });
    }

    if (btnLogoutProfile) {
        btnLogoutProfile.addEventListener('click', () => {
            localStorage.removeItem('user_vtkt');
            if (typeof window.showToast === 'function') window.showToast("Đã đăng xuất");
            setTimeout(() => window.location.reload(), 1000);
        });
    }

    // Cập nhật giao diện Profile khi có thay đổi trạng thái user
    window.updateProfileView = function () {
        const userStr = localStorage.getItem('user_vtkt');
        const loginSection = document.getElementById('loginSection');
        const profileSection = document.getElementById('profileSection');
        const btnOpenAdmin = document.getElementById('btnOpenAdmin');

        if (userStr) {
            const user = JSON.parse(userStr);
            if (loginSection) loginSection.classList.add('hidden');
            if (profileSection) {
                profileSection.classList.remove('hidden');
                const profileNameEl = document.getElementById('userNameProfile');
                if (profileNameEl) profileNameEl.textContent = user.fullname || user.username;
                const accName = document.getElementById('userAccountName');
                if (accName) accName.textContent = user.username;

                const profilePoints = document.getElementById('profilePoints');
                if (profilePoints) profilePoints.textContent = user.points || 0;

                const profilePlaceCount = document.getElementById('profilePlaceCount');
                if (profilePlaceCount) profilePlaceCount.textContent = user.places_count || 0;

                const profileReviewCount = document.getElementById('profileReviewCount');
                if (profileReviewCount) profileReviewCount.textContent = user.review_count || 0;

                const rewardsTabPoints = document.getElementById('rewardsTabPoints');
                if (rewardsTabPoints) rewardsTabPoints.textContent = user.points || 0;

                // Sync latest data from server
                if (window.supabaseClient) {
                    Promise.all([
                        window.supabaseClient.from('profile').select('points').eq('id', user.id).single(),
                        window.supabaseClient.from('places').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                        window.supabaseClient.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                        window.supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', user.id)
                    ]).then(([
                        { data: profileData },
                        { count: placesCount },
                        { count: reviewsCount },
                        { count: followersCount }
                    ]) => {
                        user.points = profileData?.points || 0;
                        user.places_count = placesCount || 0;
                        user.review_count = reviewsCount || 0;
                        user.follower_count = followersCount || 0;

                        localStorage.setItem('user_vtkt', JSON.stringify(user));

                        if (profilePoints) profilePoints.textContent = user.points;
                        if (rewardsTabPoints) rewardsTabPoints.textContent = user.points;
                        if (profilePlaceCount) profilePlaceCount.textContent = user.places_count;
                        if (profileReviewCount) profileReviewCount.textContent = user.review_count;

                        const followersEl = document.getElementById('profileFollowerCount');
                        if (followersEl) followersEl.textContent = user.follower_count;
                    }).catch(err => {
                        console.error("Lỗi lấy thông số:", err);
                    });
                }


                document.getElementById('profileAvatar').src = user.avatar && user.avatar !== 'default_avatar.png' ? user.avatar : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullname || user.username) + '&background=ff5500&color=fff&rounded=true&bold=true';
            }
            if (btnOpenAdmin) {
                const adminDivider = document.getElementById('adminDivider');
                if (user.is_admin == 1) {
                    btnOpenAdmin.classList.remove('hidden');
                    if (adminDivider) adminDivider.classList.remove('hidden');
                } else {
                    btnOpenAdmin.classList.add('hidden');
                    if (adminDivider) adminDivider.classList.add('hidden');
                }
            }
        } else {
            if (loginSection) loginSection.classList.remove('hidden');
            if (profileSection) profileSection.classList.add('hidden');
            if (btnOpenAdmin) btnOpenAdmin.classList.add('hidden');
        }
    };

    // Gắn sự kiện click đổi avatar ngay khi render (Chỉ gắn 1 lần)
    const avatarImg = document.getElementById('profileAvatar');
    if (avatarImg && !avatarImg.hasAttribute('data-has-avatar-click')) {
        avatarImg.parentElement.style.cursor = 'pointer';
        avatarImg.hasAttribute('data-has-avatar-click', 'true');

        avatarImg.parentElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('images[]', file);

                try {
                    const uploadRes = await fetch('/api/upload.php', { method: 'POST', body: formData });
                    const uploadData = await uploadRes.json();

                    if (uploadData.status === 'success' || uploadData.status === 'partial') {
                        const avatarUrl = uploadData.urls[0];
                        const userStr = localStorage.getItem('user_vtkt');
                        const user = JSON.parse(userStr);

                        const res = await fetch('/api/auth.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_avatar', user_id: user.id, avatar_url: avatarUrl })
                        });
                        const data = await res.json();

                        if (data.status === 'success') {
                            user.avatar = avatarUrl;
                            localStorage.setItem('user_vtkt', JSON.stringify(user));
                            window.updateProfileView();
                            showToast(data.message, "success");
                        } else {
                            showToast(data.message, "error");
                        }
                    } else {
                        showToast(uploadData.message, "error");
                    }
                } catch (err) {
                    showToast("Lỗi đổi ảnh đại diện", "error");
                }
            };
            input.click();
        });
    }

    // Khởi tạo trạng thái ban đầu
    window.updateProfileView();

    // Process Password change
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            const old_password = document.getElementById('oldPassword').value;
            const new_password = document.getElementById('newPassword').value;
            const btn = changePasswordForm.querySelector('button[type="submit"]');

            if (new_password.length < 6) return showToast("Mật khẩu mới tối thiểu 6 kí tự", "error");

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                const res = await fetch('/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_password', user_id: user.id, old_password, new_password })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast(data.message, "success");
                    changePasswordForm.reset();
                    closeEditProfileModal.click();
                } else {
                    showToast(data.message, "error");
                }
            } catch (e) {
                showToast("Lỗi máy chủ", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Cập nhật Mật khẩu';
            }
        });
    }

    if (btnOpenSavedPlaces && savedPlacesModal && closeSavedPlacesModal) {
        btnOpenSavedPlaces.addEventListener('click', () => {
            savedPlacesModal.classList.remove('hidden');
            setTimeout(() => savedPlacesModal.querySelector('div').classList.remove('translate-y-full'), 10);
            loadSavedPlaces();
        });
    }

    if (closeSavedPlacesModal) {
        closeSavedPlacesModal.addEventListener('click', () => {
            savedPlacesModal.querySelector('div').classList.add('translate-y-full');
            setTimeout(() => savedPlacesModal.classList.add('hidden'), 300);
        });
    }

    async function loadSavedPlaces() {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        const list = document.getElementById('savedPlacesList');
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary"></i></div>';

        try {
            const res = await fetch(`${API_URL}/interactions.php?action=get_saved_places&user_id=${user.id}`);
            const places = await res.json();

            if (places.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-regular fa-bookmark text-4xl mb-3"></i>
                    <p>Chưa có địa điểm nào được lưu</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            places.forEach(place => {
                const el = document.createElement('div');
                el.className = 'bg-white dark:bg-darkCard rounded-2xl p-4 shadow-sm border border-gray-50 dark:border-[#2c2c2e] flex gap-4';

                let img = 'https://placehold.co/200x200?text=KT';
                if (place.thumbnail && place.thumbnail !== 'default_place.jpg') {
                    img = place.thumbnail.startsWith('http') ? place.thumbnail : `${window.API_URL}/../${place.thumbnail}`;
                }

                el.innerHTML = `
                    <div class="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                        <img src="${img}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <h4 class="font-bold text-gray-900 dark:text-white leading-tight mb-1">${place.name}</h4>
                        <div class="flex items-center text-xs text-gray-500 mb-2">
                            <span class="text-orange-500 font-bold mr-1"><i class="fa-solid fa-star"></i> ${Number(place.average_rating || 0).toFixed(1)}</span>
                            <span>(${place.review_count || 0} đánh giá)</span>
                        </div>
                        <p class="text-xs text-gray-400 line-clamp-1"><i class="fa-solid fa-location-dot w-3"></i> ${place.address}</p>
                    </div>
                `;
                el.addEventListener('click', () => {
                    closeSavedPlacesModal.click();
                    setTimeout(() => {
                        if (typeof window.openPlaceDetail === 'function') {
                            window.openPlaceDetail({ id: place.id });
                        }
                    }, 300);
                });
                list.appendChild(el);
            });
        } catch (e) {
            list.innerHTML = '<p class="text-center text-red-500 py-6">Lỗi tải dữ liệu</p>';
        }
    }

    // --- Saved Reviews Modal ---
    const btnOpenSavedReviews = document.getElementById('btnOpenSavedReviews');
    const savedReviewsModal = document.getElementById('savedReviewsModal');
    const closeSavedReviewsModal = document.getElementById('closeSavedReviewsModal');

    if (btnOpenSavedReviews && savedReviewsModal && closeSavedReviewsModal) {
        btnOpenSavedReviews.addEventListener('click', () => {
            savedReviewsModal.classList.remove('hidden');
            setTimeout(() => savedReviewsModal.querySelector('div').classList.remove('translate-y-full'), 10);
            loadSavedReviews();
        });

        closeSavedReviewsModal.addEventListener('click', () => {
            savedReviewsModal.querySelector('div').classList.add('translate-y-full');
            setTimeout(() => savedReviewsModal.classList.add('hidden'), 300);
        });
    }

    async function loadSavedReviews() {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        const list = document.getElementById('savedReviewsList');
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary"></i></div>';

        try {
            const res = await fetch(`${API_URL}/interactions.php?action=get_saved_reviews&user_id=${user.id}`);
            const reviews = await res.json();

            if (reviews.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-solid fa-bookmark text-4xl mb-3 text-gray-300"></i>
                    <p>Chưa có đánh giá nào được lưu</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            reviews.forEach(review => {
                const el = document.createElement('div');
                el.className = 'bg-white dark:bg-darkCard rounded-2xl p-4 shadow-sm border border-gray-50 dark:border-[#2c2c2e]';

                let imageHtml = '';
                if (review.images && review.images.length > 0) {
                    imageHtml += '<div class="flex gap-2 mt-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide select-none">';
                    const imgUrls = review.images.map(img => img.startsWith('http') ? img : `${window.API_URL}/../${img}`);
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

                const randomBg = review.id % 2 === 0 ? 'ff5500' : 'ff8800';
                const avatar = review.avatar && review.avatar !== 'default_avatar.png' ? review.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(review.fullname)}&background=${randomBg}&color=fff&rounded=true&bold=true`;

                el.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <img src="${avatar}" class="w-10 h-10 rounded-full object-cover">
                            <div class="flex-1">
                                <div class="flex justify-between items-center w-full">
                                    <h4 class="font-bold text-sm text-gray-900 dark:text-white">${review.fullname}</h4>
                                    <span class="text-[10px] text-gray-400 font-normal pl-2">${window.timeAgo ? window.timeAgo(review.created_at) : review.created_at}</span>
                                </div>
                                <p class="text-xs text-gray-400 cursor-pointer hover:text-[#ff5500] transition" onclick="document.getElementById('closeSavedReviewsModal').click(); setTimeout(() => window.openPlaceDetail({id: ${review.place_id}}), 300);">tại <span class="font-semibold">${review.place_name}</span></p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-orange-400 mb-2">
                        ${Array(5).fill(0).map((_, i) => `<i class="${i < review.rating ? 'fa-solid' : 'fa-regular'} fa-star text-[10px]"></i>`).join('')}
                    </div>
                    <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">${review.content}</p>
                    ${imageHtml}
                `;
                list.appendChild(el);
            });
        } catch (e) {
            list.innerHTML = '<p class="text-center text-red-500 py-6">Lỗi tải dữ liệu</p>';
        }
    }

    // --- My Reviews Modal ---
    const btnOpenMyReviews = document.getElementById('btnOpenMyReviews');
    const myReviewsModal = document.getElementById('myReviewsModal');
    const closeMyReviewsModal = document.getElementById('closeMyReviewsModal');

    if (btnOpenMyReviews && myReviewsModal && closeMyReviewsModal) {
        btnOpenMyReviews.addEventListener('click', () => {
            myReviewsModal.classList.remove('hidden');
            setTimeout(() => myReviewsModal.querySelector('div').classList.remove('translate-y-full'), 10);
            loadMyReviews();
        });

        closeMyReviewsModal.addEventListener('click', () => {
            myReviewsModal.querySelector('div').classList.add('translate-y-full');
            setTimeout(() => myReviewsModal.classList.add('hidden'), 300);
        });
    }

    async function loadMyReviews() {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        const list = document.getElementById('myReviewsList');
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-[#ff5500]"></i></div>';

        try {
            const res = await fetch(`${API_URL}/interactions.php?action=get_my_reviews&user_id=${user.id}`);
            const reviews = await res.json();

            if (reviews.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-regular fa-star text-4xl mb-3 text-gray-300"></i>
                    <p>Chưa có bài đánh giá nào</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            reviews.forEach(r => {
                const el = document.createElement('div');
                el.className = 'bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800';

                let ratingHtml = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= r.rating) ratingHtml += '<i class="fa-solid fa-star text-yellow-400 text-xs"></i>';
                    else ratingHtml += '<i class="fa-regular fa-star text-gray-300 text-xs"></i>';
                }

                el.innerHTML = `
                    <h4 class="font-bold text-xs text-[#ff5500] mb-2 cursor-pointer transition-colors" onclick="document.getElementById('closeMyReviewsModal').click(); setTimeout(()=>window.openPlaceDetail({id: ${r.place_id}}), 300);"><i class="fa-solid fa-location-dot mr-1"></i>${r.place_name}</h4>
                    <div class="flex mb-2">
                        ${ratingHtml}
                    </div>
                    <p class="text-sm mt-1">${r.content}</p>
                `;
                list.appendChild(el);
            });
        } catch (e) {
            list.innerHTML = '<p class="text-center text-red-500 py-6">Lỗi tải dữ liệu</p>';
        }
    }



    async function loadMyReviews() {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        const list = document.getElementById('myReviewsList');
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-[#ff5500]"></i></div>';

        try {
            const res = await fetch(`/api/interactions.php?action=get_my_reviews&user_id=${user.id}`);
            const reviews = await res.json();

            if (reviews.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-regular fa-star text-4xl mb-3 text-gray-300"></i>
                    <p>Chưa có bài đánh giá nào</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            reviews.forEach(r => {
                const el = document.createElement('div');
                el.className = 'bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800';

                let ratingHtml = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= r.rating) ratingHtml += '<i class="fa-solid fa-star text-yellow-400 text-xs"></i>';
                    else ratingHtml += '<i class="fa-regular fa-star text-gray-300 text-xs"></i>';
                }

                el.innerHTML = `
                    <h4 class="font-bold text-xs text-[#ff5500] mb-2 cursor-pointer transition-colors" onclick="document.getElementById('closeMyReviewsModal').click(); setTimeout(()=>window.openPlaceDetail({id: ${r.place_id}}), 300);"><i class="fa-solid fa-location-dot mr-1"></i>${r.place_name}</h4>
                    <div class="flex mb-2">
                        ${ratingHtml}
                    </div>
                    <p class="text-sm mt-1">${r.content}</p>
                `;
                list.appendChild(el);
            });
        } catch (e) {
            list.innerHTML = '<p class="text-center text-red-500 py-6">Lỗi tải dữ liệu</p>';
        }
    }

    // --- Points History Modal ---
    const btnOpenPointsHistory = document.getElementById('btnOpenPointsHistory');
    const pointsHistoryModal = document.getElementById('pointsHistoryModal');
    const closePointsHistoryModal = document.getElementById('closePointsHistoryModal');

    if (btnOpenPointsHistory && pointsHistoryModal && closePointsHistoryModal) {
        btnOpenPointsHistory.addEventListener('click', () => {
            pointsHistoryModal.classList.remove('hidden');
            setTimeout(() => pointsHistoryModal.children[0].classList.remove('translate-y-full'), 10);

            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            const historyPointsEl = document.getElementById('historyModalPoints');
            if (user && historyPointsEl) {
                historyPointsEl.textContent = user.points || 0;
            }

            loadPointsHistory();
        });

        closePointsHistoryModal.addEventListener('click', () => {
            pointsHistoryModal.children[0].classList.add('translate-y-full');
            setTimeout(() => pointsHistoryModal.classList.add('hidden'), 300);
        });
    }

    async function loadPointsHistory() {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        const list = document.getElementById('pointsHistoryList');
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-[#ff5500]"></i></div>';

        try {
            const res = await fetch(`${window.API_URL || '/api'}/interactions.php?action=get_points_history&user_id=${user.id}`);
            const history = await res.json();

            if (history.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i class="fa-solid fa-trophy text-4xl mb-3 text-gray-300"></i>
                    <p>Chưa có lịch sử giao dịch điểm</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            history.forEach(item => {
                const isPositive = item.points_changed > 0;
                const el = document.createElement('div');
                el.className = 'bg-white dark:bg-darkCard border-b border-gray-50 dark:border-gray-800 p-4 shrink-0 flex items-center justify-between';

                el.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}">
                            <i class="fa-solid ${isPositive ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        </div>
                        <div>
                            <p class="text-[13px] font-bold text-gray-800 dark:text-gray-200 line-clamp-1">${item.reason}</p>
                            <p class="text-[10px] text-gray-400 mt-0.5">${window.timeAgo ? window.timeAgo(item.created_at) : item.created_at}</p>
                        </div>
                    </div>
                    <div class="font-black text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}">
                        ${isPositive ? '+' : ''}${item.points_changed}
                    </div>
                `;
                list.appendChild(el);
            });
        } catch (e) {
            list.innerHTML = '<p class="text-center text-red-500 py-6">Lỗi tải dữ liệu</p>';
        }
    }


    // --- 4. Notifications Modal ---
    if (btnOpenNotifications) {
        btnOpenNotifications.addEventListener('click', () => {
            notificationsModal.classList.remove('hidden');
            setTimeout(() => notifInner.classList.remove('translate-y-full'), 10);
            loadNotifications();
        });
    }

    if (closeNotificationsModal) {
        closeNotificationsModal.addEventListener('click', () => {
            notifInner.classList.add('translate-y-full');
            setTimeout(() => notificationsModal.classList.add('hidden'), 300);
        });
    }

    async function loadNotifications() {
        const user = window.currentUser || JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user || !window.supabaseClient) return;

        const list = document.getElementById('notificationsList');
        if (!list) return;
        list.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary"></i></div>';

        try {
            // Note: We might not have actor_name/actor_avatar directly if we don't join profile.
            // But we can just fetch notifications and assume basic info or join if configured.
            // Using a simple query for now. If table is missing, it will handle error gracefully.
            const { data: notifs, error } = await window.supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!notifs || notifs.length === 0) {
                list.innerHTML = `
                <div class="flex flex-col items-center justify-center h-48 text-gray-400">
                    <i class="fa-regular fa-bell-slash text-4xl mb-3"></i>
                    <p>Chưa có thông báo nào</p>
                </div>`;
                return;
            }

            list.innerHTML = '';
            notifs.forEach(n => {
                let icon = '';
                let text = '';
                if (n.type === 'follow') {
                    icon = '<i class="fa-solid fa-user-plus text-blue-500"></i>';
                    text = `bắt đầu theo dõi bạn.`;
                } else if (n.type === 'comment') {
                    icon = '<i class="fa-solid fa-comment-dots text-orange-500"></i>';
                    text = `bình luận bài viết của bạn.`;
                } else if (n.type === 'like') {
                    icon = '<i class="fa-solid fa-heart text-red-500"></i>';
                    text = `yêu thích bài đánh giá của bạn.`;
                } else if (n.type === 'new_review') {
                    icon = '<i class="fa-solid fa-star text-[#ff5500]"></i>';
                    text = `vừa đăng bài đánh giá mới.`;
                } else if (n.type === 'system') {
                    icon = '<i class="fa-solid fa-bullhorn text-purple-500"></i>';
                    text = n.message || `Đã có thông báo mới từ hệ thống.`;
                } else if (n.type === 'approved') {
                    icon = '<i class="fa-solid fa-check-circle text-green-500"></i>';
                    text = n.message || `Địa điểm của bạn đã được duyệt!(+15 điểm)`;
                } else {
                    icon = '<i class="fa-solid fa-bell text-gray-500"></i>';
                    text = n.message || `Thông báo.`;
                }

                const el = document.createElement('div');
                el.className = `p-4 rounded-xl flex gap-3 items-start border ${n.is_read == 0 || n.is_read === false ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/30' : 'bg-white border-gray-100 dark:bg-darkCard dark:border-[#2c2c2e]'}`;

                // Use simple fallbacks if actor info is missing
                const actorName = n.actor_name || 'Hệ thống';
                const avatarUrl = (n.actor_avatar && n.actor_avatar !== 'default_avatar.png') ?
                    (n.actor_avatar.startsWith('http') ? n.actor_avatar : `${window.API_URL || '/api'}/../${n.actor_avatar}`) :
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=ff5500&color=fff&rounded=true&bold=true`;

                const isSystemMessage = ['approved', 'system'].includes(n.type);

                el.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        ${!isSystemMessage ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : icon}
                        ${!isSystemMessage ? `<div class="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm text-[8px]">${icon}</div>` : ''}
                    </div>
                    <div>
                        <p class="text-[13px] text-gray-800 dark:text-gray-200">
                            ${!isSystemMessage ? `<span class="font-bold text-[#ff5500]">${actorName}</span> ` : ''}${text}
                        </p>
                        <p class="text-[10px] text-gray-400 mt-1">${window.timeAgo ? window.timeAgo(n.created_at) : (new Date(n.created_at)).toLocaleString()}</p>
                    </div>
                `;
                list.appendChild(el);
            });

            // Mark unread as read if any
            const unreadIds = notifs.filter(n => (n.is_read == 0 || n.is_read === false)).map(n => n.id);
            if (unreadIds.length > 0) {
                window.supabaseClient.from('notifications')
                    .update({ is_read: true })
                    .in('id', unreadIds)
                    .then(() => {
                        if (notifBadge) notifBadge.classList.add('hidden');
                    });
            } else {
                if (notifBadge) notifBadge.classList.add('hidden');
            }

        } catch (e) {
            console.error("Notifications Fetch Error:", e);
            list.innerHTML = '<p class="text-center text-red-500 py-6 text-sm">Chưa có thông báo nào từ CSDL.</p>';
        }
    }
    window.loadNotifications = loadNotifications;

    // Check notifications periodically
    async function checkNotifications() {
        const user = window.currentUser || JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user || !window.supabaseClient) return;

        try {
            const { count, error } = await window.supabaseClient
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('is_read', [false, 0]);

            if (error) throw error;
            const unread = count || 0;
            
            if (unread > 0 && notifBadge) {
                notifBadge.classList.remove('hidden');
                notifBadge.querySelector('span:last-child').textContent = unread > 9 ? '9+' : unread;
            }
        } catch (e) { }
    }

    // Call once when loaded
    setTimeout(checkNotifications, 2000);

    // ─── Phase 4B: AI Chat History Integration ──────────────────────────
    const AI_URL = '/api/ai.php';

    /**
     * Load chat history from server and render into chat container
     */
    window.loadChatHistory = async function () {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        try {
            const res = await fetch(`${AI_URL}?action=get_history&user_id=${user.id}`);
            const msgs = await res.json();

            // Find chat messages container (update selector if needed)
            const chatList = document.getElementById('aiChatMessages');
            if (!chatList) return;

            // Xoá nội dung trước (tránh duplicate nếu bật/tắt liên tục)
            chatList.innerHTML = '';

            if (!Array.isArray(msgs) || msgs.length === 0) {
                // Default greeting khi chưa có history
                const greeting = createChatBubble('assistant', 'Chào bạn! 👋 Mình là trợ lý AI của Kon Tum Local. Hãy hỏi mình bất cứ điều gì về du lịch, ẩm thực hay các địa điểm ở Kon Tum nhé!');
                chatList.appendChild(greeting);
                return;
            }

            // Render historical messages
            const fragment = document.createDocumentFragment();
            msgs.forEach(msg => {
                const el = createChatBubble(msg.role, msg.content, true);
                fragment.appendChild(el);
            });
            chatList.innerHTML = ''; // Xoá trắng
            chatList.appendChild(fragment);
            chatList.scrollTop = chatList.scrollHeight;
        } catch (e) {
            console.error('Lỗi tải lịch sử chat:', e);
        }
    };

    /**
     * Save one message to server
     * @param {'user'|'assistant'} role
     * @param {string} content
     */
    window.saveChatMessage = async function (role, content) {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        try {
            await fetch(AI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_message', user_id: user.id, role, content })
            });
        } catch (e) {
            console.error('Lỗi lưu tin nhắn:', e);
        }
    };

    /**
     * Clear all chat history for current user
     */
    window.clearChatHistory = async function () {
        const user = JSON.parse(localStorage.getItem('user_vtkt'));
        if (!user) return;

        try {
            const res = await fetch(AI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_history', user_id: user.id })
            });
            const data = await res.json();
            if (data.status === 'success') {
                const chatList = document.getElementById('aiChatMessages');
                if (chatList) chatList.innerHTML = '';
                showToast('Đã xóa lịch sử chat', 'success');
            }
        } catch (e) {
            showToast('Lỗi xóa lịch sử', 'error');
        }
    };

    /**
     * Helper: Parse basic markdown and custom Place ID tags
     */
    function formatAiMessage(text) {
        let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<b class="text-gray-900 dark:text-white">$1</b>');

        // Headings
        html = html.replace(/### (.*?)(?:\n|$)/g, '<h4 class="font-bold text-[#ff5500] mt-3 mb-1 text-[15px] uppercase tracking-wide">$1</h4>\n');

        // Lists
        html = html.replace(/^- (.*?)(?:\n|$)/gm, '<li class="ml-4 list-disc my-1">$1</li>\n');

        // Replace place ID tag with a button
        html = html.replace(/\[PLACE_ID:\s*(\d+)\]/g, (match, id) => {
            return `<button onclick="window.openPlaceDetail({id: ${id}}); document.getElementById('closeAiChatModal').click();" class="flex w-full items-center justify-center gap-1.5 bg-orange-100 text-[#ff5500] px-3 py-2 rounded-xl text-xs font-bold hover:bg-orange-200 mt-2 mb-2 transition-all border border-orange-200"><i class="fa-solid fa-map-location-dot"></i> Xem chi tiết địa điểm này</button>`;
        });

        // Newlines -> br
        html = html.replace(/\n/g, '<br>');
        // Cleanup extra brs created around lists and headers
        html = html.replace(/(<br>){2,}/g, '<br><br>');
        html = html.replace(/<br><button/g, '<button');
        html = html.replace(/<\/button><br>/g, '</button>');

        return `<div class="leading-relaxed whitespace-pre-wrap">${html}</div>`;
    }

    /**
     * Helper: Create a chat bubble element
     */
    function createChatBubble(role, content, isHistory = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
        if (isHistory) wrapper.setAttribute('data-history', 'true');

        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'max-w-[80%] bg-[#ff5500] text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm font-medium shadow-sm'
            : 'max-w-[90%] bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-[14.5px] border border-gray-100 dark:border-gray-700 shadow-sm';

        if (role === 'assistant') {
            bubble.innerHTML = formatAiMessage(content);
        } else {
            bubble.textContent = content; // Safe raw text
        }

        wrapper.appendChild(bubble);
        return wrapper;
    }

    // Wire up clear history button if present
    const clearHistoryBtn = document.getElementById('clearChatHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Xóa toàn bộ lịch sử chat AI?')) {
                window.clearChatHistory();
            }
        });
    }
    // ─── AI Chat UI Interaction ──────────────────────────
    const btnOpenAiChat = document.getElementById('btnOpenAiChat');
    const aiChatModal = document.getElementById('aiChatModal');
    const closeAiChatModal = document.getElementById('closeAiChatModal');
    const aiChatForm = document.getElementById('aiChatForm');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiChatInner = aiChatModal ? aiChatModal.querySelector('.transition-transform') : null;

    if (btnOpenAiChat) {
        btnOpenAiChat.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user) return showToast("Vui lòng đăng nhập để dùng AI", "error");

            aiChatModal.classList.remove('hidden');
            aiChatModal.classList.add('flex');
            setTimeout(() => aiChatInner.classList.remove('translate-y-full'), 10);

            // Load history
            window.loadChatHistory();
        });
    }

    if (closeAiChatModal) {
        closeAiChatModal.addEventListener('click', () => {
            aiChatInner.classList.add('translate-y-full');
            setTimeout(() => {
                aiChatModal.classList.add('hidden');
                aiChatModal.classList.remove('flex');
            }, 300);
        });
    }

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user) return;

            const message = aiChatInput.value.trim();
            if (!message) return;

            // Display user message immediately
            aiChatMessages.appendChild(createChatBubble('user', message));
            aiChatInput.value = '';
            aiChatInput.style.height = 'auto'; // Reset height
            aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

            const btnSubmit = document.getElementById('aiChatSendBtn');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            // Create typing indicator
            const typingBubble = createChatBubble('assistant', 'Đang suy nghĩ...');
            typingBubble.id = 'aiTypingIndicator';
            aiChatMessages.appendChild(typingBubble);
            aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

            try {
                const res = await fetch(AI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'chat', user_id: user.id, message })
                });

                let data;
                const responseText = await res.text();
                try {
                    data = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error('AI Response raw:', responseText);
                    throw new Error('Server trả về dữ liệu không hợp lệ');
                }

                const typingObj = document.getElementById('aiTypingIndicator');
                if (typingObj) typingObj.remove();

                if (data.status === 'success' && data.reply) {
                    // Show AI reply
                    aiChatMessages.appendChild(createChatBubble('assistant', data.reply));
                    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
                } else {
                    const errMsg = data.message || 'Lỗi không xác định từ AI';
                    aiChatMessages.appendChild(createChatBubble('assistant', '⚠️ ' + errMsg));
                    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
                }
            } catch (err) {
                console.error('AI Chat Error:', err);
                const typingObj = document.getElementById('aiTypingIndicator');
                if (typingObj) typingObj.remove();
                aiChatMessages.appendChild(createChatBubble('assistant', '⚠️ Lỗi kết nối: ' + (err.message || 'Không thể kết nối máy chủ AI')));
                aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
            }
        });

        // Auto-resize textarea
        aiChatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Submit on Enter (no shift)
        aiChatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                aiChatForm.dispatchEvent(new Event('submit'));
            }
        });
    }
});
