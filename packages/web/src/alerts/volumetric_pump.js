import { registerIcon } from "@pulse/web/icon";

const icon = {
  viewBox: "0 0 24 24",
  path: "M11 17C8.23858 17 6 14.7614 6 12V4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 4V12C18 14.7614 15.7614 17 13 17V20H18V22H13C11.8954 22 11 21.1046 11 20V17ZM8 4H16V6H13V8H16V10H8V4Z",
};

registerIcon("alerts/volumetric_pump", "outlined", {
  outlined: icon,
  filled: icon,
});
