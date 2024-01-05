<template>
  <div style="position: relative">
    <div
      ref="GLRoot"
      style="position: absolute; width: 100%; height: 100%"
    >
      <!-- Root dom for Golden-Layout manager -->
    </div>

    <div style="position: absolute; width: 100%; height: 100%">
      <GLComponent
        v-for="[refId, page] in layoutStore.pages"
        :key="refId"
        :ref="`glc_${refId}`"
        :id="`glc_${refId}`"
        @click="focusById(page.id)"
      >
        <component
          v-if="layoutStore.initialized"
          :is="asyncComponents.get(refId)"
          :itemId="page.id"
          :data="page.data"
        ></component>
      </GLComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  ref,
  markRaw,
  defineAsyncComponent,
  nextTick,
  getCurrentInstance,
  watch,
} from "vue";
import {
  ComponentContainer,
  ResolvedComponentItemConfig,
  LogicalZIndex,
  VirtualLayout,
  ComponentItem,
  RowOrColumn,
  Stack,
} from "golden-layout";
import GLComponent from "src/pages/GLComponent.vue";
import { type Page, type GLState } from "src/backend/database";
import { useStateStore } from "src/stores/appState";
import { useLayoutStore } from "src/stores/layoutStore";
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n({ useScope: "global" });

/*******************
 * Data
 *******************/
const GLRoot = ref<null | HTMLElement>(null);
let GLayout: VirtualLayout;

const glItems = ref(new Map<string, { container: any; glc: any }>());
const asyncComponents = ref(new Map<string, any>()); // <itemId, asyncComponent> pair
let GlBoundingClientRect: DOMRect;
const instance = getCurrentInstance();

const stateStore = useStateStore();
const layoutStore = useLayoutStore();

/*******************
 * Watcher
 *******************/
watch(
  () => layoutStore.currentItemId,
  (id) => {
    focusById(id);
  }
);

watch(
  () => layoutStore.addedPage,
  async (page) => {
    if (!page.id) return;
    await addGLComponent(layoutStore.addedPage);
  }
);

watch(
  () => layoutStore.renamedPage,
  async (page) => {
    if (!page.id) return;
    await updateGLComponent(page);
    layoutStore.renamedPage = {} as Page;
  }
);

watch(
  () => layoutStore.closedItemId,
  async (itemId) => {
    if (!itemId) return;
    await removeGLComponent(itemId);
  }
);

watch(
  () => [stateStore.showLeftMenu, stateStore.leftMenuSize],
  () => {
    resize();
  }
);

watch(locale, () => {
  translateSpecialPageTitles();
});

/*******************
 * Method
 *******************/
/**
 * Add a GL component by page
 * @param
 * @param page
 */
const addGLComponent = (page: Page) => {
  const refId = layoutStore.IdToRef.get(page.id) as string;
  // for vite's dynamic import, see the following page
  // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  // when building the app, vite will automatically take care the imports for us
  asyncComponents.value.set(
    refId,
    markRaw(defineAsyncComponent(() => import(`../pages/${page.type}.vue`)))
  );
  // before initialized, components are added by loading config
  // we just need to prepare the async components
  if (!layoutStore.initialized) return;
  nextTick(() => {
    const state = Object.assign({ refId }, page);
    GLayout.addComponent(page.type, state, page.label);
  }); // wait 1 tick for vue to add the dom
};

const removeGLComponent = (removeId: string) => {
  layoutStore.closedItemId = "";
  const refId = layoutStore.IdToRef.get(removeId);
  if (!refId) return;
  const glItem = glItems.value.get(refId);
  if (glItem) glItem.container.close();
  console.log("removeGLComponent");
};

const updateGLComponent = (newPage: Page) => {
  const refId = layoutStore.IdToRef.get(newPage.id);
  if (!refId) return;
  // set the window title to new title
  const container = glItems.value.get(refId)?.container as ComponentContainer;
  if (!container) return;
  container.setTitle(newPage.label);
  const state = container.state as GLState;
  Object.assign(state, newPage);
  container.setState(state);
};

const loadGLLayout = async () => {
  GLayout.clear();
  layoutStore.pages.clear();
  layoutStore.IdToRef.clear();
  glItems.value.clear();
  asyncComponents.value.clear();

  const config = await layoutStore.loadLayout();
  if (!config) return;
  await nextTick(); // wait 1 tick for vue to add the dom
  await GLayout.loadLayout(config);
};

const saveGLLayout = async () => {
  await nextTick();
  const config = GLayout.saveLayout();
  await layoutStore.saveLayout(config);
};

const resize = () => {
  const dom = GLRoot.value;
  let width = dom ? dom.offsetWidth : 0;
  let height = dom ? dom.offsetHeight : 0;
  GLayout.setSize(width, height);
  saveGLLayout();
};

/**
 * Focus window by itemId
 * @param itemId
 */
const focusById = (id: string) => {
  const refId = layoutStore.IdToRef.get(id);
  if (!refId) return;
  const container = glItems.value.get(refId)?.container;
  if (container) container.focus();
};

