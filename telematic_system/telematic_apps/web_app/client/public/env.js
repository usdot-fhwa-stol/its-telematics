//This environment variable can be updated at runtime
window.env = (function() {
  const isCapacitor = typeof window.Capacitor !== 'undefined';

  if (isCapacitor) {
    return {
      "REACT_APP_WEB_SERVER_URI": "https://ui-service.cav-telematics.com",
      "REACT_APP_GRAFANA_URI": "https://grafana.cav-telematics.com/grafana"
    };
  }

  const origin = window.location.origin;
  return {
    "REACT_APP_MESSAGING_SERVER_URI": origin,
    "REACT_APP_WEB_SERVER_URI": origin,
    "REACT_APP_FILE_UPLOAD_WEB_SERVER_URI": origin,
    "REACT_APP_GRAFANA_URI": origin + "/grafana"
  };
})();
