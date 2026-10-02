// Hand-written from the backend contracts (Eqty.Api/Bff/BffContracts.cs, Eqty.Api/Contracts/*) and
// docs/api-guidelines.md of eqty-engine-service. Enums are UPPER_SNAKE_CASE strings, money and
// percentages are strings: this app displays them and never computes with them.

export type Uuid = string;
/** Business date, YYYY-MM-DD. */
export type DateOnly = string;
/** RFC 3339 instant in UTC. */
export type Instant = string;

export interface Money {
  amount: string;
  currency: string;
}

export interface ListResponse<T> {
  items: T[];
  nextPageToken: string | null;
}

// ---- enums --------------------------------------------------------------------------------------

export type CompanyRole = 'OWNER' | 'ADMIN' | 'VIEWER' | 'EMPLOYEE';
export type EntityType = 'JOINT_STOCK_COMPANY' | 'LIMITED_LIABILITY_COMPANY' | 'FOREIGN_HOLDING';
export type StakeholderKind = 'PERSON' | 'ENTITY';
export type StakeholderRelationship = 'FOUNDER' | 'EMPLOYEE' | 'INVESTOR' | 'ADVISOR' | 'OTHER';
export type EmploymentStatus = 'ACTIVE' | 'TERMINATED';
export type LeaverType = 'GOOD' | 'BAD' | 'NEUTRAL';
export type AwardType = 'OPTION' | 'SHARE_AWARD' | 'PHANTOM';
export type GrantStatus = 'ACTIVE' | 'TERMINATED' | 'CANCELLED';
export type PriceSource = 'FUNDING_ROUND' | 'BOARD_RESOLUTION' | 'OTHER';
export type ShareClassKind = 'COMMON' | 'PREFERRED';
export type CheckStatus = 'PASSED' | 'FAILED' | 'INFO';
export type TrancheState = 'VESTED' | 'UPCOMING' | 'FORFEITED';
export type CapTableGrouping = 'STAKEHOLDER' | 'SHARE_CLASS';
export type CapTableRowKind = 'STAKEHOLDER' | 'EQUITY_POOL' | 'SHARE_CLASS';
export type OwnershipCategory = 'STAKEHOLDER_SHARES' | 'GRANTED_AWARDS' | 'POOL_AVAILABLE';
export type ActivityRole = 'HOLDER' | 'FROM' | 'TO' | 'RECIPIENT' | 'POOL' | 'SHARE_CLASS' | 'VOIDED_ENTRY';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export type AccountStatus = 'NONE' | 'INVITED' | 'MEMBER';
export type CompanyHome = 'DASHBOARD' | 'EMPLOYEE_PORTAL';
export type ImportStatus =
  'UPLOADED' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'COMMITTING' | 'COMMITTED' | 'FAILED' | 'CANCELLED';
export type ImportScreenState = 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'COMPANY_NOT_EMPTY';
export type ImportStepState = 'PENDING' | 'ACTIVE' | 'DONE' | 'FAILED';
export type ImportStepKey = 'UPLOAD' | 'VALIDATE' | 'CONFIRM' | 'WRITE';
export type TransactionType = 'ISSUE' | 'TRANSFER' | 'REPURCHASE' | 'RECORD_PRICE';
export type EquityAction = 'RESIZE_POOL' | 'SET_AUTHORIZED_SHARES' | 'CREATE_POOL' | 'CREATE_SHARE_CLASS';

// ---- shared -------------------------------------------------------------------------------------

export interface CompanyHeader {
  id: Uuid;
  name: string;
  entityType: EntityType;
  currency: string;
  ledgerVersion: number;
}

export interface SharePrice {
  pricePerShare: Money;
  source: PriceSource;
  effectiveDate: DateOnly;
}

export interface PreviewCheck {
  code: string;
  status: CheckStatus;
  detail: string;
  /** JSON Pointer (fragment form, e.g. "#/quantity") of the form field the check concerns. */
  pointer: string | null;
}

export interface ActivityParty {
  role: ActivityRole;
  id: Uuid;
  name: string;
}

export interface VestingPlan {
  startDate: DateOnly;
  cliffMonths: number;
  durationMonths: number;
  frequencyMonths: number;
}

export interface Tranche {
  vestingDate: DateOnly;
  quantity: number;
  cumulativeQuantity: number;
}

