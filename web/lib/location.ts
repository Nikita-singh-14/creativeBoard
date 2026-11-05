const LOCATION_CHANGE = "creativeboard:location-change";

export function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_CHANGE, onChange);
  };
}

export function getLocationSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function updateLocationParams(updates: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  window.dispatchEvent(new Event(LOCATION_CHANGE));
}
