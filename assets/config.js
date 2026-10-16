// Where submissions go. Sinks are tried in order; a submission counts as "sent" when any sink accepts it.
window.DW_CONFIG = {
  // Interim relay (ntfy.sh, no account, keeps messages ~12 h). Read back with tools/pull.sh.
  ntfy: "https://ntfy.sh/dwpt-7f6b2541b2f338e6ae42",
  // Permanent store: Google Apps Script web app (apps-script/Code.gs) writing to the results Sheet.
  sheet: "https://script.google.com/macros/s/AKfycbwXLKttfqdSoBQhR2mahIqwsF66Ph5F1HryBxfROkMLfc47K6YD3lVv4qNldayMUUOSwg/exec",
  siteUrl: "https://playdreadwood.github.io/playtest/"
};
