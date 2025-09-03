const CONFIG = {
  data: {
    geojson: "data/farm.geojson",
    optima: "data/optima.json",
    bounds: "data/bounds.json",
  },

  // ESRI basemap
  tiles: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS community",
    maxZoom: 20,
  },

  // keep the rest for later when we re-add shading
  metrics: ["OM", "P1", "K", "MG", "CA", "PH"],
  defaultMetric: "OM",
  palette: ["#f7d200", "#b3e472", "#16a34a", "#89e472", "#b91c1c"],
  maxDevFactor: 1.5,
};
export default CONFIG;
