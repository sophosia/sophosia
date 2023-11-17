import { Notify } from "quasar";

Notify.setDefaults({
  position: "top-right",
  icon: "mdi-information",
  iconColor: "primary",
  actions: [{ icon: "mdi-close", size: "md", handler: () => {} }],
});