// ---- account screens ----------------------------------------------------------------------------

export interface MyMembership {
  companyId: Uuid;
  companyName: string;
  role: CompanyRole;
  stakeholderId: Uuid | null;
}

export interface Me {
  id: Uuid;
  email: string;
  emailVerified: boolean;
  displayName: string;
  memberships: MyMembership[];
}

export interface PickerCompany {
  companyId: Uuid;
  name: string;
  entityType: EntityType;
  role: CompanyRole;
  stakeholderId: Uuid | null;
  home: CompanyHome;
  stakeholderCount: number | null;
  lastRecordedAt: Instant | null;
  myGrantCount: number | null;
}

export interface CompanyPicker {
  userId: Uuid;
  email: string;
  displayName: string;
  companies: PickerCompany[];
  autoSelectCompanyId: Uuid | null;
}

export interface InvitationPreview {
  companyId: Uuid;
  companyName: string;
  email: string;
  role: CompanyRole;
  stakeholderName: string | null;
  invitedByName: string | null;
  status: InvitationStatus;
  expiresAt: Instant;
}

export interface AcceptedInvitation {
  role: CompanyRole;
  companyName: string;
  stakeholderId: Uuid | null;
}

export interface Company {
  id: Uuid;
  name: string;
  entityType: EntityType;
  currency: string;
  incorporationDate: DateOnly | null;
  createdAt: Instant;
  ledgerVersion: number;
}

// ---- dashboard ----------------------------------------------------------------------------------

export interface Dashboard {
  company: CompanyHeader;
  asOfDate: DateOnly;
  kpis: {
    outstandingShares: number;
    authorizedShares: number;
    fullyDilutedShares: number;
    pool: { availableQuantity: number; size: number };
    pricePerShare: SharePrice | null;
  };
  ownership: OwnershipSlice[];
  upcomingVesting: UpcomingVesting[];
  recentActivity: Activity[];
  attention: { unacceptedGrantCount: number; unacceptedGrantIds: Uuid[] };
}

export interface OwnershipSlice {
  category: OwnershipCategory;
  stakeholderId: Uuid | null;
  label: string | null;
  holderCount: number;
  fullyDiluted: number;
  percent: string;
}

export interface UpcomingVesting {
  vestingDate: DateOnly;
  quantity: number;
  cumulativeQuantity: number;
  grantQuantity: number;
  grantId: Uuid;
  stakeholderId: Uuid;
  stakeholderName: string;
}

export interface Activity {
  entryId: Uuid;
  ledgerVersion: number;
  /** Event type in UPPER_SNAKE_CASE, e.g. SHARES_TRANSFERRED. */
  type: string;
  effectiveDate: DateOnly;
  recordedAt: Instant;
  recordedBy: Uuid | null;
  voided: boolean;
  parties: ActivityParty[];
  quantity: number | null;
  price: Money | null;
}

// ---- cap table ----------------------------------------------------------------------------------

export interface CapTableScreen {
  asOfDate: DateOnly;
  ledgerVersion: number;
  groupBy: CapTableGrouping;
  pricePerShare: SharePrice | null;
  totals: { outstandingShares: number; grantedAwards: number; poolAvailable: number; fullyDiluted: number };
  rows: CapTableRow[];
}

export interface CapTableRow {
  kind: CapTableRowKind;
  id: Uuid;
  label: string;
  relationship: StakeholderRelationship | null;
  shareClassId: Uuid | null;
  shareClassName: string | null;
  outstandingShares: number;
  outstandingPercent: string;
  grantedAwards: number;
  poolAvailable: number;
  fullyDiluted: number;
  fullyDilutedPercent: string;
}

// ---- new grant ----------------------------------------------------------------------------------

export interface VestingPreset {
  id: string;
  cliffMonths: number;
  durationMonths: number;
  frequencyMonths: number;
}

export interface GrantForm {
  today: DateOnly;
  currency: string;
  ledgerVersion: number;
  recipients: { id: Uuid; displayName: string; relationship: StakeholderRelationship; activeGrantQuantity: number }[];
  pools: {
    id: Uuid;
    name: string;
    shareClassId: Uuid;
    shareClassName: string;
    size: number;
    availableQuantity: number;
  }[];
  awardTypes: AwardType[];
  vestingPresets: VestingPreset[];
  defaults: { awardType: AwardType; vestingPresetId: string; exerciseWindowDays: number; grantDate: DateOnly };
}

