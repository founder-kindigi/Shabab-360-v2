// Observed in the Atfal registration city's dropdown on 2026-09-29.
// Applicant locations are form answers, never Shabab staff-scope City records.
export const ATFAL_CITY_OPTIONS = [
  "Abbottabad", "Attock", "Central Rawalpindi", "Chakwal", "Charsadda",
  "Dera Ismail Khan", "Faisalabad", "Haripur", "Hyderabad", "Islamabad",
  "Karachi", "Kohat", "Kot Addu", "Lahore", "Mardan", "Mirpur Khas",
  "Multan", "Murree", "Nawab Shah", "Nowshera", "Peshawar", "Quetta",
  "Rahim Yar Khan", "Rawalpindi", "Sadiqabad", "Sahiwal", "Sheikhupura",
  "Sherwan", "Sialkot", "Swat", "Talagang", "Taxila", "Umerkot",
  "Wah Cant", "Other City",
] as const;

export const ATFAL_STYLE_FIELDS = [
  { key: "fullName", label: "Full Name", type: "short_text", required: true },
  { key: "gender", label: "Gender", type: "single_select", required: true, options: ["Male", "Female"] },
  { key: "age", label: "Age", type: "number", required: true, minNumber: 0, maxNumber: 120 },
  { key: "currentRole", label: "What best describes you right now?", type: "single_select", required: true, options: ["Student", "Professional", "Both"] },
  { key: "whatsApp", label: "WhatsApp Number", type: "phone", required: true },
  { key: "emergencyPhone", label: "Emergency Contact Number", type: "phone", required: true },
  { key: "affiliated", label: "Are you affiliated with Shabab?", type: "single_select", required: true, options: ["Yes", "No"] },
  { key: "affiliationDetails", label: "Tell us about that affiliation", type: "long_text", required: true, helpText: "e.g. Basic Ilm-e-Deen, Atfal, Shabab student", visibleWhen: { fieldKey: "affiliated", equals: "Yes" } },
  { key: "city", label: "City", type: "city", required: true, options: [...ATFAL_CITY_OPTIONS], allowOther: true },
  { key: "address", label: "Address or locality", type: "short_text", required: true },
] as const;

export const EMPTY_FORM_SETTINGS = {
  eligibilityText: "",
  feeText: "",
  privacyNotice: "",
  contactConsentText: "",
  successText: "Your registration has been received.",
} as const;
