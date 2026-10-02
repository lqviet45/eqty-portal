export const preview = {
  title: 'Kiểm tra trước khi ghi',
  noWrite: 'Không ghi gì vào sổ cái',
  checking: 'Đang kiểm tra…',
  empty: 'Điền form để kiểm tra.',
  impactTitle: 'Tác động lên cap table',
  impactInvalid: 'Chưa tính được tác động vì thông tin chưa hợp lệ.',
  submitHint:
    'Nút ghi chỉ sáng khi mọi mục kiểm tra đạt. Kiểm tra chạy đúng quy tắc của lúc ghi; nếu sổ cái đổi giữa chừng, lúc ghi sẽ báo lỗi và tải lại.',
  blockedLocal: 'Chưa ghi được: sửa các ô đang báo lỗi.',
  blockedEmpty: 'Chưa ghi được: điền thông tin để chạy kiểm tra.',
  blockedChecks: (count: number) => `Chưa ghi được: còn ${count} mục kiểm tra chưa đạt.`,
  appendOnly: 'Bút toán chỉ đảo được, không xóa được.',
} as const;