export interface MoneyInput {
  amount: string;
  currency: string;
}

export interface VestingPlanInput {
  startDate: DateOnly | null;
  cliffMonths: number | null;
  durationMonths: number | null;
  frequencyMonths: number | null;
}

export interface IssueGrantRequest {
  stakeholderId: Uuid | null;
  poolId: Uuid | null;
  awardType: AwardType | null;
  quantity: number | null;
  strikePrice: MoneyInput | null;
  vesting: VestingPlanInput | null;
  exerciseWindowDays: number | null;
  grantDate: DateOnly | null;
}

export interface GrantPreview {
  canSubmit: boolean;
  ledgerVersion: number;
  checks: PreviewCheck[];
  vesting: {
    cliffDate: DateOnly | null;
    cliffQuantity: number;
    regularTrancheQuantity: number;
    fullyVestedDate: DateOnly;
    trancheCount: number;
    tranches: Tranche[];
  } | null;
  impact: {
    poolId: Uuid | null;
    poolAvailableBefore: number;
    poolAvailableAfter: number;
    fullyDilutedBefore: number;
    fullyDilutedAfter: number;
  } | null;
}

// ---- employee portfolio -------------------------------------------------------------------------

export interface Portfolio {
  stakeholder: {
    id: Uuid;
    displayName: string;
    relationship: StakeholderRelationship;
    employment: Employment;
  };
  company: CompanyHeader;
  asOfDate: DateOnly;
  totals: {
    grantedQuantity: number;
    vestedQuantity: number;
    unvestedQuantity: number;
    forfeitedQuantity: number;
    /** Rounded down, two decimals. */
    vestedPercent: string;
  };
  nextTranche: { grantId: Uuid; vestingDate: DateOnly; quantity: number; cumulativeQuantity: number } | null;
  estimatedValue: {
    vestedAwardsIntrinsicValue: Money;
    sharesValue: Money;
    pricePerShare: SharePrice;
    basis: 'LATEST_RECORDED_PRICE';
  } | null;
  shares: { shareClassId: Uuid; shareClassName: string; quantity: number }[];
  grants: PortfolioGrant[];
}

export interface Employment {
  status: EmploymentStatus;
  terminationDate: DateOnly | null;
  leaverType: LeaverType | null;
}

export interface PortfolioGrant {
  id: Uuid;
  awardType: AwardType;
  status: GrantStatus;
  quantity: number;
  strikePrice: Money | null;
  grantDate: DateOnly;
  vesting: VestingPlan;
  exerciseWindowDays: number | null;
  terminationDate: DateOnly | null;
  exerciseDeadlineDate: DateOnly | null;
  accepted: boolean;
  vestingStatus: {
    asOfDate: DateOnly;
    vestedQuantity: number;
    unvestedQuantity: number;
    forfeitedQuantity: number;
    nextTranche: Tranche | null;
    fullyVestedDate: DateOnly;
  };
  intrinsicValue: Money | null;
  timeline: { vestingDate: DateOnly; quantity: number; cumulativeQuantity: number; state: TrancheState }[];
}

// ---- members ------------------------------------------------------------------------------------

export interface Members {
  company: CompanyHeader;
  yourRole: CompanyRole;
  members: MemberRow[];
  invitations: InvitationRow[];
  invitableRoles: CompanyRole[];
  assignableRoles: CompanyRole[];
  linkableStakeholders: {
    id: Uuid;
    displayName: string;
    email: string | null;
    relationship: StakeholderRelationship;
  }[];
}

export interface MemberRow {
  userId: Uuid;
  email: string;
  displayName: string;
  role: CompanyRole;
  stakeholderId: Uuid | null;
  stakeholderName: string | null;
  joinedAt: Instant;
  isYou: boolean;
  actions: { changeRole: boolean; revoke: boolean };
}

export interface InvitationRow {
  id: Uuid;
  email: string;
  role: CompanyRole;
  stakeholderId: Uuid | null;
  stakeholderName: string | null;
  status: InvitationStatus;
  createdAt: Instant;
  expiresAt: Instant;
  actions: { resend: boolean; revoke: boolean };
}

