'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState, LoadingState, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { useWrite } from '@/lib/api/hooks';
import type { AcceptedInvitation, InvitationPreview } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { PICKER_KEY } from '@/lib/company';
import { daysUntil, formatInstantDate } from '@/lib/format/date';
import { describeCode, useMessages } from '@/lib/i18n';
import { companyHref, homeRouteOf } from '@/lib/routes';
import { label } from '@/messages/enums';

function Invitation({ companyId, token }: { companyId: string; token: string }) {
  const m = useMessages();
  const t = m.invite;
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const auth = useAuth();
  const write = useWrite(null);

  // Anonymous on purpose: the invitee opens the link before having an account (the token is the credential).
  const query = useQuery({
    queryKey: ['invitation', companyId, token],
    queryFn: ({ signal }) => api.post<InvitationPreview>('/bff/v1/invitations:preview', { companyId, token }, { anonymous: true, signal }),
    retry: false,
    staleTime: 60_000,
  });

  if (query.isPending) {
    return <LoadingState />;
  }
  if (query.error || !query.data) {
    const notFound = isApiError(query.error) && query.error.code === 'INVITATION_NOT_FOUND';
    return notFound ? (
      <Alert tone="error" live title={t.notFoundTitle}>{describeCode('INVITATION_NOT_FOUND')}</Alert>
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const invitation = query.data.data;
  const signedIn = auth.status === 'authenticated';
  const returnTo = `/invite/?companyId=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`;
  const closedMessage = { EXPIRED: t.expired, ACCEPTED: t.accepted, REVOKED: t.revoked, PENDING: '' }[invitation.status];
  const mismatch = write.error?.code === 'INVITATION_EMAIL_MISMATCH';

  async function accept() {
    const response = await write.run<AcceptedInvitation>('/api/v1/invitations:accept', { companyId, token }, { keepCache: true });
    if (response) {
      await client.invalidateQueries({ queryKey: PICKER_KEY });
      toast.success(t.joined(response.data.companyName));
      router.replace(companyHref(homeRouteOf(response.data.role), companyId));
    }
  }

  return (
    <section className="flex w-full max-w-[520px] flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-9">
      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-semibold tracking-wider text-brand uppercase">{t.eyebrow}</div>
        <h1 className="text-[26px] leading-tight font-bold">
          {invitation.invitedByName ? t.heading(invitation.invitedByName, invitation.companyName) : t.headingAnonymous(invitation.companyName)}
        </h1>
      </div>

      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 rounded-[10px] bg-slate-50 px-[18px] py-4 text-[14.5px]">
        <dt className="text-slate-600">{t.role}</dt>
        <dd><Badge tone="brand">{label(m.enums.role, invitation.role)}</Badge></dd>
        <dt className="text-slate-600">{t.sentTo}</dt>
        <dd className="font-semibold">{invitation.email}</dd>
        {invitation.stakeholderName && (
          <>
            <dt className="text-slate-600">{t.stakeholder}</dt>
            <dd className="font-semibold">{invitation.stakeholderName}</dd>
          </>
        )}
        <dt className="text-slate-600">{t.expires}</dt>
        <dd className="font-semibold">{t.expiresIn(Math.max(0, daysUntil(invitation.expiresAt)), formatInstantDate(invitation.expiresAt))}</dd>
      </dl>

      {invitation.status !== 'PENDING' ? (
        <Alert tone="warning" title={closedMessage}>
          <ButtonLink href="/" variant="secondary" className="mt-2">{t.toSignIn}</ButtonLink>
        </Alert>
      ) : (
        <>
          <p className="text-slate-700">{t.roleBody[invitation.role]}</p>
          <WriteError error={mismatch ? null : write.error} />
          {mismatch && (
            <Alert tone="error" live title={describeCode('INVITATION_EMAIL_MISMATCH')} actions={<Button variant="secondary" onClick={() => void auth.logout()}>{t.switchAccount}</Button>}>
              {auth.user?.email ? t.mismatch(auth.user.email, invitation.email) : null}
            </Alert>
          )}
          <div className="flex flex-col gap-2.5">
            {signedIn ? (
              <>
                {auth.user?.email && <p className="text-[13px] text-slate-600">{t.signedInAs(auth.user.email)}</p>}
                <Button className="min-h-[46px]" onClick={() => void accept()} loading={write.pending}>{t.join(invitation.companyName)}</Button>
                <Button variant="secondary" className="min-h-[46px]" onClick={() => void auth.logout()}>{t.switchAccount}</Button>
              </>
            ) : (
              <>
                <Button className="min-h-[46px]" onClick={() => void auth.login({ returnTo, register: true, loginHint: invitation.email })}>{t.register}</Button>
                <Button variant="secondary" className="min-h-[46px]" onClick={() => void auth.login({ returnTo, loginHint: invitation.email })}>{t.login}</Button>
              </>
            )}
          </div>
          <p className="text-[13px] text-slate-500">{t.sameEmail}</p>
        </>
      )}
    </section>
  );
}

function Content() {
  const params = useSearchParams();
  const t = useMessages().invite;
  const companyId = params.get('companyId');
  const token = params.get('token');
  if (!companyId || !token) {
    return <Alert tone="error" live title={t.notFoundTitle}>{t.badLink}</Alert>;
  }
  return <Invitation companyId={companyId} token={token} />;
}

export function InvitePage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-7 px-6 py-14">
      <Logo size={36} />
      <Suspense fallback={<LoadingState />}>
        <Content />
      </Suspense>
    </div>
  );
}
