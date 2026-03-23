/**
 * map.js — Phase 4/5: Interactive Map with Leaflet & OSM (Miễn phí)
 * Kon Tum Local — Bản đồ địa điểm tương tác
 */

// Map Initialization
const API_URL_MAP = window.API_BASE_URL + '/api';

// Category color config
const CATEGORY_COLORS = {
    1: { color: '#ff5500', icon: 'fa-utensils', label: 'Ăn uống' },
    2: { color: '#8b5cf6', icon: 'fa-gamepad', label: 'Giải trí' },
    3: { color: '#3b82f6', icon: 'fa-hotel', label: 'Khách sạn' },
    4: { color: '#10b981', icon: 'fa-camera', label: 'Du lịch' },
    5: { color: '#6b7280', icon: 'fa-map-pin', label: 'Khác' }
};
const DEFAULT_CAT = CATEGORY_COLORS[5];

// Kon Tum City center
const KT_CENTER = [14.3544, 107.9844];
const KT_ZOOM = 13;

let mapInstance = null;
let allMarkers = [];
let currentFilter = 0; // 0 = all
let coordPickerMap = null;
let coordPickerMarker = null;

/**
 * Custom SVG Map Marker
 */
const createCustomIcon = (color, faClass) => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                <i class="fa-solid ${faClass}" style="color: white; transform: rotate(45deg); font-size: 13px;"></i>
            </div>
            <div style="width: 8px; height: 8px; background: rgba(0,0,0,0.4); border-radius: 50%; margin-top: 4px; margin-left: 12px; filter: blur(2px);"></div>
        `,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -38]
    });
};

function initMapTab() {
    if (mapInstance || typeof trackasiagl === 'undefined') {
        if (mapInstance) mapInstance.resize();
        return;
    }

    // Create map
    mapInstance = new trackasiagl.Map({
        container: 'leafletMap',
        style: 'https://maps.track-asia.com/styles/v2/streets.json?key=0b01772742917cee17029230a2aa2225b1',
        center: [KT_CENTER[1], KT_CENTER[0]],
        zoom: KT_ZOOM,
        attributionControl: false
    });

    mapInstance.on('load', () => {
        // Load places
        loadMapPlaces();
    });

    // Filter buttons
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active-filter'));
            btn.classList.add('active-filter');
            currentFilter = parseInt(btn.dataset.catId || '0');
            filterMarkers(currentFilter);
        });
    });

    // Locate me button
    const locateBtn = document.getElementById('mapLocateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return;
            locateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            navigator.geolocation.getCurrentPosition(pos => {
                const myPos = [pos.coords.longitude, pos.coords.latitude];
                mapInstance.flyTo({ center: myPos, zoom: 16 });
                locateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';

                // Add user marker
                const el = document.createElement('div');
                el.className = 'my-location-marker';
                el.style.width = '16px';
                el.style.height = '16px';
                el.style.backgroundColor = '#ff5500';
                el.style.border = '2px solid white';
                el.style.borderRadius = '50%';
                el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

                new trackasiagl.Marker({ element: el })
                    .setLngLat(myPos)
                    .setPopup(new trackasiagl.Popup({ offset: 25 }).setText('Vị trí của bạn'))
                    .addTo(mapInstance)
                    .togglePopup();
            }, () => {
                locateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
            });
        });
    }
}

/**
 * Fetch places from API and add Leaflet markers
 */
async function loadMapPlaces() {
    try {
        const loadingEl = document.getElementById('mapLoadingOverlay');
        if (loadingEl) loadingEl.classList.remove('hidden');

        if (!window.supabaseClient) throw new Error('Supabase client not initialized');

        const { data: placesData, error } = await window.supabaseClient
            .from('places')
            .select(`
                id, name, address, latitude, longitude, category_id, status,
                place_images(image_url),
                reviews(rating)
            `)
            .eq('status', 'approved')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map data to match expected format
        const data = (placesData || []).map(p => {
            const rCount = p.reviews ? p.reviews.length : 0;
            const rAvg = rCount > 0 ? (p.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / rCount) : 0;
            const thumb = (p.place_images && p.place_images.length > 0) ? p.place_images[0].image_url : null;
            
            return {
                id: p.id,
                name: p.name,
                address: p.address,
                latitude: p.latitude,
                longitude: p.longitude,
                category_id: p.category_id,
                review_count: rCount,
                average_rating: rAvg,
                thumbnail: thumb
            };
        });

        if (loadingEl) loadingEl.classList.add('hidden');

        if (!Array.isArray(data) || data.length === 0) {
            showMapEmptyState();
            return;
        }

        data.forEach(place => addMarker(place));
        updateMapCount(data.length);

        // Show info bar
        const infoBar = document.getElementById('mapInfoBar');
        if (infoBar) infoBar.classList.remove('hidden');
    } catch (err) {
        console.error('Map load error:', err);
        const loadingEl = document.getElementById('mapLoadingOverlay');
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

/**
 * Create and add a styled Leaflet marker for a place
 */
function addMarker(place) {
    if (!place.latitude || !place.longitude) return;

    const cat = CATEGORY_COLORS[place.category_id] || DEFAULT_CAT;
    const stars = generateStars(place.average_rating);

    const thumbnail = place.thumbnail && place.thumbnail !== 'default_place.jpg'
        ? (place.thumbnail.startsWith('http') ? place.thumbnail : `${window.API_BASE_URL || ''}/${place.thumbnail}`)
        : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=60&w=300';

    const popupContent = `
        <div class="w-48">
            <div class="h-24 w-full bg-gray-200 rounded-t-lg overflow-hidden relative">
                <img src="${thumbnail}" class="w-full h-full object-cover">
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-bold flex items-center gap-1">
                    <i class="fa-solid fa-star text-orange-400"></i> ${Number(place.average_rating || 0).toFixed(1)}
                </div>
            </div>
            <div class="p-3 bg-white rounded-b-lg">
                <h3 class="font-bold text-sm text-gray-900 leading-tight mb-1 line-clamp-1">${place.name}</h3>
                <p class="text-[10px] text-gray-500 line-clamp-1 mb-2">
                    <i class="fa-solid fa-location-dot w-3"></i> ${place.address}
                </p>
                <button onclick="window.openPlaceFromMap(this)" data-place='${JSON.stringify(place).replace(/'/g, "&apos;")}' data-img="${thumbnail}" data-rating="${place.average_rating}" data-reviews="${place.review_count}" class="w-full bg-[#ff5500] hover:bg-[#ff7333] text-white text-[10px] font-bold py-1.5 rounded-md transition-colors">
                    Xem chi tiết
                </button>
            </div>
        </div>
    `;

    const el = document.createElement('div');
    el.innerHTML = `
        <div style="background-color: ${cat.color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <i class="${cat.icon}" style="color: white; transform: rotate(45deg); font-size: 13px;"></i>
        </div>
    `;
    el.style.width = '32px';
    el.style.height = '44px';
    el.style.cursor = 'pointer';

    const popup = new trackasiagl.Popup({ offset: [0, -38], closeButton: false, className: 'leaflet-custom-popup' })
        .setHTML(popupContent);

    const marker = new trackasiagl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .setPopup(popup)
        .addTo(mapInstance);

    allMarkers.push({ marker: marker, category_id: place.category_id });
}

/**
 * Filter visible markers by category
 */
function filterMarkers(catId) {
    let count = 0;
    allMarkers.forEach(({ marker, category_id }) => {
        const mCat = parseInt(category_id || '0');
        if (catId === 0 || mCat === catId) {
            if (!marker._map) {
                marker.addTo(mapInstance);
            }
            count++;
        } else {
            marker.remove();
        }
    });
    updateMapCount(count);
}

function updateMapCount(n) {
    const el = document.getElementById('mapPlaceCount');
    if (el) el.textContent = `${n} địa điểm`;
}

function showMapEmptyState() {
    const el = document.getElementById('mapEmptyState');
    if (el) el.classList.remove('hidden');
}

function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Called from popup button — delegates to place.js openPlaceDetail()
 */
window.openPlaceFromMap = function (btnElement) {
    if (typeof openPlaceDetail === 'function') {
        const placeData = JSON.parse(btnElement.dataset.place);
        const imgUrl = btnElement.dataset.img;
        const rating = btnElement.dataset.rating;
        const reviewCount = btnElement.dataset.reviews;
        openPlaceDetail(placeData, imgUrl, rating, reviewCount);
    }
};

// ─── Coordinate Picker (for "Đóng góp địa điểm" form) ───────────────────────

function initCoordPicker() {
    if (coordPickerMap || typeof trackasiagl === 'undefined') {
        if (coordPickerMap) coordPickerMap.resize();
        return;
    }

    const mapElement = document.getElementById('coordPickerMap');
    coordPickerMap = new trackasiagl.Map({
        container: mapElement,
        style: 'https://maps.track-asia.com/styles/v2/streets.json?key=0b01772742917cee17029230a2aa2225b1',
        center: [KT_CENTER[1], KT_CENTER[0]],
        zoom: 14,
        attributionControl: false
    });

    // Add navigation controls
    coordPickerMap.addControl(new trackasiagl.NavigationControl(), 'top-right');

    coordPickerMap.on('click', (e) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;

        if (coordPickerMarker) {
            coordPickerMarker.setLngLat([lng, lat]);
        } else {
            const markerEl = document.createElement('div');
            markerEl.innerHTML = `
                <div style="background-color: #ff5500; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-map-pin" style="color: white; transform: rotate(45deg); font-size: 13px;"></i>
                </div>
            `;
            markerEl.style.width = '32px';
            markerEl.style.height = '44px';
            markerEl.style.cursor = 'pointer';

            coordPickerMarker = new trackasiagl.Marker({ element: markerEl, anchor: 'bottom', draggable: true })
                .setLngLat([lng, lat])
                .addTo(coordPickerMap);

            coordPickerMarker.on('dragend', () => {
                const pos = coordPickerMarker.getLngLat();
                updateCoordFields({ lat: pos.lat, lng: pos.lng });
            });
        }
        updateCoordFields({ lat, lng });
    });
}

// ─── Global Autocomplete Initialization (OSM Photon API) ────────────────────
window.initPlaceAutocomplete = function () {
    const addressInput = document.getElementById('placeAddress');
    const suggestList = document.getElementById('placeAddressSuggestions');

    if (!addressInput || !suggestList) return;
    if (addressInput.dataset.autocompleteInit === "true") return;
    addressInput.dataset.autocompleteInit = "true";

    let debounceTimer;

    addressInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 3) {
            suggestList.classList.add('hidden');
            suggestList.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                // Sử dụng Track-Asia Autocomplete API theo key đã có
                const res = await fetch(`https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(query)}&key=0b01772742917cee17029230a2aa2225b1`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.features && data.features.length > 0) {
                    suggestList.innerHTML = '';
                    suggestList.classList.remove('hidden');

                    data.features.forEach(feature => {
                        const props = feature.properties;
                        const coords = feature.geometry.coordinates; // [lng, lat]

                        const addressText = props.label || props.name || 'Địa chỉ không xác định';

                        const li = document.createElement('li');
                        li.className = "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors";
                        li.innerHTML = `
                            <div class="font-bold text-gray-800 dark:text-gray-100">${props.name || props.street || 'Địa điểm không tên'}</div>
                            <div class="text-xs text-gray-500">${addressText}</div>
                        `;

                        li.addEventListener('click', () => {
                            // Cập nhật input
                            addressInput.value = addressText;
                            suggestList.classList.add('hidden');

                            // Lấy toạ độ (Photon trả về [lng, lat])
                            const lat = coords[1];
                            const lng = coords[0];

                            // Cập nhật toạ độ ngầm và hiển thị
                            updateCoordFields({ lat, lng });

                            // Tự động ghim trên coordPickerMap nếu đã bật
                            if (coordPickerMap) {
                                coordPickerMap.setView([lat, lng], 16);
                                if (coordPickerMarker) {
                                    coordPickerMarker.setLatLng([lat, lng]);
                                } else {
                                    coordPickerMarker = L.marker([lat, lng], {
                                        draggable: true,
                                        icon: createCustomIcon('#ff5500', 'fa-map-pin')
                                    }).addTo(coordPickerMap);

                                    coordPickerMarker.on('dragend', (ev) => {
                                        const pos = ev.target.getLatLng();
                                        updateCoordFields({ lat: pos.lat, lng: pos.lng });
                                    });
                                }
                            }

                            if (window.showToast) window.showToast('Đã tự động ghim vị trí!', 'success');
                        });
                        suggestList.appendChild(li);
                    });
                } else {
                    suggestList.classList.add('hidden');
                }
            } catch (err) {
                console.error("Autocomplete error:", err);
            }
        }, 500);
    });

    // Ẩn dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!addressInput.contains(e.target) && !suggestList.contains(e.target)) {
            suggestList.classList.add('hidden');
        }
    });
};

function updateCoordFields({ lat, lng }) {
    const latEl = document.getElementById('placeLatitude');
    const lngEl = document.getElementById('placeLongitude');
    const dispEl = document.getElementById('coordDisplay');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);
    if (dispEl) dispEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)} `;

    // Show confirm button
    const confirmBtn = document.getElementById('confirmCoordBtn');
    if (confirmBtn) confirmBtn.classList.remove('hidden');
}

