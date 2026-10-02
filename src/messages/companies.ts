export const companies = {
  pickerTitle: 'Chọn công ty',
  pickerIntro: (count: number) => `Bạn thuộc ${count} công ty. Vai trò quyết định màn hình bạn thấy sau khi chọn.`,
  pickerEmpty: 'Bạn chưa thuộc công ty nào. Tạo công ty mới, hoặc mở link trong email lời mời.',
  stakeholderLine: (count: number, updated: string) => `${count} cổ đông${updated ? ` · cập nhật ${updated}` : ''}`,
  grantLine: (count: number) => (count === 0 ? 'bạn chưa có grant' : `bạn có ${count} grant`),
  create: 'Tạo công ty mới',
  open: (name: string) => `Mở ${name}`,
  newTitle: 'Tạo công ty mới',
  newIntro:
    'Bạn sẽ là Owner của công ty này. Loại hình và tiền tệ quyết định cách đọc mọi số lượng và giá trong sổ cái nên không đổi được sau khi tạo.',
  name: 'Tên công ty',
  entityType: 'Loại hình',
  currency: 'Tiền tệ',
  incorporationDate: 'Ngày thành lập',
  incorporationHint: 'Không bắt buộc. Để trống nếu chưa rõ.',
  submit: 'Tạo công ty',
  created: (name: string) => `Đã tạo ${name}.`,
} as const;
