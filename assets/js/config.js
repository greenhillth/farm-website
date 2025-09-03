window.APP_CONFIG = {
  data: {
    geojson: "data/farm.geojson",
    optima: "data/optima.json",
    bounds: "data/bounds.json", // optional
  },
  tiles: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  metrics: ["OM", "P1", "K", "MG", "CA", "PH"], // order in the dropdown
  defaultMetric: "OM",
  // Color ramp (low → mid → high diverging)
  palette: ["#f7d200", "#b3e472", "#16a34a", "#89e472", "#b91c1c"],
  maxDevFactor: 1.5,
};