// ---- stakeholders -------------------------------------------------------------------------------

export interface Stakeholders {
  company: CompanyHeader;
  asOfDate: DateOnly;
  totalCount: number;
  matchedCount: number;
  items: StakeholderRow[];
}

export interface StakeholderRow {
  id: Uuid;
  kind: StakeholderKind;
  displayName: string;
  email: string | null;
  relationship: StakeholderRelationship;
  employment: Employment;
  outstandingShares: number;
  grantedAwards: number;
  fullyDiluted: number;
  fullyDilutedPercent: string;
  /** null for roles that may not see who can sign in (Viewer). */
  account: { status: AccountStatus; role: CompanyRole | null } | null;
  actions: { edit: boolean; terminate: boolean };
}

export interface TerminationPreview {
  canSubmit: boolean;
  ledgerVersion: number;
  checks: PreviewCheck[];
  grants: {
    grantId: Uuid;
    awardType: AwardType;
    quantity: number;
    vestedQuantity: number;
    forfeitedQuantity: number;
    poolId: Uuid | null;
    poolName: string | null;
    exerciseDeadlineDate: DateOnly | null;
  }[];
  totals: { vestedQuantity: number; forfeitedQuantity: number; returnedToPools: number } | null;
}

export interface Stakeholder {
  id: Uuid;
  kind: StakeholderKind;
  displayName: string;
  email: string | null;
  relationship: StakeholderRelationship;
  employment: Employment;
  createdAt: Instant;
}

// ---- ledger -------------------------------------------------------------------------------------

export interface LedgerScreen {
  company: CompanyHeader;
  totalCount: number;
  matchedCount: number;
  items: LedgerEntryRow[];
  nextPageToken: string | null;
}

export interface LedgerEntryRow {
  id: Uuid;
  ledgerVersion: number;
  type: string;
  subtype: string | null;
  effectiveDate: DateOnly;
  recordedAt: Instant;
  recordedBy: Uuid | null;
  recordedByName: string | null;
  parties: ActivityParty[];
  quantity: number | null;
  price: Money | null;
  note: string | null;
  voided: boolean;
  voidedByVersion: number | null;
  voidsVersion: number | null;
  actions: { void: boolean };
}

export interface VoidPreview {
  canSubmit: boolean;
  ledgerVersion: number;
  checks: PreviewCheck[];
  impact: {
    date: DateOnly;
    outstandingBefore: number;
    outstandingAfter: number;
    fullyDilutedBefore: number;
    fullyDilutedAfter: number;
  } | null;
}

// ---- equity pools and share classes -------------------------------------------------------------

export interface EquityScreen {
  company: CompanyHeader;
  asOfDate: DateOnly;
  pools: {
    id: Uuid;
    name: string;
    shareClassId: Uuid;
    shareClassName: string;
    size: number;
    grantedQuantity: number;
    availableQuantity: number;
    usedPercent: string;
  }[];
  shareClasses: {
    id: Uuid;
    name: string;
    kind: ShareClassKind;
    votesPerShare: number;
    authorizedShares: number;
    outstandingShares: number;
    reservedForPools: number;
    issuableShares: number;
  }[];
  totals: { authorizedShares: number; outstandingShares: number; reservedForPools: number; issuableShares: number };
  actions: { createPool: boolean; createShareClass: boolean; resizePool: boolean; setAuthorizedShares: boolean };
}

export interface EquityPreviewRequest {
  action: EquityAction | null;
  poolId?: Uuid | null;
  shareClassId?: Uuid | null;
  name?: string | null;
  kind?: ShareClassKind | null;
  votesPerShare?: number | null;
  size?: number | null;
  authorizedShares?: number | null;
  effectiveDate: DateOnly | null;
}

export interface EquityPreview {
  canSubmit: boolean;
  ledgerVersion: number;
  checks: PreviewCheck[];
  impact: {
    date: DateOnly;
    shareClassId: Uuid | null;
    issuableBefore: number | null;
    issuableAfter: number | null;
    poolSizeBefore: number | null;
    poolSizeAfter: number | null;
    fullyDilutedBefore: number;
    fullyDilutedAfter: number;
  } | null;
}

// ---- transactions -------------------------------------------------------------------------------

