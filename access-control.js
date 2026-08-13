export const USER_ROLE = Object.freeze({
  ADMIN: "admin",
  PERSONNEL: "personel",
  DOCTOR: "doktor",
  ADMINISTRATIVE: "idari"
});

export const USER_ROLES = Object.freeze(Object.values(USER_ROLE));

export const normalizeUserProfile = (authUser, profile) => {
  const role = USER_ROLES.includes(profile?.role) ? profile.role : null;
  const active = profile?.active === true;
  return Object.freeze({
    uid: authUser?.uid || "",
    email: authUser?.email || "",
    displayName: authUser?.displayName || profile?.displayName || "",
    role,
    active,
    authenticated: Boolean(authUser?.uid),
    authorized: Boolean(authUser?.uid && active && role)
  });
};

export const permissionsFor = principal => {
  const role = principal?.authorized ? principal.role : null;
  const admin = role === USER_ROLE.ADMIN;
  return Object.freeze({
    viewPrices: Boolean(role),
    searchPrices: Boolean(role),
    managePrices: admin,
    viewUserManagement: admin,
    manageUsers: admin,
    useGuestPhysician: role === USER_ROLE.ADMIN || role === USER_ROLE.PERSONNEL,
    viewGuestPhysician: role === USER_ROLE.ADMIN || role === USER_ROLE.PERSONNEL || role === USER_ROLE.ADMINISTRATIVE,
    viewDoctorAreas: role === USER_ROLE.ADMIN || role === USER_ROLE.DOCTOR,
    viewReports: role === USER_ROLE.ADMIN || role === USER_ROLE.ADMINISTRATIVE,
    viewTechnicalSettings: admin
  });
};

export const canManagePrices = principal => permissionsFor(principal).managePrices;
export const canManageUsers = principal => permissionsFor(principal).manageUsers;
