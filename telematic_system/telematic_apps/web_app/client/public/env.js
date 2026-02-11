//This environment variable can be updated at runtime
window.env = (function() {
  const isCapacitor = typeof window.Capacitor !== 'undefined';

  if (isCapacitor) {
    return {
      "REACT_APP_WEB_SERVER_URI": "https://ui-service.cav-telematics.com",
      "REACT_APP_GRAFANA_URI": "https://grafana.cav-telematics.com/grafana"
    };
  } else {
    return {
      "REACT_APP_MESSAGING_SERVER_URI": "http://topic-service.local.cav-telematics.com:8888",
      "REACT_APP_WEB_SERVER_URI": "http://ui-service.local.cav-telematics.com:8888",
      "REACT_APP_FILE_UPLOAD_WEB_SERVER_URI": "http://ui-upload-service.local.cav-telematics.com:8888",
      "REACT_APP_GRAFANA_URI": "http://grafana.local.cav-telematics.com:8888/grafana"
    };
  }
})();