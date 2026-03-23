// --- Global
// API endpoints context
window.API_URL = window.API_BASE_URL + '/api';
window.currentUser = JSON.parse(localStorage.getItem('user_vtkt')) || null;

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const API_URL = window.API_URL;
    let currentUser = window.currentUser;

    // --- DOM Elements ---
    const htmlEl = document.documentElement;
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const darkModeSwitch = document.getElementById('darkModeSwitch');

    // Toast DOM
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    let toastTimeout;


    // --- 1. Init App ---
    initApp();

    function initApp() {
        // Init theme
        const savedTheme = localStorage.getItem('theme_vtkt');
        if (savedTheme === 'dark') {
            setDarkMode(true);
            if (darkModeSwitch) darkModeSwitch.checked = true;
        } else {
            setDarkMode(false);
            if (darkModeSwitch) darkModeSwitch.checked = false;
        }

        // Render or hide Profile based on login status
        const profileContent = document.getElementById('profileContent');
        const profileGuestView = document.getElementById('profileGuestView');
        const topBarPoints = document.getElementById('topBarPoints');
        const btnGuestLoginProfile = document.getElementById('btnGuestLoginProfile');

        if (btnGuestLoginProfile) {
            btnGuestLoginProfile.addEventListener('click', () => {
                document.querySelector('.nav-btn[data-target="profile"]')?.click();
            });
        }

        if (currentUser) {
            // Logged in: show profile, hide guest view
            if (profileGuestView) {
                profileGuestView.classList.add('hidden');
                profileGuestView.classList.remove('flex');
            }
            if (profileContent) {
                profileContent.classList.remove('hidden');
            }

            const elUserName = document.getElementById('userNameProfile');
            if (elUserName) elUserName.textContent = currentUser.fullname;

            const elAccName = document.getElementById('userAccountName');
            if (elAccName) elAccName.textContent = currentUser.username;

            const elProfileAvatar = document.getElementById('profileAvatar');
            if (elProfileAvatar) {
                elProfileAvatar.src = (currentUser.avatar && currentUser.avatar !== 'default_avatar.png')
                    ? currentUser.avatar
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.fullname || currentUser.username) + '&background=ff5500&color=fff&rounded=true&bold=true';
            }

            const adminBtn = document.getElementById('btnOpenAdminDashboard');
            if (adminBtn) {
                if (currentUser.is_admin == 1 || currentUser.is_admin === '1') {
                    adminBtn.classList.remove('hidden');
                    adminBtn.classList.add('flex');
                } else {
                    adminBtn.classList.add('hidden');
                    adminBtn.classList.remove('flex');
                }
            }

            const elProfilePoints = document.getElementById('profilePoints');
            if (elProfilePoints) elProfilePoints.textContent = currentUser.points;

            // Lấy thông số (đánh giá, đã lưu)
            fetchStats();
        } else {
            // Not logged in: show guest view, hide profile content
            if (profileContent) profileContent.classList.add('hidden');
            if (profileGuestView) {
                profileGuestView.classList.remove('hidden');
                profileGuestView.classList.add('flex');
            }
        }
    }

    async function fetchStats() {
        try {
            const user = window.currentUser || JSON.parse(localStorage.getItem('user_vtkt'));
            if (!user || !window.supabaseClient) return;
            
            // Parallel fetch to optimize load time
            const [
                { data: profileData },
                { count: savedCount },
                { count: reviewsCount },
                { count: followersCount }
            ] = await Promise.all([
                window.supabaseClient.from('profile').select('points').eq('id', user.id).single(),
                window.supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('entity_type', 'place'),
                window.supabaseClient.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                window.supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', user.id)
            ]);

            const stats = {
                points: profileData?.points || 0,
                saved: savedCount || 0,
                reviews: reviewsCount || 0,
                followers: followersCount || 0
            };

            const saveNode = document.getElementById('profileSavedCount');
            const revNode = document.getElementById('profileReviewCount');
            const folNode = document.getElementById('profileFollowerCount');
            const profilePoints = document.getElementById('profilePoints');
            const rewardsTabPoints = document.getElementById('rewardsTabPoints');
            
            if (saveNode) saveNode.textContent = stats.saved;
            if (revNode) revNode.textContent = stats.reviews;
            if (folNode) folNode.textContent = stats.followers;
            
            if (profilePoints) profilePoints.textContent = stats.points;
            if (rewardsTabPoints) rewardsTabPoints.textContent = stats.points;
            
            // Keep local storage in sync
            user.points = stats.points;
            user.saved_places = stats.saved;
            user.review_count = stats.reviews;
            user.follower_count = stats.followers;
            
            localStorage.setItem('user_vtkt', JSON.stringify(user));
            window.currentUser = user;
        } catch (e) {
            console.error("Gặp lỗi tải thông số:", e);
        }
    }


    // --- 2. UI Interactions (Theme, Tabs, Toast) ---

    // Toggle Dark Mode via Switch
    if (darkModeSwitch) {
        darkModeSwitch.addEventListener('change', (e) => {
            setDarkMode(e.target.checked);
        });
    }

    function setDarkMode(isDark) {
        if (isDark) {
            htmlEl.classList.add('dark');
            htmlEl.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme_vtkt', 'dark');
        } else {
            htmlEl.classList.remove('dark');
            htmlEl.setAttribute('data-theme', 'light');
            localStorage.setItem('theme_vtkt', 'light');
        }
    }

    // Bottom Navigation Logic
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');

            // Re-style buttons
            navBtns.forEach(b => {
                b.classList.remove('active', 'text-primary');
                b.classList.add('text-gray-400');
                const icon = b.querySelector('i');
                if (icon.classList.contains('fa-solid')) {
                    // icon.classList.replace('fa-solid', 'fa-regular'); // Optional: change style
                }
            });
            btn.classList.add('active', 'text-primary');
            btn.classList.remove('text-gray-400');

            // Show target tab
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === `tab-${targetId}`) {
                    tab.classList.add('active');

                    // If tab is profile or rewards, refresh user stats
                    if ((targetId === 'profile' || targetId === 'rewards') && window.updateProfileView) {
                        window.updateProfileView();
                    }
                }
            });
        });
    });

    // Toast Notification Maker
    window.showToast = function (message, type = 'success') {
        toastMsg.textContent = message;
        toast.style.opacity = '1';
        toast.style.pointerEvents = 'auto';
        toast.style.transform = 'translateX(-50%) translateY(10px)';

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.pointerEvents = 'none';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 3000);
    };

    // Custom Confirm Modal Logic
    const confirmModal = document.getElementById('customConfirmModal');
    const confirmMsg = document.getElementById('customConfirmMessage');
    const confirmOkBtn = document.getElementById('customConfirmOkBtn');
    const confirmCancelBtn = document.getElementById('customConfirmCancelBtn');

    window.showConfirm = function (message, onConfirm) {
        if (!confirmModal || !confirmMsg || !confirmOkBtn || !confirmCancelBtn) {
            // Fallback
            if (confirm(message)) onConfirm();
            return;
        }

        // Setup message
        confirmMsg.textContent = message;

        // Show modal
        confirmModal.classList.remove('hidden');
        confirmModal.classList.add('flex');

        // Setup animation
        const innerDiv = confirmModal.querySelector('div');
        setTimeout(() => {
            innerDiv.classList.remove('scale-95', 'opacity-0');
            innerDiv.classList.add('scale-100', 'opacity-100');
        }, 10);

        // One-time listeners
        const hideModal = () => {
            innerDiv.classList.remove('scale-100', 'opacity-100');
            innerDiv.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                confirmModal.classList.add('hidden');
                confirmModal.classList.remove('flex');
            }, 300);
        };

        const handleOk = () => {
            hideModal();
            cleanup();
            onConfirm();
        };

        const handleCancel = () => {
            hideModal();
            cleanup();
        };

        const cleanup = () => {
            confirmOkBtn.removeEventListener('click', handleOk);
            confirmCancelBtn.removeEventListener('click', handleCancel);
        };

        confirmOkBtn.addEventListener('click', handleOk);
        confirmCancelBtn.addEventListener('click', handleCancel);
    };

    // Logout Profile
    const logoutBtnProfile = document.getElementById('logoutBtnProfile');
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', () => {
            localStorage.removeItem('user_vtkt');
            showToast("Đã đăng xuất");
            setTimeout(() => window.location.reload(), 1000);
        });
    }

    // --- 10. Auth System UI Handling ---
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const switchAuthBtn = document.getElementById('switchAuthBtn');
    const switchAuthWrapper = document.getElementById('switchAuthWrapper');
    const authLoginForm = document.getElementById('authLoginForm');
    const authRegisterForm = document.getElementById('authRegisterForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const btnRegisterDirect = document.getElementById('btnRegisterDirect'); // New explicit register button

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            authOverlay.classList.remove('hidden');
        });
    }

    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            authOverlay.classList.add('hidden');
        });
    }

    if (btnRegisterDirect) {
        btnRegisterDirect.addEventListener('click', () => {
            authOverlay.classList.remove('hidden');
            if (switchAuthBtn && !authLoginForm.classList.contains('hidden')) {
                switchAuthBtn.click();
            }
        });
    }

    if (switchAuthBtn) {
        switchAuthBtn.addEventListener('click', () => {
            const isLoginVisible = !authLoginForm.classList.contains('hidden');
            if (isLoginVisible) {
                // Switch to Register
                authLoginForm.classList.add('hidden');
                authRegisterForm.classList.remove('hidden');
                authTitle.textContent = "Tạo tài khoản mới";
                authSubtitle.textContent = "Hoàn thành các thông tin bên dưới để bắt đầu.";
                switchAuthBtn.innerHTML = 'Đã có tài khoản? <span class="text-[#ff5500]">Đăng nhập</span>';
            } else {
                // Switch to Login
                authLoginForm.classList.remove('hidden');
                authRegisterForm.classList.add('hidden');
                authTitle.textContent = "Chào mừng trở lại!";
                authSubtitle.textContent = "Đăng nhập để tiếp tục khám phá Kon Tum cùng chúng tôi.";
                switchAuthBtn.innerHTML = 'Chưa có tài khoản? <span class="text-[#ff5500]">Đăng ký ngay</span>';
            }
        });
    }

    // Login Submission
    if (authLoginForm) {
        authLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!username || !password) {
                showToast("Vui lòng nhập đủ thông tin!", "error");
                return;
            }

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: username,
                    password: password
                });
                
                if (error) throw error;

                if (data.user) {
                    showToast("Đăng nhập thành công!", "success");
                    // Lấy thêm profile
                    const { data: profile } = await window.supabaseClient.from('profile').select('*').eq('id', data.user.id).single();
                    const userData = { ...data.user, ...profile };
                    localStorage.setItem('user_vtkt', JSON.stringify(userData));
                    window.currentUser = userData;
                    setTimeout(() => window.location.reload(), 1000);
                }
            } catch (err) {
                console.error(err);
                if (err.message && err.message.includes('Invalid login credentials')) {
                    showToast("Email hoặc mật khẩu sai", "error");
                } else {
                    showToast("Lỗi kết nối máy chủ.", "error");
                }
            }
        });
    }


    // --- 11. Report Module (Global) ---
    const reportModal = document.getElementById('reportModal');
    const closeReportModal = document.getElementById('closeReportModal');
    const btnSubmitReport = document.getElementById('btnSubmitReport');
    const reportEntityType = document.getElementById('reportEntityType');
    const reportEntityId = document.getElementById('reportEntityId');
    const reportReason = document.getElementById('reportReason');

    window.openReportModal = function (type, id, name = "mục này") {
        if (!currentUser) return showToast("Vui lòng đăng nhập để báo cáo", "error");
        if (reportModal) {
            reportEntityType.value = type;
            reportEntityId.value = id;
            document.getElementById('reportEntityDesc').textContent = `Bạn đang báo cáo: ${name}`;
            reportReason.value = '';

            reportModal.classList.remove('hidden');
            // Trigger animation
            setTimeout(() => {
                reportModal.children[0].classList.remove('scale-95', 'opacity-0');
            }, 10);
        }
    };

    if (closeReportModal) {
        closeReportModal.addEventListener('click', () => {
            reportModal.children[0].classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                reportModal.classList.add('hidden');
            }, 300);
        });
    }

    if (btnSubmitReport) {
        btnSubmitReport.addEventListener('click', async () => {
            const reason = reportReason.value.trim();
            if (!reason) return showToast("Vui lòng nhập lý do", "error");

            btnSubmitReport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btnSubmitReport.disabled = true;

            try {
                const { error } = await window.supabaseClient
                    .from('reports')
                    .insert([
                        { 
                            user_id: currentUser.id, 
                            entity_type: reportEntityType.value, 
                            entity_id: reportEntityId.value, 
                            reason: reason 
                        }
                    ]);
                
                if (error) throw error;
                showToast("Gửi báo cáo thành công", "success");
                closeReportModal.click();
            } catch (err) {
                showToast("Lỗi gửi báo cáo", "error");
            } finally {
                btnSubmitReport.innerHTML = 'Gửi Báo Cáo';
                btnSubmitReport.disabled = false;
            }
        });
    }

});


