export const SCHOOL_YEAR_REGEX = /^\d{4}-\d{4}$/;

export function isValidSchoolYearFormat(value) {
  if (value == null) return false;
  return SCHOOL_YEAR_REGEX.test(String(value).trim());
}

