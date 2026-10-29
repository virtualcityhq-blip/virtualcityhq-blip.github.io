(() => {
  'use strict';
  if (!document.getElementById('amazon-destination')) return;
  // Provider-issued tags, bound to known paths. Never redirect from query input.
  const destinations = {
  "website": "https://www.amazon.com/dp/B0H53C42GH?maas=maas_adg_BE482F27347250F7DC0BA41810049A89_afap_abs&ref_=aa_maas&tag=maas",
  "pinterest": "https://www.amazon.com/dp/B0H53C42GH?maas=maas_adg_A8E53AD39495608A3AC7FF857CA1847F_afap_abs&ref_=aa_maas&tag=maas",
  "facebook": "https://www.amazon.com/dp/B0H53C42GH?maas=maas_adg_17199C1C7628A092780BBC0B037E95FB_afap_abs&ref_=aa_maas&tag=maas",
  "partner": "https://www.amazon.com/dp/B0H53C42GH?maas=maas_adg_F2B1B39D5DD2F098876771F923F52280_afap_abs&ref_=aa_maas&tag=maas"
};
  const source = window.location.pathname.split('/').pop().replace(/\.html$/, '');
  if (!Object.prototype.hasOwnProperty.call(destinations, source)) return;
  const destination = destinations[source];
  if (!destination) return;
  // Allow the existing aggregate page beacon to initialize; delivery is not guaranteed.
  window.setTimeout(() => window.location.replace(destination), 1500);
})();
