import { Notify } from "quasar";

Notify.setDefaults({
  position: "top-right",
  icon: "info",
  iconColor: "primary",
  actions: [{ icon: "close", size: "md", handler: () => {} }],
});
