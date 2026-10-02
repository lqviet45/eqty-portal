export const monitor = {
  title: 'Giám sát hệ thống',
  subtitle:
    'Chỉ tài khoản có vai trò platform-admin thấy mục này. Dữ liệu là của mọi công ty, nên người dùng thường không thấy.',
  openTitle: 'Xem log, trace và metrics',
  openBody:
    'Mở trang giám sát ở tab mới. Bạn đăng nhập bằng đúng tài khoản này; nếu tài khoản không có vai trò platform-admin, trang sẽ không mở.',
  open: 'Mở trang giám sát',
  notConfiguredTitle: 'Chưa có địa chỉ trang giám sát',
  notConfiguredBody: 'Đặt monitorUrl trong /config.json (biến EQTY_MONITOR_URL lúc build) rồi tải lại trang.',
  tools: {
    traces: {
      title: 'Traces',
      body: 'Một request hoặc một job đi qua những bước nào, mỗi bước mất bao lâu.',
    },
    logs: {
      title: 'Log có cấu trúc',
      body: 'Tìm theo traceId từ thông báo lỗi khách gửi.',
    },
    metrics: {
      title: 'Metrics',
      body: 'Số request, độ trễ, job chết, lần worker hỏi hàng đợi gần nhất.',
    },
  },
  traceTip:
    'Từ một lỗi khách báo: lấy mã dấu vết (traceId) trong thông báo, dán vào ô tìm của Traces hoặc Log để thấy cả luồng và các dòng log của nó.',
} as const;
