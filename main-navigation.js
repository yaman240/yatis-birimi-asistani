export const WORKSPACE_VIEW = Object.freeze({
  PRICES: "prices",
  GUEST_PHYSICIAN: "guest-physician"
});

export const createWorkspaceNavigator = ({ pricesWorkspace, guestWorkspace, navigationButtons }) => {
  if (!pricesWorkspace || !guestWorkspace || !navigationButtons?.length) {
    throw new TypeError("Çalışma alanı navigasyon öğeleri eksiktir.");
  }
  let currentView = WORKSPACE_VIEW.PRICES;

  const show = view => {
    if (!Object.values(WORKSPACE_VIEW).includes(view)) throw new RangeError("Geçersiz çalışma alanı.");
    currentView = view;
    pricesWorkspace.classList.toggle("hidden", view !== WORKSPACE_VIEW.PRICES);
    guestWorkspace.classList.toggle("hidden", view !== WORKSPACE_VIEW.GUEST_PHYSICIAN);
    navigationButtons.forEach(button => {
      const active = button.dataset.workspaceView === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    globalThis.window?.scrollTo?.({ top: 0, behavior: "smooth" });
    return currentView;
  };

  navigationButtons.forEach(button => {
    button.addEventListener("click", () => show(button.dataset.workspaceView));
  });

  return Object.freeze({ show, getCurrentView: () => currentView });
};

if (typeof document !== "undefined") {
  const pricesWorkspace = document.getElementById("pricesWorkspace");
  const guestWorkspace = document.getElementById("guestPhysicianWorkspace");
  const navigationButtons = [...document.querySelectorAll("[data-workspace-view]")];
  const navigator = createWorkspaceNavigator({ pricesWorkspace, guestWorkspace, navigationButtons });
  document.getElementById("backToPricesButton").addEventListener("click", () => {
    navigator.show(WORKSPACE_VIEW.PRICES);
  });
}
