"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  MapPin,
  Phone,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/src/api/client";
import { bookingResult, contacts, visitResult } from "@/src/api/contracts";
import { useFeatures } from "@/src/api/features";
import { ApiError, isAccessError } from "@/src/api/errors";
import { Modal } from "@/src/components/dialog";
import { Failure } from "@/src/components/ui";
import { useCopy } from "@/src/components/preferences";
import { httpsURL, rupees, todayIST, visitTime } from "@/src/domain/display";
import { signInHref } from "@/src/domain/navigation";
import { useSession } from "../account/session";

type RequestKind = "visit" | "rental";
const values = z.object({
  date: z.iso.date("Choose a date."),
  time: z.string(),
  message: z.string().trim().max(500, "Use up to 500 characters."),
});
type Values = z.infer<typeof values>;
function schema(kind: RequestKind) {
  return values.superRefine(({ date, time }, ctx) => {
    if (date < todayIST())
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Choose today or a later date in IST.",
      });
    if (kind === "visit") {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Choose a time in IST.",
        });
      else if (Date.parse(`${date}T${time}:00+05:30`) <= Date.now())
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Choose a future time in IST.",
        });
    }
  });
}

function RequestForm({
  kind,
  propertyId,
}: {
  kind: RequestKind;
  propertyId: string;
}) {
  const t = useCopy();
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema(kind)),
    defaultValues: { date: "", time: "", message: "" },
  });
  const mutation = useMutation({
    mutationFn: async ({ date, time, message }: Values) => {
      const common = { propertyId, message: message || undefined };
      if (kind === "visit")
        await api("visit", visitResult, {
          method: "POST",
          body: {
            ...common,
            scheduledDate: date,
            scheduledTime: visitTime(time),
          },
        });
      else
        await api("rental-bookings", bookingResult, {
          method: "POST",
          body: { ...common, moveInDate: date },
        });
    },
    onSuccess: async () =>
      client.invalidateQueries({
        queryKey: ["private", kind === "visit" ? "visits" : "bookings"],
      }),
    onError: (error) => {
      if (error instanceof ApiError)
        for (const field of error.fields) {
          const key =
            field.field === "scheduledDate" || field.field === "moveInDate"
              ? "date"
              : field.field === "scheduledTime"
                ? "time"
                : field.field === "message"
                  ? "message"
                  : undefined;
          if (key) setError(key, { message: field.message });
        }
    },
  });
  if (mutation.isSuccess)
    return (
      <div className="inline-status success-panel" role="status">
        <CheckCircle2 size={21} />
        <div>
          <strong>
            {t("Request sent to the owner", "मालिक को अनुरोध भेज दिया गया")}
          </strong>
          <p>
            {t(
              "Check your account for the current status.",
              "स्थिति जानने के लिए अपना खाता देखें।",
            )}
          </p>
        </div>
        <Link href="/more" className="button button-outline">
          {t("My requests", "मेरे अनुरोध")}
        </Link>
      </div>
    );
  const uncertain =
    mutation.error instanceof ApiError && mutation.error.uncertain;
  return (
    <form
      className="action-form"
      onSubmit={handleSubmit(async (value) => {
        try {
          await mutation.mutateAsync(value);
        } catch {}
      })}
    >
      <label className="field">
        {kind === "visit"
          ? t("Visit date (IST)", "विज़िट की तारीख (IST)")
          : t("Move-in date (IST)", "शिफ़्ट होने की तारीख (IST)")}
        <input
          {...register("date")}
          type="date"
          min={todayIST()}
          required
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "date-error" : undefined}
        />
      </label>
      {errors.date && (
        <p className="field-error" id="date-error">
          {errors.date.message}
        </p>
      )}
      {kind === "visit" && (
        <>
          <label className="field">
            {t("Visit time (IST)", "विज़िट का समय (IST)")}
            <input
              {...register("time")}
              type="time"
              required
              aria-invalid={Boolean(errors.time)}
              aria-describedby={errors.time ? "time-error" : undefined}
            />
          </label>
          {errors.time && (
            <p className="field-error" id="time-error">
              {errors.time.message}
            </p>
          )}
        </>
      )}
      <label className="field">
        {t("Message to the owner (optional)", "मालिक के लिए संदेश (वैकल्पिक)")}
        <textarea
          {...register("message")}
          maxLength={500}
          rows={3}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
      </label>
      {errors.message && (
        <p className="field-error" id="message-error">
          {errors.message.message}
        </p>
      )}
      {mutation.error && <Failure error={mutation.error} />}
      {uncertain && (
        <p className="muted">
          {t(
            "The request may have been sent. Check your account before trying again.",
            "अनुरोध भेजा गया हो सकता है। दोबारा कोशिश करने से पहले अपना खाता देखें।",
          )}{" "}
          <Link href="/more" className="text-button">
            {t("My requests", "मेरे अनुरोध")}
          </Link>
        </p>
      )}
      <button
        className="button button-primary"
        type="submit"
        disabled={isSubmitting || uncertain}
      >
        {isSubmitting
          ? t("Sending request…", "अनुरोध भेजा जा रहा है…")
          : t("Send request", "अनुरोध भेजें")}
      </button>
    </form>
  );
}

