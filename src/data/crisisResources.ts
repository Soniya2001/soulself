import { CrisisResourceInfo } from "../types";

export const CRISIS_RESOURCES: Record<string, CrisisResourceInfo> = {
  IN: {
    countryCode: "IN",
    countryName: "India",
    primaryServiceName: "Tele-MANAS (Mental Health Support)",
    organization: "Ministry of Health & Family Welfare, Govt. of India (NIMHANS)",
    description:
      "Comprehensive, 24×7, free, confidential tele-mental health support across India with multi-lingual trained counselors.",
    phoneNumbers: ["14416", "1800-89-14416"],
    emergencyNumber: "112",
    is24x7: true,
    website: "https://telemanas.mohfw.gov.in",
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    primaryServiceName: "988 Suicide & Crisis Lifeline",
    organization: "SAMHSA",
    description: "Free and confidential support for people in distress, prevention and crisis resources.",
    phoneNumbers: ["988"],
    emergencyNumber: "911",
    is24x7: true,
    website: "https://988lifeline.org",
  },
  UK: {
    countryCode: "UK",
    countryName: "United Kingdom",
    primaryServiceName: "Samaritans & NHS 111",
    organization: "Samaritans / NHS",
    description: "24/7 free emotional support helpline and urgent mental health assessment.",
    phoneNumbers: ["116 123", "111"],
    emergencyNumber: "999",
    is24x7: true,
    website: "https://www.samaritans.org",
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    primaryServiceName: "988 Suicide Crisis Helpline",
    organization: "Public Health Agency of Canada",
    description: "24/7 suicide prevention and crisis support across Canada via call or text.",
    phoneNumbers: ["988"],
    emergencyNumber: "911",
    is24x7: true,
    website: "https://988.ca",
  },
  GLOBAL: {
    countryCode: "GLOBAL",
    countryName: "International",
    primaryServiceName: "International Emergency & Crisis Support",
    organization: "Befrienders Worldwide & IASP",
    description:
      "If you are outside the supported regions, please reach out to your local emergency medical service (112 or local equivalent) or find your national hotline.",
    phoneNumbers: ["112"],
    emergencyNumber: "112",
    is24x7: true,
    website: "https://www.befrienders.org",
  },
};

export const DEFAULT_CRISIS_COUNTRY = "IN";

export function getCrisisResourceForCountry(countryCode?: string): CrisisResourceInfo {
  const code = (countryCode || DEFAULT_CRISIS_COUNTRY).toUpperCase();
  return CRISIS_RESOURCES[code] || CRISIS_RESOURCES["IN"];
}