// ─── Event Wiring ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // Activate map when tab-map is shown
    const mapNavBtn = document.querySelector('[data-target="map"]');
    if (mapNavBtn) {
        mapNavBtn.addEventListener('click', () => {
            // Small delay for CSS transition
            setTimeout(initMapTab, 150);
        });
    }

    // Coord picker modal
    const openPickerBtn = document.getElementById('openCoordPicker');
    const coordModal = document.getElementById('coordPickerModal');
    const closePickerBtn = document.getElementById('closeCoordPicker');
    const confirmBtn = document.getElementById('confirmCoordBtn');

    if (openPickerBtn) {
        openPickerBtn.addEventListener('click', () => {
            coordModal.classList.remove('hidden');
            coordModal.classList.add('flex');
            setTimeout(initCoordPicker, 200);
        });
    }
    if (closePickerBtn) {
        closePickerBtn.addEventListener('click', () => {
            coordModal.classList.add('hidden');
            coordModal.classList.remove('flex');
        });
    }
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            coordModal.classList.add('hidden');
            coordModal.classList.remove('flex');
            if (window.showToast) showToast('Đã chọn toạ độ!', 'success');
        });
    }

    // Init global autocomplete when dom is ready
    if (window.initPlaceAutocomplete) window.initPlaceAutocomplete();
});
