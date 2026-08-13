export const CORPORATE_EMAIL_DOMAIN = "medikent.com.tr";

export const normalizeEmailAddress = email => String(email || "").trim().toLowerCase();

export const isCorporateEmailAddress = email => {
  const normalized = normalizeEmailAddress(email);
  const parts = normalized.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === CORPORATE_EMAIL_DOMAIN;
};

export const requireCorporateEmailAddress = email => {
  const normalized = normalizeEmailAddress(email);
  if (!isCorporateEmailAddress(normalized)) {
    throw new TypeError(`Yalnız @${CORPORATE_EMAIL_DOMAIN} uzantılı kurumsal e-posta adresleri kullanılabilir.`);
  }
  return normalized;
};

export const emailAuthErrorMessage = code => {
  if (code === "auth/operation-not-allowed") {
    return "E-posta/şifre girişi Firebase Authentication ayarlarında henüz etkin değil.";
  }
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) {
    return "E-posta veya şifre hatalı.";
  }
  if (code === "auth/too-many-requests") return "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.";
  if (code === "auth/invalid-email") return "Geçerli bir e-posta adresi girin.";
  return "Kurumsal giriş tamamlanamadı. Lütfen tekrar deneyin.";
};