const profileLoginForm = document.getElementById('profileLoginForm');
const profileRegisterForm = document.getElementById('profileRegisterForm');
const profileForgotPasswordForm = document.getElementById('profileForgotPasswordForm');
const profileAuthToggleBtn = document.getElementById('profileAuthToggleBtn');
const forgotPasswordLinkBtn = document.getElementById('forgotPasswordLinkBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const socialLoginSection = document.getElementById('socialLoginSection');
const authToggleSection = document.getElementById('authToggleSection');

function switchAuthView(viewName) {
    if (profileLoginForm) profileLoginForm.classList.add('hidden');
    if (profileRegisterForm) profileRegisterForm.classList.add('hidden');
    if (profileForgotPasswordForm) profileForgotPasswordForm.classList.add('hidden');
    
    if (viewName === 'login') {
        if (profileLoginForm) profileLoginForm.classList.remove('hidden');
        if (socialLoginSection) socialLoginSection.classList.remove('hidden');
        if (authToggleSection) authToggleSection.classList.remove('hidden');
        const titleEl = document.getElementById('profileAuthTitle');
        const subtitleEl = document.getElementById('profileAuthSubtitle');
        const toggleTextEl = document.getElementById('profileAuthToggleText');
        if (titleEl) titleEl.textContent = 'Đăng nhập';
        if (subtitleEl) subtitleEl.textContent = 'Chào mừng trở lại! Vui lòng đăng nhập để trải nghiệm.';
        if (toggleTextEl) toggleTextEl.textContent = 'Chưa có tài khoản?';
        if (profileAuthToggleBtn) {
            profileAuthToggleBtn.textContent = 'Đăng ký ngay';
            profileAuthToggleBtn.dataset.target = 'register';
        }
    } else if (viewName === 'register') {
        if (profileRegisterForm) profileRegisterForm.classList.remove('hidden');
        if (socialLoginSection) socialLoginSection.classList.remove('hidden');
        if (authToggleSection) authToggleSection.classList.remove('hidden');
        const titleEl = document.getElementById('profileAuthTitle');
        const subtitleEl = document.getElementById('profileAuthSubtitle');
        const toggleTextEl = document.getElementById('profileAuthToggleText');
        if (titleEl) titleEl.textContent = 'Tạo tài khoản mới';
        if (subtitleEl) subtitleEl.textContent = 'Đăng ký ngay để chia sẻ trải nghiệm của bạn.';
        if (toggleTextEl) toggleTextEl.textContent = 'Đã có tài khoản?';
        if (profileAuthToggleBtn) {
            profileAuthToggleBtn.textContent = 'Đăng nhập';
            profileAuthToggleBtn.dataset.target = 'login';
        }
    } else if (viewName === 'forgot') {
        if (profileForgotPasswordForm) profileForgotPasswordForm.classList.remove('hidden');
        if (socialLoginSection) socialLoginSection.classList.add('hidden');
        if (authToggleSection) authToggleSection.classList.add('hidden');
        const titleEl = document.getElementById('profileAuthTitle');
        const subtitleEl = document.getElementById('profileAuthSubtitle');
        if (titleEl) titleEl.textContent = 'Quên mật khẩu?';
        if (subtitleEl) subtitleEl.textContent = 'Nhập email của bạn và chúng tôi sẽ gửi liên kết đặt lại mật khẩu của bạn qua đó.';
    }
}

if (profileAuthToggleBtn) {
    profileAuthToggleBtn.dataset.target = 'register';
    profileAuthToggleBtn.addEventListener('click', () => {
        const target = profileAuthToggleBtn.dataset.target;
        switchAuthView(target);
    });
}

if (forgotPasswordLinkBtn) {
    forgotPasswordLinkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthView('forgot');
    });
}

