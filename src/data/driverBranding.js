// F1 Driver branding map — update each season
// Keys are official F1 driver numbers

export const DRIVER_BRANDING = {
  1:  { name: "M. Verstappen", full: "Max Verstappen",       team: "Red Bull Racing", color: "#3671C6" },
  4:  { name: "L. Norris",     full: "Lando Norris",         team: "McLaren",         color: "#FF8000" },
  16: { name: "C. Leclerc",    full: "Charles Leclerc",      team: "Ferrari",         color: "#E8002D" },
  55: { name: "C. Sainz",      full: "Carlos Sainz",         team: "Williams",        color: "#37BEDD" },
  44: { name: "L. Hamilton",   full: "Lewis Hamilton",       team: "Ferrari",         color: "#E8002D" },
  63: { name: "G. Russell",    full: "George Russell",       team: "Mercedes",        color: "#27F4D2" },
  81: { name: "O. Piastri",    full: "Oscar Piastri",        team: "McLaren",         color: "#FF8000" },
  14: { name: "F. Alonso",     full: "Fernando Alonso",      team: "Aston Martin",    color: "#358C75" },
  18: { name: "L. Stroll",     full: "Lance Stroll",         team: "Aston Martin",    color: "#358C75" },
  10: { name: "P. Gasly",      full: "Pierre Gasly",         team: "Alpine",          color: "#FF87BC" },
  31: { name: "E. Ocon",       full: "Esteban Ocon",         team: "Haas",            color: "#B6BABD" },
  22: { name: "Y. Tsunoda",    full: "Yuki Tsunoda",         team: "RB",              color: "#6692FF" },
  3:  { name: "D. Ricciardo",  full: "Daniel Ricciardo",     team: "RB",              color: "#6692FF" },
  23: { name: "A. Albon",      full: "Alexander Albon",      team: "Williams",        color: "#37BEDD" },
  20: { name: "K. Magnussen",  full: "Kevin Magnussen",      team: "Haas",            color: "#B6BABD" },
  27: { name: "N. Hülkenberg", full: "Nico Hülkenberg",      team: "Haas",            color: "#B6BABD" },
  77: { name: "V. Bottas",     full: "Valtteri Bottas",      team: "Kick Sauber",     color: "#52E252" },
  24: { name: "Z. Guanyu",     full: "Zhou Guanyu",          team: "Kick Sauber",     color: "#52E252" },
  2:  { name: "L. Sargeant",   full: "Logan Sargeant",       team: "Williams",        color: "#37BEDD" },
  11: { name: "S. Pérez",      full: "Sergio Pérez",         team: "Red Bull Racing", color: "#3671C6" },
};

export function getDriver(num) {
  return DRIVER_BRANDING[Number(num)] ?? {
    name:  `#${num}`,
    full:  `Driver #${num}`,
    team:  "Unknown",
    color: "#888888",
  };
}

// All sessions that will be streamed — shown in schedule UI
export const STREAMED_SESSIONS = [
  { key: "fp1",        label: "Free Practice 1" },
  { key: "fp2",        label: "Free Practice 2" },
  { key: "fp3",        label: "Free Practice 3" },
  { key: "qualifying", label: "Qualifying" },
  { key: "race",       label: "Race" },
];
