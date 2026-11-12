(() => {
  'use strict';
  const destinations = {
  "/go/logbook-136/website.html": "https://www.amazon.com/dp/B0HPWF1FCV?maas=maas_adg_2FFFF358A17EFD8C33EF3984E871F710_afap_abs&ref_=aa_maas&tag=maas",
  "/go/logbook-136/facebook.html": "https://www.amazon.com/dp/B0HPWF1FCV?maas=maas_adg_0A4297D01F790C65971674DF641F17EE_afap_abs&ref_=aa_maas&tag=maas"
};
  const destination = destinations[location.pathname];
  if (!destination || !document.getElementById('amazon-destination')) return;
  // Exact provider destinations only. Aggregate handoff views are not purchases.
  setTimeout(() => location.replace(destination), 1500);
})();