if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthView('login');
    });
}

if (profileLoginForm) {
    profileLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('profileLoginUsername').value;
        const p = document.getElementById('profileLoginPassword').value;
        const btn = profileLoginForm.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: u,
                password: p
            });
            if (error) throw error;
            if (data.user) {
                const { data: profile } = await window.supabaseClient.from('profile').select('*').eq('id', data.user.id).single();
                const userData = { ...data.user, ...profile };
                localStorage.setItem('user_vtkt', JSON.stringify(userData));
                if (typeof showToast === 'function') showToast("Đăng nhập thành công!", "success");
                setTimeout(() => window.location.reload(), 500);
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast(err.message || "Tên đăng nhập hoặc mật khẩu sai", "error");
        } finally {
            btn.innerHTML = 'Đăng nhập';
            btn.disabled = false;
        }
    });
}

if (profileRegisterForm) {
    profileRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = document.getElementById('profileRegFullname').value;
        const u = document.getElementById('profileRegUsername').value;
        const p = document.getElementById('profileRegPassword').value;
        const btn = profileRegisterForm.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: u,
                password: p,
                options: {
                    data: {
                        fullname: f,
                        username: u,
                        points: 0,
                        is_admin: 0
                    }
                }
            });
            if (error) throw error;
            
            if (data.user) {
                const { data: profile } = await window.supabaseClient.from('profile').select('*').eq('id', data.user.id).single();
                const userData = { ...data.user, ...(profile || { fullname: f, username: u, points: 0, is_admin: 0 }) };
                localStorage.setItem('user_vtkt', JSON.stringify(userData));
                if (typeof showToast === 'function') showToast("Đăng ký thành công!", "success");
                setTimeout(() => window.location.reload(), 500);
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast(err.message || "Đăng ký thất bại", "error");
        } finally {
            btn.innerHTML = 'Tạo tài khoản';
            btn.disabled = false;
        }
    });
}

if (profileForgotPasswordForm) {
    profileForgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('profileForgotEmail').value;
        const btn = profileForgotPasswordForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        try {
            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            
            if (error) throw error;
            if (typeof showToast === 'function') showToast("Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email của bạn.", "success");
            
            // Switch back to login view after success
            setTimeout(() => {
                switchAuthView('login');
            }, 3000);
            
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast(err.message || "Có lỗi xảy ra, thử lại sau", "error");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- Lightbox Support ---
window.openLightbox = function (imgSrc) {
    const modal = document.getElementById("imageLightboxModal");
    const imgElement = document.getElementById("lightboxImage");
    if (modal && imgElement) {
        imgElement.src = imgSrc;
        modal.classList.remove("hidden");
        setTimeout(() => {
            imgElement.classList.remove("scale-95", "opacity-0");
        }, 10);
    }
};

// --- Geolocation Prompt ---
if (!localStorage.getItem('location_asked')) {
    localStorage.setItem('location_asked', 'true');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => { }, () => { });
    }
}
