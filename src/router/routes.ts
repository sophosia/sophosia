import { PageType } from "src/backend/database";
import { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("layouts/MainWindow.vue"),
  },
  {
    path: "/layout",
    component: () => import("components/layout/LayoutContainer.vue"),
    props: (route) => {
      const pageId = route.query.pageId as string;
      const pageType = route.query.pageType as PageType;
      const pageLabel = route.query.pageLabel as string;

      return { pageId, pageType, pageLabel };
    },
  },
];

export default routes;
