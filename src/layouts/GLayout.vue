<template>
  <div style="position: relative">
    <div
      ref="GLRoot"
      style="position: absolute; width: 100%; height: 100%"
    >
      <!-- Root dom for Golden-Layout manager -->
    </div>

    <div style="position: absolute; width: 100%; height: 100">
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
          :visible="!!glItems.get(refId)?.visible"
          :itemId="page.id"
          :data="page.data"
        ></component>
      </GLComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ComponentContainer,
  ComponentItem,
  LogicalZIndex,
  ResolvedComponentItemConfig,
  RowOrColumn,
  Stack,
  VirtualLayout,
} from "golden-layout";
import { type GLState, type Page } from "src/backend/database";
import GLComponent from "src/pages/GLComponent.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { useStateStore } from "src/stores/stateStore";
import {
  defineAsyncComponent,
  getCurrentInstance,
  markRaw,
  nextTick,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n({ useScope: "global" });

/*******************
 * Data
 *******************/
const GLRoot = ref<null | HTMLElement>(null);
let GLayout: VirtualLayout;

const glItems = ref(
  new Map<string, { container: any; glc: any; visible?: boolean }>()
); // <refId, ...> pair
const asyncComponents = ref(new Map<string, any>()); // <itemId, asyncComponent> pair
const instance = getCurrentInstance();

const stateStore = useStateStore();
const layoutStore = useLayoutStore();

/*******************
 * Watcher
 *******************/

watch(
  () => layoutStore.currentItemId,
  (id) => {
    console.log("focus on id", id);
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
  () => [layoutStore.showLeftMenu, layoutStore.leftMenuSize],
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
 * Adds a Golden Layout (GL) component to the layout based on a given page.
 * Dynamically defines an asynchronous component based on the page type.
 * If the layout is initialized, the component is added immediately, otherwise, it is prepared for later addition.
 * @param page - The page object containing the information for the component to be added.
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

/**
 * Removes a Golden Layout (GL) component from the layout using the specified item ID.
 * Clears the associated references and closes the container of the GL component.
 * @param itemId - The ID of the item (page) to be removed.
 */
const removeGLComponent = (removeId: string) => {
  layoutStore.closedItemId = "";
  const refId = layoutStore.IdToRef.get(removeId);
  if (!refId) return;
  const glItem = glItems.value.get(refId);
  if (glItem) glItem.container.close();
  console.log("removeGLComponent");
};

/**
 * Updates a Golden Layout (GL) component with new page information.
 * Changes the window title of the GL component and updates its state.
 * @param newPage - The new page object containing updated information.
 */
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

/**
 * Loads the Golden Layout (GL) configuration and initializes the layout.
 * Clears the current layout, pages, and components before loading the new configuration.
 */
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

/**
 * Saves the current state of the Golden Layout (GL) configuration.
 * Persists the layout configuration for later retrieval and usage.
 */
const saveGLLayout = async () => {
  await nextTick();
  const config = GLayout.saveLayout();
  await layoutStore.saveLayout(config);
};

/**
 * Adjusts the size of the Golden Layout (GL) to fit the container.
 * Invokes the layout's `setSize` method and saves the new layout configuration.
 */
const resize = () => {
  const dom = GLRoot.value;
  let width = dom ? dom.offsetWidth : 0;
  let height = dom ? dom.offsetHeight : 0;
  GLayout.setSize(width, height);
  saveGLLayout();
};

/**
 * Focuses on a specific Golden Layout (GL) component identified by the item ID.
 * Brings the specified component into view and focuses on it.
 * @param id - The ID of the item to be focused.
 */
const focusById = (id: string) => {
  const refId = layoutStore.IdToRef.get(id);
  if (!refId) return;
  const container = glItems.value.get(refId)?.container;
  if (container) container.focus();
};

/**
 * Translates the titles of special pages (like 'library', 'help', 'settings') based on the current locale.
 * Updates the layout store with the translated titles.
 */
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

  let GlBoundingClientRect: DOMRect;
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
    glItem.visible = visible;
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

  // when loading layout, the components are supposed to be added by GLayout.loadLayout
  // if initialized is not false, GLayout.addComponent will take control and is not we want
  layoutStore.initialized = false;
  await loadGLLayout();
  translateSpecialPageTitles();
  focusById(layoutStore.currentItemId);
  layoutStore.initialized = true;
});

/*************
 * Expose
 *************/
defineExpose({ resize });
</script>
