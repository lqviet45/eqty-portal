'use client';

import { useState, type FormEvent } from 'react';
import { Note } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button, RowButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Select } from '@/components/ui/Field';
import { Card, PageHeader, TableWrap } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, useWrite } from '@/lib/api/hooks';
import type { CompanyRole, InvitationRow, MemberRow, Members } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { formatInstantDate } from '@/lib/format/date';
import { useMessages } from '@/lib/i18n';
import { enums, label } from '@/messages/enums';

type Panel = { mode: 'invite' } | { mode: 'role'; member: MemberRow };
type Confirm = { kind: 'member'; member: MemberRow } | { kind: 'invitation'; invitation: InvitationRow };

function InviteForm({ data }: { data: Members }) {
  const m = useMessages();
  const t = m.members;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>(
    data.invitableRoles.includes('EMPLOYEE') ? 'EMPLOYEE' : (data.invitableRoles[0] ?? 'VIEWER'),
  );
  const [stakeholderId, setStakeholderId] = useState('');
  const isEmployee = role === 'EMPLOYEE';

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { email: email.trim(), role, stakeholderId: isEmployee ? stakeholderId || null : null };
    if (await write.run(`/api/v1/companies/${companyId}/invitations`, body)) {
      toast.success(t.sent(body.email));
      setEmail('');
      setStakeholderId('');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-[17px] font-bold">{t.inviteTitle}</h2>
      <WriteError error={write.error} />
      <Field label={t.email} error={write.fieldErrors.email}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          invalid={Boolean(write.fieldErrors.email)}
        />
      </Field>
      <Field label={t.role} error={write.fieldErrors.role}>
        <Select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
          {data.invitableRoles.map((r) => (
            <option key={r} value={r}>{`${enums.role[r]} — ${enums.roleHint[r]}`}</option>
          ))}
        </Select>
      </Field>
      {isEmployee && (
        <Field label={t.stakeholder} error={write.fieldErrors.stakeholderId}>
          <Select
            value={stakeholderId}
            onChange={(e) => setStakeholderId(e.target.value)}
            required
            invalid={Boolean(write.fieldErrors.stakeholderId)}
          >
            <option value="">{t.stakeholderNone}</option>
            {data.linkableStakeholders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
                {s.email ? ` (${s.email})` : ''}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {isEmployee && <Note>{data.linkableStakeholders.length === 0 ? t.noLinkable : t.stakeholderNote}</Note>}
      <Button
        type="submit"
        loading={write.pending}
        disabled={email.trim() === '' || (isEmployee && stakeholderId === '')}
      >
        {t.send}
      </Button>
      <div className="text-[12.5px] text-slate-500">{t.roleHint}</div>
    </form>
  );
}

function RoleForm({ member, data, onDone }: { member: MemberRow; data: Members; onDone: () => void }) {
  const m = useMessages();
  const t = m.members;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [role, setRole] = useState(member.role);
  const [stakeholderId, setStakeholderId] = useState(member.stakeholderId ?? '');
  const isEmployee = role === 'EMPLOYEE';
  const options = [
    ...data.linkableStakeholders,
    ...(member.stakeholderId && !data.linkableStakeholders.some((s) => s.id === member.stakeholderId)
      ? [
          {
            id: member.stakeholderId,
            displayName: member.stakeholderName ?? member.stakeholderId,
            email: null,
            relationship: 'EMPLOYEE' as const,
          },
        ]
      : []),
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      await write.run(`/api/v1/companies/${companyId}/members/${member.userId}:changeRole`, {
        role,
        stakeholderId: isEmployee ? stakeholderId || null : null,
      })
    ) {
      toast.success(t.roleChanged);
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">{t.changeTitle}</h2>
        <div className="text-[13.5px] text-slate-600">{t.changeFor(member.displayName)}</div>
      </div>
      <WriteError error={write.error} />
      <Field label={t.newRole} error={write.fieldErrors.role}>
        <Select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
          {data.assignableRoles.map((r) => (
            <option key={r} value={r}>
              {enums.role[r]}
            </option>
          ))}
        </Select>
      </Field>
      {isEmployee && (
        <Field label={t.stakeholder} error={write.fieldErrors.stakeholderId}>
          <Select value={stakeholderId} onChange={(e) => setStakeholderId(e.target.value)} required>
            <option value="">{t.stakeholderNone}</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex gap-2.5">
        <Button type="submit" loading={write.pending} disabled={isEmployee && stakeholderId === ''}>
          {t.saveRole}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {m.common.action.cancel}
        </Button>
      </div>
    </form>
  );
}

export function MembersPage() {
  const m = useMessages();
  const t = m.members;
  const { companyId, company } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [panel, setPanel] = useState<Panel>({ mode: 'invite' });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const query = useApiQuery<Members>(['c', companyId, 'members'], `/bff/v1/companies/${companyId}/members`);

  async function resend(invitation: InvitationRow) {
    if (await write.run(`/api/v1/companies/${companyId}/invitations/${invitation.id}:resend`, {})) {
      toast.success(t.resent);
    }
  }

  async function confirmRevoke() {
    if (!confirm) return;
    const base = `/api/v1/companies/${companyId}`;
    const ok =
      confirm.kind === 'member'
        ? await write.run(`${base}/members/${confirm.member.userId}:revoke`, {})
        : await write.run(`${base}/invitations/${confirm.invitation.id}:revoke`, {});
    if (ok) {
      toast.success(confirm.kind === 'member' ? t.memberRevoked : t.invitationRevoked);
    }
    setConfirm(null);
  }

  return (
    <RoleGate route="members">
      <PageHeader title={t.title} subtitle={t.subtitle(company.name)} />
      <WriteError error={write.error} onReload={() => write.reset()} />
      <Async query={query}>
        {(data) => (
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-5">
              <Card>
                <TableWrap>
                  <table className="eqty-table">
                    <thead>
                      <tr>
                        <th>{t.colUser}</th>
                        <th>{t.colRole}</th>
                        <th>{t.colStakeholder}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.members.map((member) => (
                        <tr key={member.userId}>
                          <td>
                            <div className="font-semibold">{member.displayName}</div>
                            <div className="text-[13px] text-slate-600">{member.email}</div>
                          </td>
                          <td>
                            <Badge>{label(m.enums.role, member.role)}</Badge>
                          </td>
                          <td className="text-slate-600">{member.stakeholderName ?? '—'}</td>
                          <td className="text-right whitespace-nowrap">
                            {member.isYou && <span className="text-[13px] text-slate-500">{t.you}</span>}
                            {member.actions.changeRole && (
                              <RowButton onClick={() => setPanel({ mode: 'role', member })}>{t.changeRole}</RowButton>
                            )}
                            {member.actions.revoke && (
                              <RowButton tone="danger" onClick={() => setConfirm({ kind: 'member', member })}>
                                {m.common.action.revoke}
                              </RowButton>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3.5 font-bold">
                  {t.pendingTitle(data.invitations.length)}
                </div>
                {data.invitations.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-600">{t.pendingEmpty}</p>
                ) : (
                  <ul>
                    {data.invitations.map((invitation) => (
                      <li
                        key={invitation.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-semibold">
                            <span className="truncate">{invitation.email}</span>
                            {invitation.status === 'EXPIRED' && <Badge tone="warning">{t.expired}</Badge>}
                          </div>
                          <div className="text-[13px] text-slate-600">
                            {t.pendingDetail(
                              label(m.enums.role, invitation.role),
                              invitation.stakeholderName,
                              formatInstantDate(invitation.createdAt),
                              formatInstantDate(invitation.expiresAt),
                            )}
                          </div>
                        </div>
                        <div className="whitespace-nowrap">
                          {invitation.actions.resend && (
                            <RowButton onClick={() => void resend(invitation)}>{m.common.action.resend}</RowButton>
                          )}
                          {invitation.actions.revoke && (
                            <RowButton tone="danger" onClick={() => setConfirm({ kind: 'invitation', invitation })}>
                              {m.common.action.revoke}
                            </RowButton>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card className="min-w-[300px] flex-[1_1_320px] px-6 py-5">
              {panel.mode === 'invite' ? (
                <InviteForm data={data} />
              ) : (
                <RoleForm
                  key={panel.member.userId}
                  member={panel.member}
                  data={data}
                  onDone={() => setPanel({ mode: 'invite' })}
                />
              )}
            </Card>
          </div>
        )}
      </Async>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'invitation' ? t.revokeInvitationTitle : t.revokeTitle}
        confirmLabel={t.confirmRevoke}
        cancelLabel={m.common.action.cancel}
        loading={write.pending}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setConfirm(null)}
      >
        {confirm?.kind === 'member'
          ? t.revokeBody(confirm.member.displayName)
          : confirm?.kind === 'invitation'
            ? t.revokeInvitationBody(confirm.invitation.email)
            : null}
      </ConfirmDialog>
    </RoleGate>
  );
}
