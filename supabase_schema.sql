-- Xóa tất cả bảng nếu đã tồn tại để tránh xung đột
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS points_history CASCADE;
DROP TABLE IF EXISTS saved CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS place_images CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS places CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS profile CASCADE;

-- Kích hoạt RLS (tuỳ chọn)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng hồ sơ người dùng (profile)
CREATE TABLE profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    fullname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar TEXT DEFAULT 'https://ui-avatars.com/api/?name=User&background=random',
    bio TEXT,
    points INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger tự động tạo profile khi người dùng đăng ký Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile (id, fullname, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Danh mục
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng banner dùng ở trang chủ
CREATE TABLE banners (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    link TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Bảng địa điểm tham quan/quán xá
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bảng hình ảnh phụ của địa điểm
CREATE TABLE place_images (
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Bảng đánh giá
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    content TEXT,
    images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Bảng lưu địa điểm & đánh giá (saved)
CREATE TABLE saved (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('place', 'review')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, entity_id, entity_type)
);

-- 8. Bảng thích đánh giá (likes)
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, review_id)
);

-- 8b. Bảng bình luận (comments)
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Bảng theo dõi người dùng (followers)
CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id)
);

-- 10. Bảng lịch sử điểm thưởng (points_history)
CREATE TABLE points_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Bảng thông báo
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Bảng báo cáo vi phạm
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(id) ON DELETE SET NULL,
    entity_id INTEGER NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('place', 'review', 'user')) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thêm dữ liệu các danh mục mặc định
INSERT INTO categories (name, slug, icon) VALUES
('Quán Cafe', 'quan-cafe', '☕'),
('Nhà Hàng', 'nha-hang', '🍽️'),
('Khách sạn', 'khach-san', '🏨'),
('Giải Trí', 'giai-tri', '🎉'),
('Danh Lam Thắng Cảnh', 'danh-lam', '⛰️');

-- Tắt tất cả Row Level Security tạm thời cho toàn bộ Public API hoạt động ổn định
ALTER TABLE profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE places DISABLE ROW LEVEL SECURITY;
ALTER TABLE place_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;
ALTER TABLE points_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
