"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useForm, useWatch, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ImagePlus, MapPin, X } from "lucide-react";
import { api } from "@/src/api/client";
import {
  submittedListing,
  uploadedListingPhotos,
} from "@/src/api/owner-contracts";
import { ApiError } from "@/src/api/errors";
import { useCopy, usePreferences } from "@/src/components/preferences";
import { Failure } from "@/src/components/ui";
import { label } from "@/src/domain/display";
import {
  formSchema,
  imageTypes,
  listingInput,
  listingPhotoLimit,
  uploadMaxBytes,
  type ListingValues,
} from "@/src/domain/listing-submission";
import {
  bhk,
  commercialSubtype,
  furnishing,
  gender,
  pgSubtype,
  sharing,
} from "@/src/domain/search";
import { sessionKey } from "../account/session";

const fitout = [
  "bare_shell",
  "warm_shell",
  "fully_furnished_plug_and_play",
] as const;
type Upload =
  (typeof uploadedListingPhotos)["_output"]["data"]["images"][number];

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: FieldError;
  children: (props: {
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label className="field">
        {label}
        {children(
          error ? { "aria-invalid": true, "aria-describedby": id } : {},
        )}
      </label>
      {error && (
        <p id={id} className="field-error">
          {error.message}
        </p>
      )}
    </div>
  );
}
function Options({ options }: { options: readonly string[] }) {
  return (
    <>
      {options.map((option) => (
        <option value={option} key={option}>
          {label(option)}
        </option>
      ))}
    </>
  );
}

