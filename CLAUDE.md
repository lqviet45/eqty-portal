# eqty-portal — quy chuẩn bắt buộc

Web app của [eqty-engine-service](https://github.com/lqviet45/eqty-engine-service) (sổ cái cổ phần & ESOP). Đây là phần mềm tài chính:
**một con số sai là một lỗi pháp lý**. Mọi thay đổi — do người hay AI viết — phải theo các quy chuẩn dưới đây.

## Trước khi push

```bash
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```

Cả năm phải sạch (CI chạy đúng các lệnh này). Sửa luồng đăng nhập hoặc màn có nhiều bước thì chạy thêm `npm run test:e2e` trên stack thật (README, mục Kiểm thử).

## Không bao giờ

- **Tính số liệu ở FE.** Cổ phần, phần trăm, giá trị ước tính, "còn cấp được", tác động của giao dịch đều đến từ BFF (`/bff/v1`). FE chỉ định dạng và hiển thị.
  Chiều rộng thanh/biểu đồ là ngoại lệ duy nhất (chỉ bố cục, số hiển thị vẫn là chuỗi của server).
- Đọc tiền hoặc phần trăm thành số dấu phẩy động để tính. Tiền là `{ amount: "25000", currency: "VND" }`, phần trăm là chuỗi; định dạng bằng `lib/format`.
- Tự quyết định một thao tác ghi có hợp lệ. Nút ghi sáng khi `canSubmit` của **preview** là `true` và preview ứng với đúng nội dung form (`usePreview().canSubmit`).
- Ghi mà không có `Idempotency-Key` hoặc bỏ `If-Match` khi ghi sổ cái. Dùng `useWrite` (giữ key khi chưa biết kết quả, đổi key khi nội dung đổi) và truyền `ifMatch: preview.ledgerVersion`.
- Rẽ nhánh theo `detail` của lỗi. Rẽ nhánh theo `code`; `detail` của server (tiếng Anh, có số liệu chính xác) chỉ hiện làm dòng phụ.
- Tắt, hạ mức một rule ESLint hay dùng `!`/`any` để qua build. Sửa code.
- Skip, xóa, nới lỏng một test đang fail để CI xanh.
- Lưu token ở đâu khác `sessionStorage` (do `oidc-client-ts` quản lý), ghi token/secret/dữ liệu khách vào log, commit secret hay `config.json` của môi trường thật.
- Thêm thư viện cho việc nhỏ làm được bằng vài dòng.

## Kiến trúc

- Next.js (App Router) **xuất tĩnh** (`output: 'export'`): chạy hoàn toàn ở trình duyệt, được phục vụ cùng origin với `/api` và `/bff`. Không có server component đọc dữ liệu, không route handler.
- Không có segment động trong đường dẫn: công ty đi theo `?c=<companyId>` (`lib/routes.ts`). Mỗi màn là một thư mục `src/app/(app)/<màn>/page.tsx` mỏng, gọi component trong `src/features/<màn>/`.
- Đăng nhập: OIDC Authorization Code + PKCE với client `eqty-portal` của Keycloak (`lib/auth`). Cấu hình đọc lúc chạy từ `/config.json` (`lib/config.ts`) để một bản build chạy được trên mọi domain.
- Đọc: một endpoint BFF cho mỗi màn (`useApiQuery`). Ghi: `/api/v1` qua `useWrite`. Kiểm tra trước khi ghi: `:preview` qua `usePreview`.
- Phân quyền: API quyết định và thực thi. FE chỉ **ẩn** thứ sẽ bị từ chối: nút theo `actions.*` của BFF, màn theo `ROUTE_ROLES` (`lib/routes.ts`, phản chiếu `AccessPolicy` của API). Người ngoài công ty nhận 404.
- Mọi chữ hiển thị nằm trong `src/messages` (tiếng Việt, một catalog theo màn) và truy cập qua `useMessages()`. Server trả mã (`code`, `type`, `role`…) và tên riêng; câu chữ là việc của FE.
  Mã mới của backend thì thêm vào `messages/codes.ts` (lỗi: `errorMessages`; kiểm tra trước khi ghi: `checkTitles`).

## Giao diện

- Tailwind v4, token ở `app/globals.css` (`@theme`), bám các board "UI · …" trong canvas thiết kế. Font tự host (`@fontsource`), không gọi Google Fonts.
- Số, ngày theo vi-VN: `1.000.000`, `43,48%`, `dd/MM/yyyy`; giờ theo UTC+7 (`lib/format`). Ngày nghiệp vụ là chuỗi `YYYY-MM-DD`, không qua `Date`.
- Mục tiêu chạm ≥ 44px, `label` bọc control, lỗi gắn vào đúng ô theo `errors[].pointer` / `checks[].pointer`, trạng thái tải/lỗi/rỗng cho mọi màn.
- Mỗi màn dùng được ở 390px (thanh bên thành menu; cổng nhân viên thiết kế mobile trước).

## TypeScript

- `strict` + `noUncheckedIndexedAccess`. Kiểu API viết tay ở `lib/api/types.ts` theo `Eqty.Api/Bff/BffContracts.cs`; backend đổi contract thì đổi kiểu **và** màn trong cùng PR.
- `import type` cho kiểu. Tên thành phần `PascalCase`, hook `useXxx`, không `default export` ngoài `page.tsx`/`layout.tsx`.
- Comment giải thích **tại sao**, không lặp lại code làm gì.

## Test

- Logic thuần (định dạng, parse, lỗi, idempotency, mô tả bút toán) có unit test (Vitest) cho cả trường hợp đúng và bị từ chối.
- Luồng người dùng có E2E (Playwright) trên **backend thật** (PostgreSQL, Keycloak, Eqty.Api, Eqty.Worker), không mock server.
- Tên test là một câu mô tả hành vi. Sửa bug: viết test tái hiện trước.

## Tài liệu

Chỉ hai file: `README.md` (dự án là gì, cách chạy, kiểm thử, triển khai) và `CLAUDE.md` (file này). Quy ước API và bảng màn hình ↔ endpoint nằm ở `docs/api-guidelines.md` của eqty-engine-service.
Giải thích chi tiết nằm cạnh code. Không tạo thêm file `.md`.

## Git

Commit nhỏ, mỗi commit build được. Message tiếng Anh, thể mệnh lệnh: `Add ledger screen`. PR mô tả: làm gì, vì sao, kiểm thử thế nào, còn gì chưa làm.
