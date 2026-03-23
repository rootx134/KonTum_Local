# 📝 Báo Cáo Audit Toàn Diện (Kiểm Tra Chất Lượng Mã Nguồn)

Dự án này là một ứng dụng Web tĩnh (HTML/CSS/JS thuần) gọi trực tiếp API qua PHP và mới đây là **Supabase**. Dưới đây là kết quả của quy trình kiểm tra toàn diện:

---

## 🛡️ 1. Kiểm tra Bảo Mật (Security Scan)
- **Tình trạng:** Khá rủi ro đối với kiến trúc hiện tại.
- **Phát hiện:** 
  - Khóa `supabaseKey` và `supabaseUrl` đang nằm trực tiếp trên client-side (trong `app.js`). Dù Supabase cho phép điều này nhờ Row Level Security (RLS), mọi sơ hở trong RLS đều có thể làm lộ toàn bộ dữ liệu.
  - Vẫn còn tệp `feed.js` gọi qua `api.php`. Việc tồn tại song song cả kết nối Supabase JS và qua file PHP truyền thống tạo ra lỗ hổng và rủi ro (Backend cũ gọi bằng service_role key có thể vượt RLS).
- **Hành động đề xuất:** 
  - [ ] Hoàn thành việc tích hợp 100% qua Supabase JS Client, sau đó cấu hình lại RLS thật chặt chẽ.
  - [ ] Xóa bỏ toàn bộ các file API PHP cũ (`places.php`, `auth.php`, v.v.).

## 🧹 2. Kiểm tra Chất Lượng Code (Lint Check) & Lỗi Định Dạng (Type Check)
- **Tình trạng:** Chứa nhiều **Nợ Kỹ Thuật (Technical Debt)** do sự khác biệt giữa MySQL và PostgreSQL lưu trữ.
- **Phát hiện:** 
  - Project đang dùng **Vanilla JS** (không có công cụ kiểm tra kiểu dữ liệu như TypeScript).
  - Supabase/PostgreSQL rất khắt khe về kiểu dữ liệu (vd: `is_read` là Integer thì truyền Boolean sẽ báo lỗi 400), trong khi code JS hiện tại rất "thoáng", dẫn tới các lỗi Runtime liên miên.
  - JS DOM manipulation (`innerHTML`, `appendChild`) nằm rải rác mà không có hệ thống Component hóa, dễ sinh lỗi khi logic phức tạp lên.
- **Hành động đề xuất:** 
  - [ ] **Khuyến nghị cực kì cao:** Nếu muốn ứng dụng chạy ổn định và lớn mạnh, **CÓ** nên áp dụng kiến trúc Component bằng việc Migrate ứng dụng sang `React` hoặc thư viện nhẹ như `Preact`/`Alpine.js` để dễ debug. 
  - [ ] Nếu KHÔNG muốn Rebuild, nên bắt đầu thêm nhận dạng kiểu biến (JSDoc) và linter (`ESLint`) cho Vanilla JS.

## 🔍 3. Kiểm tra SEO & Hiệu Suất (SEO Audit)
- **Tình trạng:** Cần cải thiện.
- **Phát hiện:**
  - Ứng dụng hiện đang render giao diện phụ thuộc hoàn toàn vào JavaScript Client-Side. Bot Google sẽ gặp khó khăn để cào dữ liệu (đánh giá, địa điểm). Các thẻ Meta khó thay đổi động đối với từng đường dẫn (như `/place-detail.html?id=1`).
- **Hành động đề xuất:** 
  - [ ] Nếu có yêu cầu SEO, **phải** cân nhắc tới khuôn khổ Render Server Side (SSR) như Next.js hoặc thay đổi lại Meta Data bằng các giải pháp Pre-render.

---

## 💡 KẾT LUẬN & ĐÁNH GIÁ (GIẢI ĐÁP CÂU HỎI REBUILD HAY TIẾP TỤC)

**Kết quả Audit chỉ ra: Bạn đang duy trì một kiến trúc lai (Hybrid) gặp khó khăn trong việc mở rộng và kiểm soát loại lỗi.**
- Nếu tính năng hiện tại **đã đủ dùng cho một bản MVP (Sản phẩm khả thi tối thiểu)** -> **KHÔNG CẦN CHUYỂN**, chỉ cần sửa lại nốt 4-5 file JS cho đúng định dạng dữ liệu của Supabase.
- Nhưng nếu ứng dụng này **được kì vọng trở thành một dự án dài hơi, có thêm chức năng Chat, Đặt bàn, Tích lũy điểm, và yêu cầu SEO để kiếm Traffic** -> **BẠN NÊN ĐẬP ĐI XÂY LẠI** bằng React/Next.js/Supabase. Mọi lỗi lặt vặt (như `images.map is not a function` hay `400 Bad Request`) hầu như sẽ biến mất hoàn toàn do hỗ trợ Type-Safety.
