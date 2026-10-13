export const PHONE_ERROR = "Use 11 digits starting with 09 (09XXXXXXXXX) or +63 then 10 digits (+639XXXXXXXXX).";
export const NAME_ERROR = "Name must be more than 2 letters and use letters only.";

export const cleanPhone = (value) => {
  const plus = value.trimStart().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return plus ? `+${digits.slice(0, 12)}` : digits.slice(0, 11);
};

export const validPhone = (value) => /^(09\d{9}|\+639\d{9})$/.test(value);

export const validName = (value) => {
  const name = value.trim();
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) return false;
  return (name.match(/\p{L}/gu) || []).length > 2;
};