export function ListingForm({
  phone,
  onSubmitted,
}: {
  phone: string;
  onSubmitted: (title: string) => void;
}) {
  const t = useCopy();
  const client = useQueryClient();
  const city = usePreferences((state) => state.city);
  const uploads = useRef(new Map<File, Upload>());
  const inFlight = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [failure, setFailure] = useState<unknown>();
  const [status, setStatus] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListingValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      city,
      area: "",
      address: "",
      contactPhone: phone,
      category: "pg",
      purpose: "rent",
      deposit: "",
      amenities: "",
      propertySubtype: "PG",
      gender: "any",
      foodIncluded: false,
      shareType: "single",
      bhk: "1BHK",
      furnishingStatus: "semi_furnished",
      bedrooms: "1",
      bathrooms: "1",
      carpetAreaSqFt: "",
      commercialSubtype: "office_space",
      fitoutStatus: "bare_shell",
    },
  });
  const [kind, purpose] = useWatch({ control, name: ["category", "purpose"] });
  const isSale = kind !== "pg" && purpose === "sale";

  function selectPhotos(next: File[]) {
    const valid = next.filter(
      (file) =>
        file.size > 0 &&
        file.size <= uploadMaxBytes &&
        imageTypes.some((mime) => mime === file.type),
    );
    if (valid.length !== next.length)
      setFileError(
        t(
          "Use JPEG, PNG or WebP images up to 8 MB each.",
          "8 MB तक की JPEG, PNG या WebP फ़ोटो चुनें।",
        ),
      );
    else if (files.length + valid.length > listingPhotoLimit)
      setFileError(
        t("You can add up to six photos.", "अधिकतम छह फ़ोटो जोड़ सकते हैं।"),
      );
    else setFileError("");
    setFiles([...files, ...valid].slice(0, listingPhotoLimit));
  }

  async function submit(values: ListingValues) {
    if (inFlight.current || uncertain) return;
    inFlight.current = true;
    setFailure(undefined);
    let submitting = false;
    try {
      const photos: Upload[] = [];
      for (const [index, file] of files.entries()) {
        let photo = uploads.current.get(file);
        if (!photo) {
          setStatus(
            t(
              `Uploading photo ${index + 1} of ${files.length}…`,
              `फ़ोटो ${index + 1} / ${files.length} अपलोड हो रही है…`,
            ),
          );
          const data = new FormData();
          data.append("images", file);
          const response = await api("upload/images", uploadedListingPhotos, {
            method: "POST",
            body: data,
          });
          photo = response.data.images[0];
          uploads.current.set(file, photo);
        }
        photos.push(photo);
      }
      submitting = true;
      setStatus(t("Submitting your listing…", "लिस्टिंग भेजी जा रही है…"));
      const response = await api("properties", submittedListing, {
        method: "POST",
        body: listingInput(values, photos),
      });
      onSubmitted(response.data.property.title || values.title);
    } catch (error) {
      setFailure(error);
      if (submitting && error instanceof ApiError && error.uncertain)
        setUncertain(true);
    } finally {
      if (submitting) {
        void client.invalidateQueries({ queryKey: sessionKey });
        void client.invalidateQueries({
          queryKey: ["private", "owner-listings"],
        });
      }
      inFlight.current = false;
      setStatus("");
    }
  }

  return (
    <form
      className="listing-form"
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <fieldset disabled={isSubmitting} className="listing-fields">
        <section
          className="listing-section"
          aria-labelledby="listing-details-title"
        >
          <h2 id="listing-details-title">
            <Building2 size={20} />
            {t("Property details", "संपत्ति का विवरण")}
          </h2>
          <div className="listing-form-grid">
            <Field label={t("Property type", "संपत्ति का प्रकार")}>
              {() => (
                <select {...register("category")}>
                  <option value="pg">
                    {t("PG & co-living", "पीजी और को-लिविंग")}
                  </option>
                  <option value="residential_rental">
                    {t("Flat or home", "फ़्लैट या घर")}
                  </option>
                  <option value="commercial">
                    {t("Commercial space", "व्यावसायिक जगह")}
                  </option>
                </select>
              )}
            </Field>
            {kind !== "pg" && (
              <Field label={t("Listing purpose", "लिस्टिंग प्रकार")}>
                {() => (
                  <select {...register("purpose")}>
                    <option value="rent">{t("For rent", "किराए पर")}</option>
                    <option value="sale">{t("For sale", "बिक्री के लिए")}</option>
                  </select>
                )}
              </Field>
            )}
            <Field
              label={t("Property title", "संपत्ति का नाम")}
              error={errors.title}
            >
              {(a) => (
                <input
                  {...a}
                  {...register("title")}
                  required
                  maxLength={200}
                  placeholder={t("e.g. Parkside PG", "जैसे पार्कसाइड पीजी")}
                />
              )}
            </Field>
            <Field
              label={
                isSale
                  ? t("Asking price (₹)", "माँगी गई कीमत (₹)")
                  : t("Monthly rent (₹)", "मासिक किराया (₹)")
              }
              error={errors.price}
            >
              {(a) => (
                <input
                  {...a}
                  {...register("price", { valueAsNumber: true })}
                  type="number"
                  min="0.01"
                  step="any"
                  required
                />
              )}
            </Field>
            {!isSale && (
              <Field
                label={t("Security deposit (optional)", "सुरक्षा जमा (वैकल्पिक)")}
                error={errors.deposit}
              >
                {(a) => (
                  <input
                    {...a}
                    {...register("deposit")}
                    type="number"
                    min="0"
                    step=".01"
                  />
                )}
              </Field>
            )}
            {kind === "pg" && (
              <>
                <Field label={t("Stay type", "आवास का प्रकार")}>
                  {() => (
                    <select {...register("propertySubtype")}>
                      <Options options={pgSubtype.options} />
                    </select>
                  )}
                </Field>
                <Field label={t("Room sharing", "कमरे में साझेदारी")}>
                  {() => (
                    <select {...register("shareType")}>
                      <Options options={sharing.options} />
                    </select>
                  )}
                </Field>
                <Field label={t("Occupancy", "आवास पात्रता")}>
                  {() => (
                    <select {...register("gender")}>
                      <Options options={gender.options} />
                    </select>
                  )}
                </Field>
                <label className="checkbox">
                  <input type="checkbox" {...register("foodIncluded")} />
                  {t("Meals included", "खाना शामिल है")}
                </label>
              </>
            )}
            {kind !== "pg" && (
              <Field
                label={t("Carpet area (sq ft)", "कारपेट एरिया (वर्ग फुट)")}
                error={errors.carpetAreaSqFt}
              >
                {(a) => (
                  <input
                    {...a}
                    {...register("carpetAreaSqFt")}
                    type="number"
                    min="10"
                    step="any"
                    required
                  />
                )}
              </Field>
            )}
            {kind === "residential_rental" && (
              <>
                <Field label={t("BHK", "बीएचके")}>
                  {() => (
                    <select {...register("bhk")}>
                      <Options options={bhk.options} />
                    </select>
                  )}
                </Field>
                <Field label={t("Furnishing", "साज-सज्जा")}>
                  {() => (
                    <select {...register("furnishingStatus")}>
                      <Options options={furnishing.options} />
                    </select>
                  )}
                </Field>
                <Field label={t("Bedrooms", "बेडरूम")} error={errors.bedrooms}>
                  {(a) => (
                    <input
                      {...a}
                      {...register("bedrooms")}
                      type="number"
                      min="1"
                      required
                    />
                  )}
                </Field>
                <Field label={t("Bathrooms", "बाथरूम")} error={errors.bathrooms}>
                  {(a) => (
                    <input
                      {...a}
                      {...register("bathrooms")}
                      type="number"
                      min="1"
                      required
                    />
                  )}
                </Field>
              </>
            )}
            {kind === "commercial" && (
              <>
                <Field label={t("Commercial subtype", "व्यावसायिक उपप्रकार")}>
                  {() => (
                    <select {...register("commercialSubtype")}>
                      <Options options={commercialSubtype.options} />
                    </select>
                  )}
                </Field>
                <Field label={t("Fit-out", "फ़िट-आउट")}>
                  {() => (
                    <select {...register("fitoutStatus")}>
                      <Options options={fitout} />
                    </select>
                  )}
                </Field>
              </>
            )}
            <div className="listing-full">
              <Field
                label={t("Description (optional)", "विवरण (वैकल्पिक)")}
                error={errors.description}
              >
                {(a) => (
                  <textarea
                    {...a}
                    {...register("description")}
                    maxLength={5000}
                    rows={4}
                  />
                )}
              </Field>
            </div>
            <div className="listing-full">
              <Field
                label={t(
                  "Amenities, separated by commas (optional)",
                  "कॉमा से अलग की गई सुविधाएँ (वैकल्पिक)",
                )}
                error={errors.amenities}
              >
                {(a) => (
                  <input
                    {...a}
                    {...register("amenities")}
                    placeholder="Wi-Fi, laundry, parking"
                    maxLength={500}
                  />
                )}
              </Field>
            </div>
          </div>
        </section>
        <section
          className="listing-section"
          aria-labelledby="listing-location-title"
        >
          <h2 id="listing-location-title">
            <MapPin size={20} />
            {t("Location and contact", "स्थान और संपर्क")}
          </h2>
          <div className="listing-form-grid">
            <Field label={t("City", "शहर")} error={errors.city}>
              {(a) => (
                <input {...a} {...register("city")} maxLength={100} required />
              )}
            </Field>
            <Field label={t("Neighbourhood", "इलाका")} error={errors.area}>
              {(a) => (
                <input {...a} {...register("area")} maxLength={100} required />
              )}
            </Field>
            <div className="listing-full">
              <Field
                label={t("Street address", "पूरा पता")}
                error={errors.address}
              >
                {(a) => (
                  <input
                    {...a}
                    {...register("address")}
                    maxLength={500}
                    required
                  />
                )}
              </Field>
            </div>
            <Field
              label={t("Contact mobile number", "संपर्क मोबाइल नंबर")}
              error={errors.contactPhone}
            >
              {(a) => (
                <input
                  {...a}
                  {...register("contactPhone")}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit Indian mobile number"
                  required
                />
              )}
            </Field>
          </div>
        </section>
        <section
          className="listing-section"
          aria-labelledby="listing-photos-title"
        >
          <h2 id="listing-photos-title">
            <ImagePlus size={20} />
            {t("Property photos", "संपत्ति की फ़ोटो")}
          </h2>
          <p className="muted">
            {t(
              "Add up to six JPEG, PNG or WebP photos, 8 MB each. The first photo is the cover.",
              "छह तक JPEG, PNG या WebP फ़ोटो जोड़ें, हर फ़ोटो अधिकतम 8 MB। पहली फ़ोटो कवर होगी।",
            )}
          </p>
          <label className="listing-upload">
            <span>{t("Choose photos", "फ़ोटो चुनें")}</span>
            <input
              type="file"
              multiple
              accept={imageTypes.join(",")}
              onChange={(event) => {
                selectPhotos(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
              disabled={files.length === listingPhotoLimit}
            />
          </label>
          {fileError && (
            <p className="field-error" role="alert">
              {fileError}
            </p>
          )}
          {files.length > 0 && (
            <ul className="listing-files">
              {files.map((file, index) => (
                <li key={file.name + index}>
                  <span>
                    {file.name}
                    {index === 0 && <small>{t("Cover", "कवर")}</small>}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t("Remove", "हटाएँ")} ${file.name}`}
                    onClick={() => {
                      uploads.current.delete(file);
                      setFileError("");
                      setFiles(files.filter((_, i) => i !== index));
                    }}
                  >
                    <X size={17} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="listing-actions">
          <button
            type="submit"
            disabled={uncertain}
            className="button button-primary"
          >
            {t("Submit for review", "समीक्षा के लिए भेजें")}
          </button>
          <p className="muted">
            {t(
              "Your property appears in search after approval.",
              "स्वीकृति के बाद आपकी संपत्ति खोज में दिखेगी।",
            )}
          </p>
        </div>
      </fieldset>
      {status && (
        <p className="inline-status" role="status">
          {status}
        </p>
      )}
      {failure != null && <Failure error={failure} />}
      {uncertain && (
        <p className="inline-status" role="status">
          {t(
            "The listing may have been submitted. Refresh My listings before creating another.",
            "लिस्टिंग भेजी जा चुकी हो सकती है। नई लिस्टिंग बनाने से पहले मेरी लिस्टिंग अपडेट करें।",
          )}
        </p>
      )}
    </form>
  );
}