export function PropertyActions({
  id,
  purpose,
  ownerId,
  price,
  isPg,
  deposit,
}: {
  id: string;
  purpose?: string | null;
  ownerId?: string;
  price?: number;
  isPg: boolean;
  deposit?: number | null;
}) {
  const t = useCopy();
  const user = useSession();
  const features = useFeatures(purpose === "rent");
  const own = Boolean(ownerId && ownerId === user.data?._id);
  const contact = useQuery({
    queryKey: ["private", "contact", user.data?._id, id],
    enabled: Boolean(user.data),
    queryFn: ({ signal }) => api(`contact/${id}`, contacts, { signal }),
  });
  const response = isAccessError(contact.error)
    ? undefined
    : contact.data?.data.property;
  const digits = response?.contactPhone?.replace(/[^+\d]/g, "");
  const phone =
    response?.contactPhone &&
    /^\+?\d{10,15}$/.test(digits ?? "") &&
    !response.contactPhone.includes("*")
      ? digits
      : undefined;
  const map = httpsURL(response?.mapsLink);
  return (
    <aside
      className="booking-panel"
      aria-label={t("Listing enquiries", "लिस्टिंग की पूछताछ")}
    >
      <div>
        <p className="eyebrow">
          {purpose === "sale"
            ? t("Asking price", "माँगी गई कीमत")
            : isPg
              ? t("Monthly rent from", "मासिक किराया इससे शुरू")
              : t("Monthly rent", "मासिक किराया")}
        </p>
        <p className="booking-price">
          {price === undefined ? (
            t("Price on request", "मूल्य पूछें")
          ) : (
            <>
              <strong>{rupees(price)}</strong>
              {purpose !== "sale" && <span>/ {t("month", "माह")}</span>}
            </>
          )}
        </p>
        {deposit != null && (
          <p className="muted">
            {t("Security deposit", "सुरक्षा जमा")} {rupees(deposit)}
          </p>
        )}
      </div>
      <div className="action-form">
        {user.isPending && (
          <p className="muted" role="status">
            {t("Checking session…", "सत्र की जाँच हो रही है…")}
          </p>
        )}
        {user.error && (
          <Failure error={user.error} retry={() => void user.refetch()} />
        )}
        {user.data === null && (
          <Link
            href={signInHref(`/property/${id}`)}
            className="button button-primary"
          >
            <CalendarDays size={18} />
            {t("Sign in to request a visit", "विज़िट के लिए साइन इन करें")}
          </Link>
        )}
        {user.data && !own && (
          <>
            <Modal
              title={t("Request a visit", "विज़िट का अनुरोध करें")}
              description={t(
                "The owner will review your preferred date and time.",
                "मालिक आपकी पसंदीदा तारीख और समय की समीक्षा करेंगे।",
              )}
              trigger={
                <button className="button button-primary" type="button">
                  <CalendarDays size={18} />
                  {t("Request a visit", "विज़िट का अनुरोध करें")}
                </button>
              }
            >
              <RequestForm kind="visit" propertyId={id} />
            </Modal>
            {purpose === "rent" && features.data?.rentals === "available" && (
              <Modal
                title={t("Request this rental", "किराये का अनुरोध करें")}
                description={t(
                  "Send your move-in date to the owner for review.",
                  "समीक्षा के लिए मालिक को शिफ़्ट होने की तारीख भेजें।",
                )}
                trigger={
                  <button className="button button-outline" type="button">
                    <KeyRound size={18} />
                    {t("Request rental", "किराये का अनुरोध करें")}
                  </button>
                }
              >
                <RequestForm kind="rental" propertyId={id} />
              </Modal>
            )}
          </>
        )}
        {own && (
          <p className="muted">
            {t("You own this listing.", "यह आपकी लिस्टिंग है।")}
          </p>
        )}
        {contact.error && (
          <Failure error={contact.error} retry={() => void contact.refetch()} />
        )}
        {phone && (
          <a className="button button-outline" href={`tel:${phone}`}>
            <Phone size={17} />
            {t("Call owner", "मालिक को कॉल करें")}
          </a>
        )}
        {map && (
          <a
            className="text-button"
            href={map.href}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={16} />
            {t("View on map", "नक्शे पर देखें")}
          </a>
        )}
        {response?.address && <p className="muted">{response.address}</p>}
      </div>
    </aside>
  );
}
