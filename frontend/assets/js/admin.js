/**
 * admin.js — Phase 4D: Admin Dashboard
 * Handle fetching pending places, reported items and managing users.
 */

const API_URL_ADMIN = window.API_BASE_URL + '/api/admin.php';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const adminDashboardModal = document.getElementById('adminDashboardModal');
    const closeAdminDashboard = document.getElementById('closeAdminDashboard');
    const adminTabs = document.querySelectorAll('.admin-tab-btn');
    const adminPanels = document.querySelectorAll('.admin-tab-panel');

    // Mở/Đóng Dashboard
    const openAdminBtn = document.getElementById('btnOpenAdmin');
    if (openAdminBtn) {
        openAdminBtn.addEventListener('click', () => {
            const userStr = localStorage.getItem('user_vtkt');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.is_admin == 1) {
                    adminDashboardModal.classList.remove('hidden');
                    adminDashboardModal.classList.add('flex');
                    setTimeout(() => adminDashboardModal.classList.remove('translate-y-full'), 10);
                    loadAdminData('admin-places');
                } else {
                    if (window.showToast) showToast('Bạn không có quyền quản trị!', 'error');
                }
            }
        });
    }

    if (closeAdminDashboard) {
        closeAdminDashboard.addEventListener('click', () => {
            adminDashboardModal.classList.add('translate-y-full');
            setTimeout(() => {
                adminDashboardModal.classList.add('hidden');
                adminDashboardModal.classList.remove('flex');
            }, 300);
        });
    }

    // Tabs Logic
    adminTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Update Tab style
            adminTabs.forEach(t => {
                t.classList.remove('active-tab', 'bg-[#ff5500]', 'text-white');
                t.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
            });
            tab.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
            tab.classList.add('active-tab', 'bg-[#ff5500]', 'text-white');

            // Show Panel
            const targetId = tab.dataset.tab;
            adminPanels.forEach(p => p.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');

            // Load Data
            loadAdminData(targetId);
        });
    });
});

async function loadAdminData(tabId) {
    const user = JSON.parse(localStorage.getItem('user_vtkt'));
    if (!user || user.is_admin != 1) return;

    if (tabId === 'admin-places') {
        await loadPendingPlaces(user.id);
    } else if (tabId === 'admin-reports') {
        await loadReports(user.id);
    } else if (tabId === 'admin-users') {
        await loadUsersList(user.id);
    }
}

