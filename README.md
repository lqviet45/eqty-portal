# eqty-portal

Web app của [eqty-engine-service](https://github.com/lqviet45/eqty-engine-service): cap table, quỹ ESOP, sổ cái cổ phần cho startup Việt Nam.
Next.js + Tailwind, xuất tĩnh, không chứa logic tính toán: mọi con số đến từ BFF `/bff/v1` của backend.

Quy chuẩn bắt buộc khi đóng góp: [`CLAUDE.md`](CLAUDE.md). Quy ước API và bảng màn hình ↔ endpoint: `docs/api-guidelines.md` (mục 7) của eqty-engine-service.

## Trạng thái

| Màn hình                                  | Đường dẫn                        | Vai trò                                 | Nguồn dữ liệu             |
| ----------------------------------------- | -------------------------------- | --------------------------------------- | ------------------------- |
| Đăng nhập, đăng ký, quên mật khẩu         | Keycloak (theme riêng)           | mọi người                               | OIDC + PKCE               |
| Chọn công ty, tạo công ty                 | `/companies/`, `/companies/new/` | mọi người                               | `bff/me/companies`        |
| Nhận lời mời                              | `/invite/?companyId=&token=`     | công khai, rồi đăng nhập                | `bff/invitations:preview` |
| Tổng quan                                 | `/dashboard/`                    | Owner, Admin, Viewer                    | `bff/dashboard`           |
| Cap table (+ xuất Excel)                  | `/cap-table/`                    | Owner, Admin, Viewer                    | `bff/cap-table`           |
| Cổ đông (+ xem trước nghỉ việc)           | `/stakeholders/`                 | Owner, Admin, Viewer (chỉ xem)          | `bff/stakeholders`        |
| Ghi nhận giao dịch (+ xem trước)          | `/transactions/`                 | Owner, Admin                            | `bff/transaction-form`    |
| Quỹ ESOP & lớp cổ phần (+ xem trước)      | `/equity/`                       | Owner, Admin, Viewer (chỉ xem)          | `bff/equity`              |
| Cấp grant mới (+ xem trước vesting)       | `/grants/new/`                   | Owner, Admin                            | `bff/grant-form`          |
| Nhật ký sổ cái (+ xem trước đảo bút toán) | `/ledger/`                       | Owner, Admin, Viewer (không đảo)        | `bff/ledger`              |
| Cổng nhân viên                            | `/portfolio/`                    | Nhân viên; Owner/Admin xem hộ qua `?s=` | `bff/me/portfolio`        |
| Thành viên & lời mời                      | `/members/`                      | Owner, Admin                            | `bff/members`             |
| Nhập số dư từ Excel (chạy nền)            | `/import/`                       | Owner, Admin                            | `bff/import`              |
| Cài đặt công ty                           | `/settings/`                     | Owner, Admin                            | `api/companies/{id}`      |

Mọi màn trong công ty có `?c=<companyId>`. Chưa làm: tiếng Anh (catalog `src/messages` chỉ có tiếng Việt, thêm ngôn ngữ là thêm một catalog cùng hình dạng), màn xem và đưa lại job `DEAD` (backend chưa có).

## Cấu trúc

```
src/
  app/                 route (mỏng): (app)/<màn>/page.tsx, companies/, invite/, auth/callback/
  features/<màn>/      component từng màn
  components/ui|layout|checks/   thành phần dùng chung, khung theo vai trò, danh sách "Kiểm tra trước khi ghi"
  lib/api/             client HTTP (Bearer, Idempotency-Key, If-Match/ETag, problem+json), hook useApiQuery/useWrite/usePreview, kiểu
  lib/auth/            OIDC (oidc-client-ts), phiên
  lib/format/          số, tiền, %, ngày giờ vi-VN; đọc số người dùng gõ
  messages/            toàn bộ chữ hiển thị (vi) và bảng mã lỗi → câu tiếng Việt
e2e/                   Playwright trên backend thật
public/config.json     cấu hình chạy (đọc lúc chạy, xem Triển khai)
```

## Chạy local

Cần Node 22+ và backend chạy sẵn (README của eqty-engine-service, mục "Chạy local": `docker compose up -d` rồi `dotnet run --project src/Eqty.Api`).

```bash
npm ci
npm run dev        # http://localhost:5173 (cổng này đã khai trong client eqty-portal của realm local)
```

`next dev` chuyển `/api`, `/bff`, `/healthz` sang `http://localhost:5270` (đặt `EQTY_API_ORIGIN` để đổi), nên trình duyệt chỉ nói chuyện với một origin, giống production, không cần CORS.
Đăng nhập thử: `founder@example.com` / `dev-password-founder`, `employee@example.com` / `dev-password-employee` (chỉ local).
Email lời mời do Worker gửi: chạy thêm `dotnet run --project src/Eqty.Worker` và mở Mailpit http://localhost:8025 (đặt `Email__PortalBaseUrl=http://localhost:5173` cho Worker để link trỏ về app này).

## Kiểm thử

```bash
npm run lint && npm run typecheck && npm run format:check
npm test                  # unit test (Vitest)
npm run build             # xuất tĩnh vào out/
npm run test:e2e          # Playwright, cần backend thật đang chạy + npm run dev
```

E2E chạy luồng thật qua Keycloak: tạo công ty, lớp cổ phần, quỹ, cổ đông, phát hành/chuyển nhượng/giá, cấp grant, cap table + xuất Excel, nhật ký, cài đặt; nhân viên nhận lời mời bằng email và xác nhận grant; nhập Excel nền.
Hai bài cuối cần Worker và một SMTP nhận thư: đặt `EQTY_MAIL_DIR` là thư mục nơi SMTP ghi file `.eml` (Mailpit hoặc một sink tự viết nghe cổng 1025); không đặt thì bài lời mời bị bỏ qua.
Trình duyệt: `EQTY_CHROMIUM_PATH` trỏ tới Chromium có sẵn; không đặt thì dùng bản do `npx playwright install chromium` tải.

## Triển khai

### Vercel (backend ở VPS)

Import repo vào Vercel, không cần chỉnh cài đặt: `vercel.json` đã khai mọi thứ.

- **Chuyển tiếp API**: `/api/*` và `/bff/*` được Vercel chuyển sang `https://app.103-74-100-41.sslip.io`. Trình duyệt chỉ nói chuyện với một origin nên không cần CORS (API trên VPS không có CORS). Đổi domain backend thì sửa `rewrites` và `build.env` trong `vercel.json`.
- **Cấu hình chạy**: `npm run build` chạy `scripts/write-runtime-config.mjs` ghi `public/config.json` từ `build.env` (`EQTY_OIDC_AUTHORITY`, `EQTY_OIDC_CLIENT_ID`, tùy chọn `EQTY_API_BASE_URL`). Không đặt biến thì giữ `config.json` của local.
- Header bảo mật và `Referrer-Policy: no-referrer` (URL lời mời chứa token dùng một lần) cũng nằm trong `vercel.json`.

**Việc phải làm một lần trên VPS** (không phải code), sau khi có địa chỉ Vercel `https://<app>.vercel.app`:

1. **Keycloak** (đã kiểm: realm đang từ chối `redirect_uri` ngoài `app.<domain>`, báo `Invalid parameter: redirect_uri`). Vào console qua SSH tunnel (README backend, "Keycloak admin"): realm `eqty` → Clients → `eqty-portal`:
   - Valid redirect URIs: thêm `https://<app>.vercel.app/*`
   - Valid post logout redirect URIs: thêm `https://<app>.vercel.app/*`
   - Web origins: thêm `https://<app>.vercel.app`
2. **Link trong email lời mời**: đặt `Email__PortalBaseUrl=https://<app>.vercel.app` cho Worker rồi `docker compose up -d worker`.

Giới hạn cần biết: API thấy mọi request từ FE đến từ địa chỉ của Vercel, nên giới hạn tần suất của endpoint công khai (`invitations:preview`, 10 request/phút) tính chung cho mọi người dùng; với số người dùng nhỏ thì đủ. Preview deployment của Vercel có URL ngẫu nhiên nên không đăng nhập được trừ khi thêm chúng vào Keycloak.

### Máy chủ tĩnh khác (nginx, Caddy)

`npm run build` tạo `out/` toàn file tĩnh. Phục vụ nó **cùng origin** với `/api` và `/bff`, chép `out/` vào thư mục web và ghi `config.json` của môi trường đè lên `out/config.json` (không đưa vào git):

```json
{ "oidcAuthority": "https://auth.example.vn/realms/eqty", "oidcClientId": "eqty-portal", "apiBaseUrl": "" }
```

Không cần sửa `try_files $uri /index.html` của backend: khi proxy trả trang chủ cho một đường dẫn không phải file (tải lại `/cap-table/`, `/invite?…`, `/auth/callback/?…`), trang chủ chuyển tới file của đường dẫn đó và giữ nguyên query (`src/lib/entryFallback.ts`).
Client `eqty-portal` trong Keycloak phải cho phép origin của app làm redirect và post-logout redirect URI.

Link lời mời trong email là `<PortalBaseUrl>/invite?companyId=…&token=…` (`Email:PortalBaseUrl` của Worker = origin của app này).

## Lựa chọn thiết kế cần biết

- **Công ty trong `?c=`** thay vì `/companies/{id}/…`: xuất tĩnh không có segment động. Link vẫn chia sẻ được giữa các thành viên cùng công ty.
- **Kiểm tra trước khi ghi** hiển thị tiêu đề tiếng Việt theo `code` kèm câu giải thích gốc của server (tiếng Anh, có số liệu chính xác): FE không dựng lại số liệu từ câu chữ.
- **Ô ngày** dùng `<input type="date">` nên hiển thị theo ngôn ngữ trình duyệt; giá trị gửi đi luôn là `YYYY-MM-DD`.
- **Ngày "hôm nay"** của form lấy từ server (giờ Việt Nam), không lấy từ đồng hồ trình duyệt.
