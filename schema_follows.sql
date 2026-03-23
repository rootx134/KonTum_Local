-- Tạo bảng follows để lưu trữ thông tin theo dõi của người dùng
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    followed_id UUID REFERENCES profile(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, followed_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy để mọi người dùng đều có thể đọc dữ liệu follows (công khai lấy follower count)
CREATE POLICY "Public read access for follows" ON follows FOR SELECT USING (true);

-- Policy để người dùng chỉ có thể thêm/xóa follow của chính mình
CREATE POLICY "User can insert own follows" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "User can delete own follows" ON follows FOR DELETE USING (auth.uid() = follower_id);
