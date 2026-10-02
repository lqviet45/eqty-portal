import { formatInt, formatMoney, formatSignedInt } from '@/lib/format/number';
import { enums, label } from '@/messages/enums';
import type { ActivityParty, Money } from '@/lib/api/types';

export interface EntryFacts {
  type: string;
  parties: ActivityParty[];
  quantity: number | null;
  price: Money | null;
}

export type EntryGroup = 'shares' | 'price' | 'equity' | 'void';

/** Which family a ledger type belongs to (badge colour and the filter's groups). */
export function groupOf(type: string): EntryGroup {
  switch (type) {
    case 'SHARES_ISSUED':
    case 'SHARES_TRANSFERRED':
    case 'SHARES_REPURCHASED':
      return 'shares';
    case 'SHARE_PRICE_RECORDED':
      return 'price';
    case 'ENTRY_VOIDED':
      return 'void';
    default:
      return 'equity';
  }
}

const find = (parties: ActivityParty[], role: ActivityParty['role']) => parties.find((p) => p.role === role)?.name;

/**
 * One-line description of an entry from the names the BFF already resolved. The API sends codes and names;
 * the sentence is ours (docs/api-guidelines.md §7: display text is the front end's job).
 */
export function describeEntry({ type, parties, quantity, price }: EntryFacts): string {
  const qty = quantity === null ? '' : formatInt(quantity);
  const at = price ? ` @ ${formatMoney(price)}` : '';
  const holder = find(parties, 'HOLDER');
  const cls = find(parties, 'SHARE_CLASS');
  const recipient = find(parties, 'RECIPIENT');
  const pool = find(parties, 'POOL');

  switch (type) {
    case 'SHARES_ISSUED':
      return `${holder ?? '—'} · ${qty}${cls ? ` ${cls}` : ''}${at}`;
    case 'SHARES_TRANSFERRED':
      return `${find(parties, 'FROM') ?? '—'} → ${find(parties, 'TO') ?? '—'} · ${qty} cổ phần${at}`;
    case 'SHARES_REPURCHASED':
      return `${holder ?? '—'} · ${qty} cổ phần${at}`;
    case 'SHARE_PRICE_RECORDED':
      return price ? formatMoney(price) : '—';
    case 'SHARE_CLASS_CREATED':
      return `${cls ?? '—'} · được phép ${qty}`;
    case 'AUTHORIZED_SHARES_CHANGED':
      return `${cls ?? '—'} · số được phép mới ${qty}`;
    case 'EQUITY_POOL_CREATED':
      return `${pool ?? '—'} · quy mô ${qty}${cls ? ` (${cls})` : ''}`;
    case 'EQUITY_POOL_RESIZED':
      return `${pool ?? '—'}: ${quantity === null ? '—' : formatSignedInt(quantity)}`;
    case 'GRANT_ISSUED':
      return `${recipient ?? '—'} · ${qty}${price ? ` · giá thực hiện ${formatMoney(price)}` : ''}`;
    case 'GRANT_ACCEPTED':
      return `${recipient ?? '—'} xác nhận đã nhận grant`;
    case 'EMPLOYMENT_TERMINATED':
      return `${holder ?? '—'} nghỉ việc`;
    case 'GRANT_TERMINATED':
      return `Grant của ${recipient ?? '—'} dừng${quantity ? `, thu hồi ${qty}` : ''}`;
    case 'GRANT_CANCELLED':
      return `Grant của ${recipient ?? '—'} bị hủy`;
    case 'ENTRY_VOIDED': {
      const target = find(parties, 'VOIDED_ENTRY');
      return `Đảo bút toán ${target ? label(enums.ledgerType, target).toLowerCase() : ''}`.trim();
    }
    default:
      return parties.map((p) => p.name).join(', ') || '—';
  }
}
