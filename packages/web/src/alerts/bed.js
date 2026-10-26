import { registerIcon } from "@pulse/web/icon";

const icon = {
  viewBox: "0 0 24 24",
  path: "M4 13V5H2V19H4V16H20V19H22V13H4Z M5 10C5 9.44772 5.44772 9 6 9H20C21.1046 9 22 9.89543 22 11V12H5V10Z",
};

registerIcon("alerts/bed", "outlined", {
  outlined: icon,
  filled: icon,
});
