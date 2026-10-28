import { registerIcon } from "@pulse/web/icon";

const icon = {
  viewBox: "0 0 24 24",
  path: "M13 13V5C13 3.34 11.66 2 10 2C8.34 2 7 3.34 7 5V13C5.79 13.91 5 15.37 5 17C5 19.76 7.24 22 10 22C12.76 22 15 19.76 15 17C15 15.37 14.21 13.91 13 13ZM9 11V5C9 4.45 9.45 4 10 4C10.55 4 11 4.45 11 5V6H10V7H11V9H10V10H11V11H9Z M19 2L22 7H16L19 2Z M19 16L16 11L22 11L19 16Z",
};

registerIcon("alerts/thermo_regulation", "outlined", {
  outlined: icon,
  filled: icon,
});