const translateSpecialPageTitles = async () => {
  for (const page of layoutStore.pages.values()) {
    if (["library", "help", "settings"].includes(page.id)) {
      page.label = t(page.id);
      layoutStore.renamePage(page.id, page);
      await nextTick();
    }
  }
};

/*******************
 * Mount
 *******************/
onMounted(async () => {
  window.addEventListener("resize", resize, { passive: true });

  const handleBeforeVirtualRectingEvent = (count: number) => {
    GlBoundingClientRect = (
      GLRoot.value as HTMLElement
    ).getBoundingClientRect();
  };

  const handleContainerVirtualRectingRequiredEvent = (
    container: ComponentContainer,
    width: number,
    height: number
  ) => {
    const refId = (container.state as GLState).refId as string;
    const glItem = glItems.value.get(refId);
    if (!glItem || !glItem?.glc) {
      throw new Error(
        "handleContainerVirtualRectingRequiredEvent: Component not found"
      );
    }

    const containerBoundingClientRect =
      container.element.getBoundingClientRect();
    const left = containerBoundingClientRect.left - GlBoundingClientRect.left;
    const top = containerBoundingClientRect.top - GlBoundingClientRect.top;
    glItem.glc.setPosAndSize(left, top, width, height);
  };

  const handleContainerVirtualVisibilityChangeRequiredEvent = (
    container: ComponentContainer,
    visible: boolean
  ) => {
    const refId = (container.state as GLState).refId as string;
    const glItem = glItems.value.get(refId);
    if (!glItem || !glItem?.glc) {
      throw new Error(
        "handleContainerVirtualVisibilityChangeRequiredEvent: Component not found"
      );
    }
    glItem.glc.setVisibility(visible);
  };

  const handleContainerVirtualZIndexChangeRequiredEvent = (
    container: ComponentContainer,
    logicalZIndex: LogicalZIndex,
    defaultZIndex: string
  ) => {
    const refId = (container.state as GLState).refId as string;
    const glItem = glItems.value.get(refId);
    if (!glItem || !glItem?.glc) {
      throw new Error(
        "handleContainerVirtualZIndexChangeRequiredEvent: Component not found"
      );
    }

    glItem.glc.setZIndex(defaultZIndex);
  };

  const bindComponentEventListener = (
    container: ComponentContainer,
    itemConfig: ResolvedComponentItemConfig
  ) => {
    let refId = "";
    if (itemConfig && itemConfig.componentState) {
      refId = (itemConfig.componentState as GLState).refId as string;
    } else {
      throw new Error(
        "bindComponentEventListener: component's ref id is required"
      );
    }

    const component = instance?.refs[`glc_${refId}`];

    glItems.value.set(refId, {
      container: container,
      glc: (component as any)[0],
    });

    container.virtualRectingRequiredEvent = (container, width, height) =>
      handleContainerVirtualRectingRequiredEvent(container, width, height);

    container.virtualVisibilityChangeRequiredEvent = (container, visible) =>
      handleContainerVirtualVisibilityChangeRequiredEvent(container, visible);

    container.virtualZIndexChangeRequiredEvent = (
      container,
      logicalZIndex,
      defaultZIndex
    ) =>
      handleContainerVirtualZIndexChangeRequiredEvent(
        container,
        logicalZIndex,
        defaultZIndex
      );

    return {
      component,
      virtual: true,
    };
  };

  const unbindComponentEventListener = (container: ComponentContainer) => {
    const refId = (container.state as GLState).refId as string;
    const removeId = layoutStore.pages.get(refId)!.id;
    const glItem = glItems.value.get(refId);
    if (!glItem || !glItem?.glc) {
      throw new Error("handleUnbindComponentEvent: Component not found");
    }

    layoutStore.pages.delete(refId);
    layoutStore.IdToRef.delete(removeId);
    glItems.value.delete(refId);
    layoutStore.IdToRef.delete(removeId);

    saveGLLayout();
  };

  if (!GLRoot.value) return;
  GLayout = new VirtualLayout(
    GLRoot.value,
    bindComponentEventListener,
    unbindComponentEventListener
  );

  GLayout.beforeVirtualRectingEvent = handleBeforeVirtualRectingEvent;

  GLayout.on("focus", (e) => {
    let target = e.target as ComponentItem | RowOrColumn | Stack;
    if (!target.isComponent) return;
    const state = (target as ComponentItem).container.state as GLState;
    layoutStore.currentItemId = state.id;
    saveGLLayout();
  });

  GLayout.on("activeContentItemChanged", (e) => {
    const state = e.container.state as GLState;
    layoutStore.currentItemId = state.id;
    nextTick(() => {
      // wait until layout is updated
      // this is needed for closing component
      saveGLLayout();
    });
  });

  // when loading layout, the components are added by GLayout.loadLayout
  // if initialized is not false, GLayout.addComponent will take control and is not we want
  layoutStore.initialized = false;
  await loadGLLayout();
  translateSpecialPageTitles();
  focusById(stateStore.currentItemId);
  layoutStore.initialized = true;
});

/*************
 * Expose
 *************/
defineExpose({ resize });
</script>