// -----------------------------------------------------------------------------------------
// 1. Quản lý Địa điểm chờ duyệt
// -----------------------------------------------------------------------------------------
async function loadPendingPlaces(adminId) {
    const listEl = document.getElementById('adminPlacesList');
    listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...</div>';

    try {
        const res = await fetch(`${API_URL_ADMIN}?action=get_pending_places&admin_id=${adminId}`);
        const result = await res.json();

        if (result.status === 'success') {
            if (!result.data || result.data.length === 0) {
                listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm">Không có địa điểm nào chờ duyệt.</div>';
                return;
            }

            listEl.innerHTML = '';
            result.data.forEach(place => {
                const card = document.createElement('div');
                card.className = 'bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex flex-col gap-3 shadow-sm border border-gray-100 dark:border-gray-700';
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-gray-900 dark:text-white text-base">${place.name}</h3>
                            <span class="text-[10px] font-bold px-2 py-1 bg-orange-100 text-[#ff5500] rounded-lg">${place.category_name}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1"><i class="fa-solid fa-location-dot"></i> ${place.address}</p>
                        <p class="text-xs text-gray-400 mt-1 italic">Bởi: ${place.sumitted_by_name || 'Khách'} - ${new Date(place.created_at).toLocaleDateString('vi-VN')}</p>
                        <p class="text-sm mt-2 text-gray-700 dark:text-gray-300 line-clamp-2">${place.description || ''}</p>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); handlePlaceAction(${place.id}, 'approve_place', ${adminId})" class="flex-1 bg-[#10b981] hover:bg-[#059669] text-white text-sm font-bold py-2 rounded-xl transition-colors">Duyệt</button>
                        <button onclick="event.stopPropagation(); handlePlaceAction(${place.id}, 'reject_place', ${adminId})" class="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 rounded-xl transition-colors">Từ chối</button>
                    </div>
                `;
                listEl.appendChild(card);
            });
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Lỗi tải dữ liệu.</div>';
    }
}

window.handlePlaceAction = function (placeId, action, adminId) {
    const msg = action === 'approve_place' ? 'Xác nhận DUYỆT địa điểm này?' : 'Xác nhận TỪ CHỐI địa điểm này?';
    if (window.showConfirm) {
        window.showConfirm(msg, async () => {
            await executePlaceAction(placeId, action, adminId);
        });
    } else {
        if (confirm(msg)) executePlaceAction(placeId, action, adminId);
    }
}

async function executePlaceAction(placeId, action, adminId) {
    try {
        const res = await fetch(API_URL_ADMIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, admin_id: adminId, place_id: placeId })
        });
        const data = await res.json();

        if (window.showToast) {
            showToast(data.message, data.status);
        } else {
            alert(data.message);
        }

        // Reload list smoothly
        if (data.status === 'success') {
            loadPendingPlaces(adminId);
            return;
        }
    } catch (e) {
        if (window.showToast) showToast('Lỗi kết nối máy chủ', 'error');
    }
}

// -----------------------------------------------------------------------------------------
// 2. Quản lý Report (Báo cáo)
// -----------------------------------------------------------------------------------------
async function loadReports(adminId) {
    const listEl = document.getElementById('adminReportsList');
    listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...</div>';

    try {
        const res = await fetch(`${API_URL_ADMIN}?action=get_reports&admin_id=${adminId}`);
        const result = await res.json();

        if (result.status === 'success') {
            // Filter only pending reports
            const pendingReports = result.data.filter(r => r.status === 'pending');

            if (pendingReports.length === 0) {
                listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm">Không có báo cáo mới nào.</div>';
                return;
            }

            listEl.innerHTML = '';
            pendingReports.forEach(report => {
                const isReview = report.entity_type === 'review';
                const card = document.createElement('div');
                card.className = 'bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex flex-col gap-3 shadow-sm border border-gray-100 dark:border-gray-700';
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start">
                            <span class="text-xs font-bold px-2 py-1 ${isReview ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} rounded-lg">
                                Báo cáo ${isReview ? 'Đánh giá' : 'Địa điểm'}
                            </span>
                            <span class="text-[10px] text-gray-400">${new Date(report.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p class="text-sm font-bold text-gray-900 dark:text-white mt-2">Bởi: <span class="font-normal text-gray-600">${report.reporter_name}</span></p>
                        <p class="text-sm mt-1 text-red-500 dark:text-red-400 font-medium">Lý do: "${report.reason}"</p>
                        
                        <div class="mt-3 p-3 bg-white dark:bg-darkBg rounded-xl border border-gray-100 dark:border-gray-700">
                            <p class="text-xs text-gray-400 font-bold mb-1">Nội dung bị báo cáo:</p>
                            <p class="text-sm text-gray-700 dark:text-gray-300 italic">"${report.target_content}"</p>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button onclick="handleReportAction(${report.id}, 'delete_entity', ${adminId})" class="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 rounded-xl transition-colors">Xóa bài</button>
                        <button onclick="handleReportAction(${report.id}, 'dismiss', ${adminId})" class="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white text-gray-800 text-sm font-bold py-2 rounded-xl transition-colors">Bỏ qua</button>
                    </div>
                `;
                listEl.appendChild(card);
            });
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Lỗi tải dữ liệu.</div>';
    }
}

window.handleReportAction = function (reportId, actionType, adminId) {
    const msg = actionType === 'delete_entity' ? 'Xác nhận XÓA nội dung vi phạm này?' : 'Xác nhận BỎ QUA báo cáo (giữ lại bài)?';
    if (window.showConfirm) {
        window.showConfirm(msg, async () => {
            await executeReportAction(reportId, actionType, adminId);
        });
    } else {
        if (confirm(msg)) executeReportAction(reportId, actionType, adminId);
    }
}

async function executeReportAction(reportId, actionType, adminId) {
    try {
        const res = await fetch(API_URL_ADMIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resolve_report', admin_id: adminId, report_id: reportId, action_type: actionType })
        });
        const data = await res.json();

        if (window.showToast) showToast(data.message, data.status);
        else alert(data.message);

        if (data.status === 'success') {
            loadReports(adminId);
        }
    } catch (e) {
        if (window.showToast) showToast('Lỗi kết nối máy chủ', 'error');
    }
}

