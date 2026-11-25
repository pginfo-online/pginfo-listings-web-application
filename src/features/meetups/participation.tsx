"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { api } from "@/src/api/client";
import { meetupAction, meetupDetails, type Meetup } from "@/src/api/contracts";
import { isAccessError } from "@/src/api/errors";
import { useCopy } from "@/src/components/preferences";
import { Failure } from "@/src/components/ui";
import { httpsURL, label } from "@/src/domain/display";
import { signInHref } from "@/src/domain/navigation";
import { ConfirmedAction } from "../account/confirmed-action";
import { useSession } from "../account/session";

export function Participation({ meetup }: { meetup: Meetup }) {
  const t = useCopy();
  const client = useQueryClient();
  const user = useSession();
  const { _id: id } = meetup;
  const key = ["private", "meetup", user.data?._id, id] as const;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user.data),
    queryFn: ({ signal }) => api(`meetups/${id}`, meetupDetails, { signal }),
  });
  const [mountedAt] = useState(() => Date.now());
  const now = Math.max(mountedAt, query.dataUpdatedAt);
  const queryData = isAccessError(query.error) ? undefined : query.data;
  const status = queryData?.data.myParticipation?.status;
  const active = status && !["cancelled", "rejected"].includes(status);
  const endDate = meetup.endDate || meetup.startDate;
  const deadline =
    meetup.participation?.registrationDeadline || meetup.registrationDeadline;
  const closed = Boolean(
    (endDate && new Date(endDate).getTime() < now) ||
    (deadline && new Date(deadline).getTime() < now) ||
    meetup.status === "cancelled",
  );
  const external = httpsURL(meetup.externalRegistrationLink);
  const invite = meetup.participation?.registrationType === "invite";
  const canRegister =
    !closed &&
    !invite &&
    !active &&
    (meetup.participation?.isFree !== false || Boolean(external));
  const action = async (method: string) => {
    try {
      await api(`meetups/${id}/join`, meetupAction, { method });
    } finally {
      await client.invalidateQueries({ queryKey: key });
    }
  };
  return (
    <aside
      className="booking-panel"
      aria-label={t("Meetup registration", "मिलन पंजीकरण")}
    >
      <h2 className="meetup-register-heading">
        <UsersRound size={22} />
        {t("Participation", "भागीदारी")}
      </h2>
      {status && <p className="status-pill">{label(status)}</p>}
      {closed && (
        <p className="muted">{t("Registration is closed.", "पंजीकरण बंद है।")}</p>
      )}
      {invite && (
        <p className="muted">
          {t("This meetup is by invitation.", "यह कार्यक्रम आमंत्रण पर है।")}
        </p>
      )}
      {!closed &&
        !invite &&
        meetup.participation?.isFree === false &&
        !external && (
          <p className="muted">
            {t(
              "Online registration is unavailable.",
              "ऑनलाइन पंजीकरण उपलब्ध नहीं है।",
            )}
          </p>
        )}
      {user.error && (
        <Failure error={user.error} retry={() => void user.refetch()} />
      )}
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      {canRegister && external && (
        <a
          href={external.href}
          className="button button-primary"
          target="_blank"
          rel="noreferrer"
        >
          {t("Register with organiser", "आयोजक के साथ पंजीकरण करें")}
        </a>
      )}
      {canRegister && !external && user.isPending && (
        <p className="muted" role="status">
          {t("Checking session…", "सत्र की जाँच हो रही है…")}
        </p>
      )}
      {canRegister && !external && user.data === null && (
        <Link
          href={signInHref(`/meetups/${id}`)}
          className="button button-primary"
        >
          {t("Sign in to join", "जुड़ने के लिए साइन इन करें")}
        </Link>
      )}
      {canRegister && !external && user.data && queryData && (
        <ConfirmedAction
          title={t("Join meetup", "मिलन में शामिल हों")}
          description={meetup.title}
          trigger={
            <button type="button" className="button button-primary">
              {t("Join meetup", "मिलन में शामिल हों")}
            </button>
          }
          action={() => action("POST")}
        />
      )}
      {!closed && active && user.data && (
        <ConfirmedAction
          title={t("Cancel participation", "भागीदारी रद्द करें")}
          description={meetup.title}
          trigger={
            <button type="button" className="button button-outline">
              {t("Cancel participation", "भागीदारी रद्द करें")}
            </button>
          }
          action={() => action("DELETE")}
        />
      )}
    </aside>
  );
}