export interface TransactionForm {
  today: DateOnly;
  currency: string;
  ledgerVersion: number;
  stakeholders: {
    id: Uuid;
    displayName: string;
    relationship: StakeholderRelationship;
    holdings: { shareClassId: Uuid; shareClassName: string; outstandingShares: number }[];
  }[];
  shareClasses: {
    id: Uuid;
    name: string;
    kind: ShareClassKind;
    outstandingShares: number;
    issuableShares: number;
  }[];
  pricePerShare: SharePrice | null;
  priceSources: PriceSource[];
  defaults: { type: TransactionType; effectiveDate: DateOnly };
}

export interface TransactionPreviewRequest {
  type: TransactionType | null;
  stakeholderId?: Uuid | null;
  fromStakeholderId?: Uuid | null;
  toStakeholderId?: Uuid | null;
  shareClassId?: Uuid | null;
  quantity?: number | null;
  pricePerShare?: MoneyInput | null;
  certificateNumber?: string | null;
  source?: PriceSource | null;
  note?: string | null;
  effectiveDate: DateOnly | null;
}

export interface TransactionPreview {
  canSubmit: boolean;
  ledgerVersion: number;
  checks: PreviewCheck[];
  impact: {
    date: DateOnly;
    shareClassId: Uuid | null;
    holders: {
      stakeholderId: Uuid;
      name: string;
      outstandingBefore: number;
      outstandingAfter: number;
      fullyDilutedPercentBefore: string;
      fullyDilutedPercentAfter: string;
    }[];
    outstandingBefore: number;
    outstandingAfter: number;
    fullyDilutedBefore: number;
    fullyDilutedAfter: number;
    issuableBefore: number | null;
    issuableAfter: number | null;
    priceBefore: Money | null;
    priceAfter: Money | null;
  } | null;
}

// ---- Excel import -------------------------------------------------------------------------------

export interface ImportIssue {
  sheet: string | null;
  row: number | null;
  column: string | null;
  cell: string | null;
  code: string;
  message: string;
}

export interface ImportSummary {
  cutOffDate: DateOnly;
  stakeholders: number;
  shareClasses: number;
  holdings: number;
  pools: number;
  grants: number;
  issuedShares: number;
  poolShares: number;
  grantedUnits: number;
}

export interface ImportRecord {
  id: Uuid;
  status: ImportStatus;
  fileName: string;
  fileSize: number;
  fileSha256: string;
  createdAt: Instant;
  updatedAt: Instant;
  cutOffDate: DateOnly | null;
  summary: ImportSummary | null;
  issueCount: number;
  issues: ImportIssue[];
  failure: { code: string; message: string } | null;
  committedAt: Instant | null;
}

export interface ImportScreen {
  company: CompanyHeader;
  state: ImportScreenState;
  current: ImportRecord | null;
  steps: { key: ImportStepKey; state: ImportStepState }[];
  issuesBySheet: { sheet: string | null; count: number; issues: ImportIssue[] }[];
  history: { id: Uuid; status: ImportStatus; fileName: string; createdAt: Instant; issueCount: number }[];
  actions: { upload: boolean; confirm: boolean; cancel: boolean; downloadTemplate: boolean };
  template: { href: string; fileName: string; maxFileBytes: number; maxRowsPerSheet: number };
}

// ---- write requests -----------------------------------------------------------------------------

export interface CreateCompanyRequest {
  name: string;
  entityType: EntityType;
  currency: string;
  incorporationDate: DateOnly | null;
}

export interface UpdateCompanyRequest {
  name: string;
  incorporationDate: DateOnly | null;
}

export interface RegisterStakeholderRequest {
  kind: StakeholderKind;
  displayName: string;
  email: string | null;
  relationship: StakeholderRelationship;
}

export interface UpdateStakeholderRequest {
  displayName: string;
  email: string | null;
  relationship: StakeholderRelationship;
}

export interface TerminateEmploymentRequest {
  leaverType: LeaverType | null;
  terminationDate: DateOnly | null;
}

export interface InviteMemberRequest {
  email: string;
  role: CompanyRole;
  stakeholderId: Uuid | null;
}

export interface ChangeMemberRoleRequest {
  role: CompanyRole;
  stakeholderId: Uuid | null;
}
