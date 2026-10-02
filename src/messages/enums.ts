// Labels for the enum codes the API returns. The API sends codes (UPPER_SNAKE_CASE) and proper names; the words are ours.

export const enums = {
  role: { OWNER: 'Owner', ADMIN: 'Admin', VIEWER: 'Viewer', EMPLOYEE: 'Nhân viên' },
  roleHint: {
    OWNER: 'Toàn quyền, gồm quản lý thành viên',
    ADMIN: 'Ghi sổ cái, nhập Excel, mời Viewer và Nhân viên',
    VIEWER: 'Xem cap table, sổ cái và báo cáo',
    EMPLOYEE: 'Chỉ xem grant của chính mình',
  },
  entityType: {
    JOINT_STOCK_COMPANY: 'Công ty cổ phần',
    LIMITED_LIABILITY_COMPANY: 'Công ty TNHH',
    FOREIGN_HOLDING: 'Holding nước ngoài',
  },
  relationship: { FOUNDER: 'Founder', EMPLOYEE: 'Nhân viên', INVESTOR: 'Nhà đầu tư', ADVISOR: 'Cố vấn', OTHER: 'Khác' },
  stakeholderKind: { PERSON: 'Cá nhân', ENTITY: 'Tổ chức' },
  awardType: { OPTION: 'Option (quyền mua)', SHARE_AWARD: 'Cổ phần thưởng', PHANTOM: 'Phantom (quyền ảo)' },
  awardTypeShort: { OPTION: 'Option', SHARE_AWARD: 'Cổ phần thưởng', PHANTOM: 'Phantom' },
  grantStatus: { ACTIVE: 'Đang hiệu lực', TERMINATED: 'Đã dừng', CANCELLED: 'Đã hủy' },
  leaverType: {
    GOOD: 'Nghỉ bình thường (good leaver)',
    BAD: 'Vi phạm hoặc bị sa thải (bad leaver)',
    NEUTRAL: 'Trung lập (neutral leaver)',
  },
  priceSource: { FUNDING_ROUND: 'Vòng gọi vốn', BOARD_RESOLUTION: 'Nghị quyết HĐQT', OTHER: 'Khác' },
  shareClassKind: { COMMON: 'Phổ thông', PREFERRED: 'Ưu đãi' },
  shareClassKindLong: { COMMON: 'Phổ thông (Common)', PREFERRED: 'Ưu đãi (Preferred)' },
  employment: { ACTIVE: 'Đang hoạt động', TERMINATED: 'Đã nghỉ' },
  account: { NONE: 'Chưa có', INVITED: 'Lời mời chờ', MEMBER: 'Có tài khoản' },
  invitationStatus: { PENDING: 'Đang chờ', ACCEPTED: 'Đã dùng', REVOKED: 'Đã thu hồi', EXPIRED: 'Hết hạn' },
  trancheState: { VESTED: 'Đã vested', UPCOMING: 'Sắp tới', FORFEITED: 'Đã thu hồi' },
  checkStatus: { PASSED: 'Đạt', FAILED: 'Không đạt', INFO: 'Thông tin' },
  vestingPreset: {
    FOUR_YEARS_ONE_YEAR_CLIFF_MONTHLY: '4 năm · cliff 1 năm · hàng tháng',
    THREE_YEARS_ONE_YEAR_CLIFF_QUARTERLY: '3 năm · cliff 1 năm · hàng quý',
    FOUR_YEARS_NO_CLIFF_MONTHLY: '4 năm · không cliff · hàng tháng',
  },
  ledgerType: {
    SHARES_ISSUED: 'Phát hành',
    SHARES_TRANSFERRED: 'Chuyển nhượng',
    SHARES_REPURCHASED: 'Mua lại',
    SHARE_PRICE_RECORDED: 'Giá cổ phần',
    SHARE_CLASS_CREATED: 'Tạo lớp cổ phần',
    AUTHORIZED_SHARES_CHANGED: 'Đổi số được phép',
    EQUITY_POOL_CREATED: 'Tạo quỹ',
    EQUITY_POOL_RESIZED: 'Điều chỉnh quỹ',
    GRANT_ISSUED: 'Cấp grant',
    GRANT_ACCEPTED: 'Xác nhận grant',
    EMPLOYMENT_TERMINATED: 'Nghỉ việc',
    GRANT_TERMINATED: 'Dừng grant',
    GRANT_CANCELLED: 'Hủy grant',
    ENTRY_VOIDED: 'Đảo bút toán',
  },
  importStatus: {
    UPLOADED: 'Đã tải lên',
    VALIDATING: 'Đang kiểm tra',
    VALIDATED: 'Hợp lệ, chờ xác nhận',
    REJECTED: 'Bị từ chối',
    COMMITTING: 'Đang ghi sổ',
    COMMITTED: 'Đã nhập xong',
    FAILED: 'Không hoàn tất',
    CANCELLED: 'Đã huỷ',
  },
  partyRole: {
    FROM: 'Bên chuyển',
    TO: 'Bên nhận',
    HOLDER: 'Cổ đông',
    RECIPIENT: 'Người nhận',
    POOL: 'Quỹ',
    SHARE_CLASS: 'Lớp cổ phần',
    VOIDED_ENTRY: 'Bút toán bị đảo',
  },
} as const;

type Dictionary = Readonly<Record<string, string>>;

/** Label for a code, falling back to the code itself so an unknown value is still readable. */
export function label(dictionary: Dictionary, code: string | null | undefined): string {
  if (code === null || code === undefined) {
    return '—';
  }
  return dictionary[code] ?? humanize(code);
}

/** "SOME_NEW_CODE" → "Some new code" for values this catalog does not know yet. */
export function humanize(code: string): string {
  const text = code.replaceAll('_', ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Vesting frequency in months → "Hàng tháng", "Hàng quý", "Hàng năm". */
export function frequencyLabel(months: number): string {
  switch (months) {
    case 1:
      return 'Hàng tháng';
    case 3:
      return 'Hàng quý';
    case 6:
      return 'Nửa năm một lần';
    case 12:
      return 'Hàng năm';
    default:
      return `${months} tháng một lần`;
  }
}
