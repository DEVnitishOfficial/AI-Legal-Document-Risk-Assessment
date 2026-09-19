// The only shape in which a user may leave the API. Never returns the
// password hash (including the "GOOGLE_AUTH_USER"/"OTP_AUTH_USER" placeholders).
export const toSafeUser = <T extends { password?: string }>(user: T): Omit<T, "password"> => {
  const { password, ...safe } = user;
  return safe;
};
