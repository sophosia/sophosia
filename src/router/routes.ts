import { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
  },
  {
    path: "/test/:itemId",
    component: () => import("pages/TestPage.vue"),
  },
];

export default routes;
