const CONFIG = {
  data: {
    farm: "/api/data/farm",
    geojson: "/api/data/farm",
  },
  tiles: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS community",
    maxZoom: 20,
  },
  soilMetrics: [
    { id: "K", label: "K" },
    { id: "pH", label: "pH" },
  ],
};
export default CONFIG;
