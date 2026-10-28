import { registerIcon } from "@pulse/web/icon";

const icon = {
  viewBox: "0 0 24 24",
  path: "M4 19V17H20V19H4ZM4 15V13H20V15H4ZM4 11V8.65L10 5L15 8.55L20 5V7.45L15 11L9.925 7.4L4 11Z",
};

registerIcon("alerts/cdss", "outlined", {
  outlined: icon,
  filled: icon,
});
