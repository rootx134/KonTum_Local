/**
 * Supabase API Service Wrapper
 * Provides structured access to Supabase SDK replacing legacy backend PHP APIs.
 */

window.apiService = {

    /**
     * REVIEW & FEED APIs
     */
    getFeed: async function(userId) {
        const { data, error } = await window.supabaseClient
            .from('reviews')
            .select(`
                *,
                profile (fullname, avatar),
                places (name, thumbnail),
                likes (user_id),
                comments (id)
            `)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) { console.error('Error fetching feed:', error); return []; }
        
        return data.map(r => ({
            ...r,
            fullname: r.profile?.fullname || 'Ẩn danh',
            avatar: r.profile?.avatar || 'default_avatar.png',
            place_name: r.places?.name || 'Unknown',
            place_thumbnail: r.places?.thumbnail || 'default_place.jpg',
            like_count: r.likes?.length || 0,
            likes_count: r.likes?.length || 0,
            total_likes: r.likes?.length || 0,
            comment_count: r.comments?.length || 0,
            total_comments: r.comments?.length || 0,
            is_liked: userId ? r.likes?.some(l => l.user_id == userId) : false
        }));
    },

    getPlaceReviews: async function(placeId, userId) {
        const { data, error } = await window.supabaseClient
            .from('reviews')
            .select(`
                *,
                profile (fullname, avatar),
                likes (user_id),
                comments (id)
            `)
            .eq('place_id', placeId)
            .order('created_at', { ascending: false });

        if (error) { console.error('Error fetching place reviews:', error); return []; }

        return data.map(r => ({
            ...r,
            fullname: r.profile?.fullname || 'Ẩn danh',
            avatar: r.profile?.avatar || 'default_avatar.png',
            like_count: r.likes?.length || 0,
            likes_count: r.likes?.length || 0,
            total_likes: r.likes?.length || 0,
            comment_count: r.comments?.length || 0,
            total_comments: r.comments?.length || 0,
            is_liked: userId ? r.likes?.some(l => l.user_id == userId) : false
        }));
    },

    getComments: async function(reviewId) {
        const { data, error } = await window.supabaseClient
            .from('comments')
            .select(`
                *,
                profile (fullname, avatar)
            `)
            .eq('review_id', reviewId)
            .order('created_at', { ascending: true });

        if (error) { console.error('Error fetching comments:', error); return []; }

        return data.map(c => ({
            ...c,
            fullname: c.profile?.fullname || 'Ẩn danh',
            avatar: c.profile?.avatar || 'default_avatar.png'
        }));
    },

    addComment: async function(userId, reviewId, content) {
        const { data, error } = await window.supabaseClient
            .from('comments')
            .insert([{ user_id: userId, review_id: reviewId, content: content }])
            .select();

        if (error) { console.error('Error adding comment:', error); return { status: 'error', message: 'Lỗi khi bình luận' }; }
        return { status: 'success', message: 'Đã bình luận' };
    },

    toggleLike: async function(userId, reviewId) {
        // Check if exists
        const { data: existing, error: errCheck } = await window.supabaseClient
            .from('likes')
            .select('id')
            .eq('user_id', userId)
            .eq('review_id', reviewId);

        if (errCheck) return { status: 'error' };

        if (existing.length > 0) {
            // Remove
            const { error: errDel } = await window.supabaseClient
                .from('likes')
                .delete()
                .eq('id', existing[0].id);
            if (errDel) return { status: 'error' };
            return { status: 'success', liked: false };
        } else {
            // Add
            const { error: errAdd } = await window.supabaseClient
                .from('likes')
                .insert([{ user_id: userId, review_id: reviewId }]);
            if (errAdd) return { status: 'error' };
            
            // Also add point
            await this.addPoints(userId, 1, 'Thích bài viết');
            // Notification
            const { data: review } = await window.supabaseClient.from('reviews').select('user_id').eq('id', reviewId).single();
            if (review && review.user_id !== userId) {
                await this.addNotification(review.user_id, 'like', reviewId, 'Ai đó đã thích bài viết của bạn');
            }
            return { status: 'success', liked: true };
        }
    },

    toggleSave: async function(userId, entityType, entityId) {
        const { data: existing, error: errCheck } = await window.supabaseClient
            .from('saved')
            .select('id')
            .eq('user_id', userId)
            .eq('entity_type', entityType)
            .eq('entity_id', entityId);

        if (errCheck) return { status: 'error' };

        if (existing.length > 0) {
            const { error: errDel } = await window.supabaseClient.from('saved').delete().eq('id', existing[0].id);
            if (errDel) return { status: 'error' };
            return { status: 'success', saved: false, message: 'Đã bỏ lưu' };
        } else {
            const { error: errAdd } = await window.supabaseClient
                .from('saved')
                .insert([{ user_id: userId, entity_type: entityType, entity_id: entityId }]);
            if (errAdd) return { status: 'error' };
            return { status: 'success', saved: true, message: 'Đã lưu thành công' };
        }
    },

    /**
     * USER INTERACTIONS
     */
    getFollowing: async function(userId) {
        const { data, error } = await window.supabaseClient
            .from('followers')
            .select('following_id')
            .eq('follower_id', userId);
            
        if (error) { console.error('Error fetching following:', error); return []; }
        return data.map(f => f.following_id);
    },

    toggleFollow: async function(followerId, followedId) {
        const { data: existing, error: errCheck } = await window.supabaseClient
            .from('followers')
            .select('id')
            .eq('follower_id', followerId)
            .eq('following_id', followedId);

        if (errCheck) return { status: 'error' };

        if (existing.length > 0) {
            const { error: errDel } = await window.supabaseClient.from('followers').delete().eq('id', existing[0].id);
            if (errDel) return { status: 'error' };
            return { status: 'success', following: false, message: 'Đã bỏ theo dõi' };
        } else {
            const { error: errAdd } = await window.supabaseClient
                .from('followers')
                .insert([{ follower_id: followerId, following_id: followedId }]);
            if (errAdd) return { status: 'error' };
            await this.addNotification(followedId, 'follow', followerId, 'Ai đó đã bắt đầu theo dõi bạn');
            return { status: 'success', following: true, message: 'Đã theo dõi' };
        }
    },

    addPoints: async function(userId, points, description) {
        await window.supabaseClient.from('points_history').insert([{ user_id: userId, points, reason: description }]);
        const { data: user } = await window.supabaseClient.from('profile').select('points').eq('id', userId).single();
        if (user) {
            await window.supabaseClient.from('profile').update({ points: user.points + points }).eq('id', userId);
        }
    },

    addNotification: async function(userId, type, referenceId, msg) {
        let title = 'Thông báo mới';
        if (type === 'follow') title = 'Người theo dõi mới';
        if (type === 'like') title = 'Lượt thích mới';

        await window.supabaseClient.from('notifications').insert([{
            user_id: userId,
            title: title,
            content: msg,
            is_read: 0
        }]);
    },

    /**
     * PLACES & SEARCH
     */
    getCategories: async function() {
        const { data, error } = await window.supabaseClient
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
        if (error) { console.error('Error fetching categories:', error); return []; }
        return data;
    },

    getPlaces: async function(params = {}) {
        let query = window.supabaseClient
            .from('places')
            .select('*, reviews(rating)');
            
        if (params.category_id) query = query.eq('category_id', params.category_id);
        
        if (params.limit) query = query.limit(params.limit);
        
        const { data, error } = await query;
        if (error) { console.error('Error fetching places:', error); return []; }
        
        let enriched = (data || []).map(p => {
            const revs = p.reviews || [];
            const avg = revs.length > 0 ? revs.reduce((sum, r) => sum + r.rating, 0) / revs.length : 0;
            return {
                ...p,
                review_count: revs.length,
                average_rating: avg
            };
        });

        if (params.sort === 'top_rated') {
            enriched.sort((a,b) => b.average_rating - a.average_rating || new Date(b.created_at) - new Date(a.created_at));
        } else {
            enriched.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return enriched;
    },

    getPlaceDetail: async function(placeId) {
        const { data: place, error } = await window.supabaseClient
            .from('places')
            .select('*, categories (name), place_images (image_url), reviews(rating)')
            .eq('id', placeId)
            .single();

        if (error || !place) return { status: 'error' };

        // Process images array
        let images = [place.thumbnail];
        if (place.place_images && place.place_images.length > 0) {
            images = images.concat(place.place_images.map(img => img.image_url));
        }
        
        const revs = place.reviews || [];
        const avg = revs.length > 0 ? revs.reduce((sum, r) => sum + r.rating, 0) / revs.length : 0;

        return {
            status: 'success',
            place: {
                ...place,
                category_name: place.categories?.name,
                images: images,
                review_count: revs.length,
                average_rating: avg
            }
        };
    },

    searchPlaces: async function(searchQuery) {
        const { data, error } = await window.supabaseClient
            .from('places')
            .select('id, name, address, thumbnail')
            .ilike('name', `%${searchQuery}%`)
            .limit(10);
            
        if (error) { console.error('Error searching:', error); return []; }
        return data;
    },

    getActiveBanners: async function() {
        const { data, error } = await window.supabaseClient
            .from('banners')
            .select('*')
            .eq('is_active', 1)
            .order('created_at', { ascending: false });
        if (error) return [];
        return data;
    },

    /**
     * ADMIN ACTIONS
     */
    adminDeleteReview: async function(adminId, reviewId) {
        const { data: admin } = await window.supabaseClient.from('profile').select('is_admin').eq('id', adminId).single();
        if (!admin || !admin.is_admin) return { status: 'error', message: 'Unauthorized' };

        const { error } = await window.supabaseClient.from('reviews').delete().eq('id', reviewId);
        if (error) return { status: 'error', message: 'Lỗi khi xoá bài viết' };
        return { status: 'success', message: 'Đã xoá bài viết do vi phạm' };
    },

    adminDeletePlace: async function(adminId, placeId) {
        const { data: admin } = await window.supabaseClient.from('profile').select('is_admin').eq('id', adminId).single();
        if (!admin || !admin.is_admin) return { status: 'error', message: 'Unauthorized' };

        const { error } = await window.supabaseClient.from('places').delete().eq('id', placeId);
        if (error) return { status: 'error', message: 'Lỗi khi xoá địa điểm' };
        return { status: 'success', message: 'Xoá địa điểm thành công' };
    },

    adminEditPlace: async function(adminId, placeId, updateData) {
        const { data: admin } = await window.supabaseClient.from('profile').select('is_admin').eq('id', adminId).single();
        if (!admin || !admin.is_admin) return { status: 'error', message: 'Unauthorized' };

        const { error } = await window.supabaseClient.from('places').update({
            name: updateData.name,
            address: updateData.address,
            category_id: updateData.category_id
        }).eq('id', placeId);

        if (error) return { status: 'error', message: 'Lỗi lưu thông tin' };
        return { status: 'success', message: 'Cập nhật thành công' };
    },
    
    adminDeletePlaceImage: async function(adminId, imageId) {
        const { data: admin } = await window.supabaseClient.from('profile').select('is_admin').eq('id', adminId).single();
        if (!admin || !admin.is_admin) return { status: 'error', message: 'Unauthorized' };

        const { error } = await window.supabaseClient.from('place_images').delete().eq('id', imageId);
        if (error) return { status: 'error', message: 'Lỗi xoá ảnh' };
        return { status: 'success', message: 'Xoá ảnh thành công' };
    },

    /**
     * REALTIME INTERACTIONS
     * Lắng nghe database realtime để cập nhật số đếm tim/comments
     */
    initRealtimeInteractions: function() {
        if (!window.supabaseClient) return;

        console.log("Initializing Supabase Realtime for Interactions...");
        const channel = window.supabaseClient.channel('public:interactions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, payload => {
                window.dispatchEvent(new CustomEvent('review_liked', { detail: { review_id: payload.new.review_id, user_id: payload.new.user_id } }));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, payload => {
                window.dispatchEvent(new CustomEvent('review_unliked', { detail: { review_id: payload.old.review_id, user_id: payload.old.user_id } }));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                window.dispatchEvent(new CustomEvent('review_commented', { detail: { review_id: payload.new.review_id, user_id: payload.new.user_id } }));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, payload => {
                window.dispatchEvent(new CustomEvent('review_uncommented', { detail: { review_id: payload.old.review_id, user_id: payload.old.user_id } }));
            })
            .subscribe();
    }
};

// Gọi init realtime khi script được load (nếu supabaseClient đã ready, nếu không có thể để main.js gọi)
document.addEventListener('DOMContentLoaded', () => {
    if (window.apiService && typeof window.apiService.initRealtimeInteractions === 'function') {
        window.apiService.initRealtimeInteractions();
    }
});

// Fetch Interceptor for Supabase
const originalFetch = window.fetch;
window.fetch = async function(resource, config) {
    let urlStr;
    if (typeof resource === 'string') {
        urlStr = resource;
    } else if (resource instanceof Request) {
        urlStr = resource.url;
    } else {
        urlStr = resource.toString();
    }

    // Only intercept our API
    if (urlStr.includes('.php')) {
        const urlObj = new URL(urlStr, window.location.origin);
        let action = urlObj.searchParams.get('action');
        let bodyObj = {};
        let isFormData = false;

        if (config && config.body) {
            if (config.body instanceof FormData) {
                isFormData = true;
                for (let [key, value] of config.body.entries()) {
                    bodyObj[key] = value;
                }
            } else {
                try {
                    if (typeof config.body === 'string') bodyObj = JSON.parse(config.body);
                } catch (e) {}
            }
        }

        const act = action || bodyObj.action;

        // Route actions to Supabase API Service
        switch(act) {
            case 'get_feed':
                return new Response(JSON.stringify(await window.apiService.getFeed(urlObj.searchParams.get('user_id'))));
            case 'get_place_reviews':
                return new Response(JSON.stringify(await window.apiService.getPlaceReviews(
                    urlObj.searchParams.get('place_id'), 
                    urlObj.searchParams.get('user_id')
                )));
            case 'get_comments':
                return new Response(JSON.stringify(await window.apiService.getComments(urlObj.searchParams.get('review_id'))));
            case 'add_comment':
                return new Response(JSON.stringify(await window.apiService.addComment(bodyObj.user_id, bodyObj.review_id, bodyObj.content)));
            case 'toggle_like':
                return new Response(JSON.stringify(await window.apiService.toggleLike(bodyObj.user_id, bodyObj.review_id)));
            case 'toggle_save':
                return new Response(JSON.stringify(await window.apiService.toggleSave(bodyObj.user_id, bodyObj.entity_type, bodyObj.entity_id || bodyObj.place_id)));
            case 'get_following':
                return new Response(JSON.stringify(await window.apiService.getFollowing(urlObj.searchParams.get('user_id'))));
            case 'toggle_follow':
                return new Response(JSON.stringify(await window.apiService.toggleFollow(bodyObj.follower_id, bodyObj.followed_id)));
            case 'get_categories':
                return new Response(JSON.stringify(await window.apiService.getCategories()));
            case 'get_places':
                return new Response(JSON.stringify(await window.apiService.getPlaces({
                    category_id: urlObj.searchParams.get('category_id'),
                    sort: urlObj.searchParams.get('sort'),
                    limit: urlObj.searchParams.get('limit')
                })));
            case 'get_place_detail':
                return new Response(JSON.stringify(await window.apiService.getPlaceDetail(urlObj.searchParams.get('id'))));
            case 'search':
                return new Response(JSON.stringify(await window.apiService.searchPlaces(urlObj.searchParams.get('q'))));
            case 'get_active_banners':
                return new Response(JSON.stringify(await window.apiService.getActiveBanners()));
            case 'admin_delete_review':
                return new Response(JSON.stringify(await window.apiService.adminDeleteReview(bodyObj.admin_id, bodyObj.review_id)));
            case 'admin_delete_place':
                return new Response(JSON.stringify(await window.apiService.adminDeletePlace(bodyObj.admin_id, bodyObj.place_id)));
            case 'admin_delete_place_image':
                return new Response(JSON.stringify(await window.apiService.adminDeletePlaceImage(bodyObj.admin_id, bodyObj.image_id)));
            case 'admin_edit_place':
                return new Response(JSON.stringify(await window.apiService.adminEditPlace(bodyObj.admin_id, bodyObj.place_id, bodyObj)));
            case 'add_review':
                {
                    const { data, error } = await window.supabaseClient.from('reviews')
                        .insert([{
                            user_id: bodyObj.user_id,
                            place_id: bodyObj.place_id,
                            rating: bodyObj.rating,
                            content: bodyObj.content,
                            images: bodyObj.images_json ? JSON.parse(bodyObj.images_json) : null
                        }]);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    await window.apiService.addPoints(bodyObj.user_id, 10, 'Viết đánh giá');
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'add_place':
                {
                    let imgs = (bodyObj.images && bodyObj.images.length > 0) ? bodyObj.images : null;
                    if (!imgs && bodyObj.images_json) imgs = JSON.parse(bodyObj.images_json);
                    
                    const { data, error } = await window.supabaseClient.from('places')
                        .insert([{
                            name: bodyObj.name,
                            category_id: bodyObj.category_id,
                            address: bodyObj.address,
                            thumbnail: (imgs && imgs.length > 0) ? imgs[0] : null,
                            owner_id: bodyObj.user_id,
                            latitude: bodyObj.latitude,
                            longitude: bodyObj.longitude,
                            status: 'pending'
                        }]).select().single();
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    
                    if (imgs && imgs.length > 1) {
                        const imagesData = imgs.slice(1).map(url => ({
                            place_id: data.id,
                            image_url: url
                        }));
                        await window.supabaseClient.from('place_images').insert(imagesData);
                    }
                    return new Response(JSON.stringify({ status: 'success', message: 'Đã gửi địa điểm chờ duyệt' }));
                }
            case 'get_saved_places':
                {
                    const { data: savedIds } = await window.supabaseClient.from('saved').select('entity_id').eq('user_id', urlObj.searchParams.get('user_id')).eq('entity_type', 'place');
                    if (!savedIds || savedIds.length === 0) return new Response(JSON.stringify([]));
                    const ids = savedIds.map(d => d.entity_id);
                    const { data: places } = await window.supabaseClient.from('places').select('*, reviews(rating)').in('id', ids);
                    let enriched = (places||[]).map(p => {
                        const revs = p.reviews || [];
                        const avg = revs.length > 0 ? revs.reduce((sum, r) => sum + r.rating, 0) / revs.length : 0;
                        return { ...p, review_count: revs.length, average_rating: avg };
                    });
                    return new Response(JSON.stringify(enriched));
                }
            case 'get_saved_reviews':
                {
                    const { data: savedIds } = await window.supabaseClient.from('saved').select('entity_id').eq('user_id', urlObj.searchParams.get('user_id')).eq('entity_type', 'review');
                    if (!savedIds || savedIds.length === 0) return new Response(JSON.stringify([]));
                    const ids = savedIds.map(d => d.entity_id);
                    const { data: reviews } = await window.supabaseClient.from('reviews').select('*, profile(fullname, avatar), likes(user_id), comments(id)').in('id', ids);
                    let enriched = (reviews||[]).map(r => ({
                        ...r,
                        fullname: r.profile?.fullname || 'Ẩn danh',
                        avatar: r.profile?.avatar || 'default_avatar.png',
                        like_count: r.likes?.length || 0,
                        likes_count: r.likes?.length || 0,
                        total_likes: r.likes?.length || 0,
                        comment_count: r.comments?.length || 0,
                        total_comments: r.comments?.length || 0
                    }));
                    return new Response(JSON.stringify(enriched));
                }
            case 'get_my_reviews':
                {
                    const { data } = await window.supabaseClient.from('reviews').select('*, places(name)').eq('user_id', urlObj.searchParams.get('user_id'));
                    return new Response(JSON.stringify(data.map(d => ({ ...d, place_name: d.places?.name }))));
                }
            case 'get_points_history':
                {
                    const { data } = await window.supabaseClient.from('points_history').select('*').eq('user_id', urlObj.searchParams.get('user_id')).order('created_at', { ascending: false });
                    return new Response(JSON.stringify(data));
                }
            case 'get_notifications':
                {
                    const { data } = await window.supabaseClient.from('notifications').select('*').eq('user_id', urlObj.searchParams.get('user_id')).order('created_at', { ascending: false });
                    return new Response(JSON.stringify(data));
                }
            case 'get_pending_places':
                {
                    const { data } = await window.supabaseClient.from('places').select('*').eq('status', 'pending');
                    return new Response(JSON.stringify(data));
                }
            case 'approve_place':
                {
                    const { error } = await window.supabaseClient.from('places').update({ status: 'approved' }).eq('id', bodyObj.place_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'reject_place':
                {
                    const { error } = await window.supabaseClient.from('places').update({ status: 'rejected' }).eq('id', bodyObj.place_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'get_reports':
                {
                    const { data } = await window.supabaseClient.from('reports').select('*').order('created_at', { ascending: false });
                    return new Response(JSON.stringify(data));
                }
            case 'resolve_report':
                {
                    const { error } = await window.supabaseClient.from('reports').update({ status: 'resolved' }).eq('id', bodyObj.report_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'get_users':
                {
                    const { data } = await window.supabaseClient.from('profile').select('*').order('created_at', { ascending: false });
                    return new Response(JSON.stringify(data));
                }
            case 'toggle_user_status':
                {
                    const { error } = await window.supabaseClient.from('profile').update({ status: bodyObj.status }).eq('id', bodyObj.user_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'get_banners':
                {
                    const { data } = await window.supabaseClient.from('banners').select('*').order('created_at', { ascending: false });
                    return new Response(JSON.stringify(data));
                }
            case 'add_banner':
                {
                    const { error } = await window.supabaseClient.from('banners').insert([{ image_url: bodyObj.image_url, link: bodyObj.link, is_active: 1 }]);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'toggle_banner':
                {
                    const { data } = await window.supabaseClient.from('banners').select('is_active').eq('id', bodyObj.banner_id).single();
                    if (data) {
                        const { error } = await window.supabaseClient.from('banners').update({ is_active: data.is_active ? 0 : 1 }).eq('id', bodyObj.banner_id);
                        if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    }
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'delete_banner':
                {
                    const { error } = await window.supabaseClient.from('banners').delete().eq('id', bodyObj.banner_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'update_profile':
                {
                    const updateData = {};
                    if (bodyObj.fullname !== undefined) updateData.fullname = bodyObj.fullname;
                    if (bodyObj.phone !== undefined) updateData.phone = bodyObj.phone;
                    if (bodyObj.avatar !== undefined) updateData.avatar = bodyObj.avatar;

                    const { error } = await window.supabaseClient.from('profile')
                        .update(updateData)
                        .eq('id', bodyObj.user_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success', message: 'Cập nhật thành công!' }));
                }
            case 'update_settings':
                {
                    const { error } = await window.supabaseClient.from('profile')
                        .update({ dark_mode: bodyObj.dark_mode ? 1 : 0 })
                        .eq('id', bodyObj.user_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success' }));
                }
            case 'update_avatar':
                {
                    const { error } = await window.supabaseClient.from('profile')
                        .update({ avatar: bodyObj.avatar_url })
                        .eq('id', bodyObj.user_id);
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success', message: 'Đã đổi ảnh đại diện' }));
                }
            case 'get_stats':
                {
                    const profileData = await window.supabaseClient.from('profile').select('points').eq('id', bodyObj.user_id).single();
                    const { count: savedCount } = await window.supabaseClient.from('saved').select('*', { count: 'exact', head: true }).eq('user_id', bodyObj.user_id).eq('entity_type', 'place');
                    const { count: reviewCount } = await window.supabaseClient.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', bodyObj.user_id);
                    const { count: followerCount } = await window.supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', bodyObj.user_id);
                    
                    return new Response(JSON.stringify({ 
                        status: 'success', 
                        stats: {
                            points: profileData.data?.points || 0,
                            saved: savedCount || 0,
                            reviews: reviewCount || 0,
                            followers: followerCount || 0
                        }
                    }));
                }
            case 'update_password':
                {
                    const { error } = await window.supabaseClient.auth.updateUser({ password: bodyObj.new_password });
                    if (error) return new Response(JSON.stringify({ status: 'error', message: error.message }));
                    return new Response(JSON.stringify({ status: 'success', message: 'Đổi mật khẩu thành công!' }));
                }
        }
        
        // Handle file uploads (upload.php, upload_place_image.php)
        if (urlStr.includes('upload.php') || urlStr.includes('upload_place_image.php')) {
            if (isFormData && bodyObj.file) {
                const file = bodyObj.file;
                const path = bodyObj.user_id ? `avatars/${bodyObj.user_id}_${Date.now()}.png` : `places/${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadError } = await window.supabaseClient
                    .storage
                    .from('uploads')
                    .upload(path, file);

                if (uploadError) {
                    return new Response(JSON.stringify({ status: 'error', message: uploadError.message }));
                }

                const { data: { publicUrl } } = window.supabaseClient.storage.from('uploads').getPublicUrl(path);

                // If avatar upload, update profile
                if (urlStr.includes('upload.php') && bodyObj.user_id) {
                    await window.supabaseClient.from('profile').update({ avatar: publicUrl }).eq('id', bodyObj.user_id);
                }

                return new Response(JSON.stringify({ status: 'success', file_url: publicUrl }));
            }
        }
        
        // Unhandled intercept
        console.warn('Unhandled Supabase API proxy endpoint:', act, urlStr);
    }
    
    return originalFetch.apply(this, arguments);
};