// -----------------------------------------------------------------------------------------
// 3. Quản lý Users
// -----------------------------------------------------------------------------------------
async function loadUsersList(adminId) {
    const listEl = document.getElementById('adminUsersList');
    listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...</div>';

    try {
        const res = await fetch(`${API_URL_ADMIN}?action=get_users&admin_id=${adminId}`);
        const result = await res.json();

        if (result.status === 'success') {
            listEl.innerHTML = '';
            result.data.forEach(u => {
                const avatarUrl = u.avatar && u.avatar !== 'default_avatar.png' ? u.avatar : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.fullname || u.username) + '&background=ff5500&color=fff&rounded=true&bold=true';
                const roleBadge = u.is_admin == 1 ? '<span class="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-md font-bold ml-2">Admin</span>' : '';

                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2';
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover">
                        <div>
                            <div class="font-bold text-sm text-gray-900 dark:text-white flex items-center">
                                ${u.fullname || u.username} ${roleBadge}
                            </div>
                            <div class="text-xs text-gray-500">@${u.username} • Điểm: <span class="text-[#ff5500] font-bold">${u.points}</span></div>
                        </div>
                    </div>
                    <div class="relative user-menu-container">
                        <button class="text-gray-400 hover:text-[#ff5500] p-2" onclick="toggleUserMenu(${u.id})">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div id="userMenu-${u.id}" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-10">
                            ${u.is_admin == 0 ? `<button onclick="handleUserAction(${u.id}, 'grant_admin', ${adminId})" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-white"><i class="fa-solid fa-user-shield w-4 mr-2"></i>Cấp quyền Admin</button>` : `<button onclick="handleUserAction(${u.id}, 'revoke_admin', ${adminId})" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-orange-500 transition"><i class="fa-solid fa-user-minus w-4 mr-2"></i>Hủy Admin</button>`}
                            <div class="h-px bg-gray-100 dark:bg-gray-700"></div>
                            <button onclick="handleUserAction(${u.id}, 'delete_user', ${adminId})" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-500 transition"><i class="fa-solid fa-ban w-4 mr-2"></i>Khóa tài khoản</button>
                        </div>
                    </div>
                `;
                listEl.appendChild(item);
            });
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Lỗi tải dữ liệu.</div>';
    }
}

window.toggleUserMenu = function (userId) {
    document.querySelectorAll('[id^="userMenu-"]').forEach(el => {
        if (el.id !== `userMenu-${userId}`) el.classList.add('hidden');
    });
    const menu = document.getElementById(`userMenu-${userId}`);
    if (menu) menu.classList.toggle('hidden');
}

window.handleUserAction = function (targetUserId, action, adminId) {
    const msg = action === 'delete_user' ? 'Bạn có chắc chắn muốn khóa tài khoản này?' : 'Xác nhận thay đổi quyền Admin?';

    // Hide menu after click
    const menu = document.getElementById(`userMenu-${targetUserId}`);
    if (menu) menu.classList.add('hidden');

    if (window.showConfirm) {
        window.showConfirm(msg, async () => {
            await executeUserAction(targetUserId, action, adminId);
        });
    } else {
        if (confirm(msg)) executeUserAction(targetUserId, action, adminId);
    }
}

async function executeUserAction(targetUserId, action, adminId) {
    try {
        const res = await fetch(API_URL_ADMIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, admin_id: adminId, target_user_id: targetUserId })
        });
        const data = await res.json();

        if (window.showToast) showToast(data.message, data.status);
        else alert(data.message);

        if (data.status === 'success') {
            loadUsersList(adminId);
        }
    } catch (e) {
        if (window.showToast) showToast('Lỗi kết nối máy chủ', 'error');
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu-container')) {
        document.querySelectorAll('[id^="userMenu-"]').forEach(el => el.classList.add('hidden'));
    }
});

// -----------------------------------------------------------------------------------------
// 4. Quản lý Banners
// -----------------------------------------------------------------------------------------
async function loadBannersAdmin(adminId) {
    const listEl = document.getElementById('adminBannersList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...</div>';

    try {
        const res = await fetch(`${API_URL_ADMIN}?action=get_banners&admin_id=${adminId}`);
        const result = await res.json();

        if (result.status === 'success') {
            if (result.data.length === 0) {
                listEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-sm">Chưa có banner nào.</div>';
                return;
            }

            listEl.innerHTML = '';
            result.data.forEach(banner => {
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-darkBg p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm border border-gray-100 dark:border-gray-800';
                card.innerHTML = `
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <img src="${banner.image_url}" class="w-16 h-10 object-cover rounded-lg bg-gray-200">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${banner.link_url || 'Không có link'}</p>
                            <p class="text-xs text-gray-500">Trạng thái: ${banner.is_active == 1 ? '<span class="text-green-500">Đang bật</span>' : '<span class="text-gray-400">Đang tắt</span>'}</p>
                        </div>
                    </div>
                    <button onclick="deleteBanner(${banner.id}, ${adminId})" class="w-8 h-8 flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                `;
                listEl.appendChild(card);
            });
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Lỗi tải dữ liệu.</div>';
    }
}

window.deleteBanner = async function (bannerId, adminId) {
    if (confirm('Xoá banner này?')) {
        try {
            const res = await fetch(API_URL_ADMIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_banner', admin_id: adminId, banner_id: bannerId })
            });
            const data = await res.json();
            if (data.status === 'success') {
                loadBannersAdmin(adminId);
                if (window.loadBanners) window.loadBanners();
            } else {
                alert(data.message);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnAddBanner = document.getElementById('adminBtnAddBanner');
    if (btnAddBanner) {
        btnAddBanner.addEventListener('click', async () => {
            const adminId = localStorage.getItem('user_id');
            const imgUrl = document.getElementById('adminBannerImgUrl').value;
            const linkUrl = document.getElementById('adminBannerLink').value;

            if (!imgUrl) {
                alert("Vui lòng nhập Link ảnh!");
                return;
            }

            const btnOriginalText = btnAddBanner.innerHTML;
            btnAddBanner.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thêm...';

            try {
                const res = await fetch(API_URL_ADMIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'add_banner',
                        admin_id: adminId,
                        image_url: imgUrl,
                        link_url: linkUrl
                    })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    document.getElementById('adminBannerImgUrl').value = '';
                    document.getElementById('adminBannerLink').value = '';
                    loadBannersAdmin(adminId);
                    // attempt to refresh main page banners
                    if (typeof loadBanners === 'function') {
                        loadBanners();
                    }
                } else {
                    alert(data.message);
                }
            } catch (e) {
                console.error(e);
            } finally {
                btnAddBanner.innerHTML = btnOriginalText;
            }
        });
    }

    // --- 5. Đẩy thông báo hệ thống ---
    const btnPushNotif = document.getElementById('btnAdminPushNotif');
    if (btnPushNotif) {
        btnPushNotif.addEventListener('click', async () => {
            const adminId = localStorage.getItem('user_id');
            const contentEl = document.getElementById('adminNotifContent');
            const message = contentEl.value.trim();

            if (!message) {
                if (window.showToast) showToast('Vui lòng nhập nội dung thông báo', 'error');
                else alert('Vui lòng nhập nội dung thông báo');
                return;
            }

            const btnOriginalText = btnPushNotif.innerHTML;
            btnPushNotif.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
            btnPushNotif.disabled = true;

            try {
                const res = await fetch(API_URL_ADMIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'push_notification',
                        admin_id: adminId,
                        message: message
                    })
                });
                const data = await res.json();

                if (window.showToast) showToast(data.message, data.status);
                else alert(data.message);

                if (data.status === 'success') {
                    contentEl.value = '';
                }
            } catch (e) {
                if (window.showToast) showToast('Lỗi khi gửi thông báo', 'error');
            } finally {
                btnPushNotif.innerHTML = btnOriginalText;
                btnPushNotif.disabled = false;
            }
        });
    }
});
