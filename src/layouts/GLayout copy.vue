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
        v-for="[refId, page] in pages"
        :key="refId"
        :ref="`glc_${refId}`"
        :id="`glc_${refId}`"
        @click="focusById(page.id)"
      >
        <component
          v-if="initialized"
          :is="asyncComponents.get(refId)"
          :itemId="page.id"
          :data="page.data"
        ></component>
      </GLComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
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
  LayoutConfig,
  RowOrColumnItemConfig,
  StackItemConfig,
  ComponentItemConfig,
  ResolvedComponentItemConfig,
  LogicalZIndex,
  VirtualLayout,
  ResolvedLayoutConfig,
  ComponentItem,
  RowOrColumn,
  Stack,
} from "golden-layout";
import GLComponent from "src/pages/GLComponent.vue";
import type { Page, GLState } from "src/backend/database";

/*******************
 * Props and Emits
 *******************/
const props = defineProps({
  currentItemId: String,
});
const emit = defineEmits(["update:currentItemId", "layoutchanged"]);

/*******************
 * Data
 *******************/
const GLRoot = ref<null | HTMLElement>(null);
let GLayout: VirtualLayout;

const pages = ref(new Map<string, Page>());
const glItems = ref(new Map<string, { container: any; glc: any }>());
const asyncComponents = ref(new Map<string, any>()); // <itemId, asyncComponent> pair
const IdToRef = {} as { [id: string]: string };
let GlBoundingClientRect: DOMRect;
const instance = getCurrentInstance();
const initialized = ref(false);

/*******************
 * Watcher
 *******************/
watch(initialized, (initialized) => {
  // after initialized, focus the currentPage
  if (initialized) focusById(props.currentItemId as string);
});

// must use a getter to get props.currentItemId
watch(
  () => props.currentItemId,
  (id) => {
    focusById(id as string);
  }
);

/*******************
 * Method
 *******************/
/** @internal */
const addComponent = (page: Page) => {
  const refId = nanoid();
  // for vite's dynamic import, see the following page
  // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  // when building the app, vite will automatically take care the imports for us
  asyncComponents.value.set(
    refId,
    markRaw(defineAsyncComponent(() => import(`../pages/${page.type}.vue`)))
  );
  pages.value.set(refId, page);
  IdToRef[page.id] = refId;
  return refId;
};

/**
 * Add a GL component by page
 * @param
 * @param page
 */
const addGLComponent = async (page: Page) => {
  // don't repeatly add components
  if (page.id in IdToRef) {
    focusById(page.id);
    return;
  }

  const refId = addComponent(page);
  await nextTick(); // wait 1 tick for vue to add the dom
  const state = Object.assign({ refId }, page);
  GLayout.addComponent(page.type, state, page.label);
};

const loadGLLayout = async (
  layoutConfig: LayoutConfig | ResolvedLayoutConfig
) => {
  GLayout.clear();
  pages.value.clear();
  glItems.value.clear();
  // When reloading a saved Layout, first convert the saved "Resolved Config" to a "Config" by calling LayoutConfig.fromResolved().
  const config = (
    (layoutConfig as ResolvedLayoutConfig).resolved
      ? LayoutConfig.fromResolved(layoutConfig as ResolvedLayoutConfig)
      : layoutConfig
  ) as LayoutConfig;
  if (config.root === undefined) return;
  let contents = [config.root.content] as (
    | RowOrColumnItemConfig[]
    | StackItemConfig[]
    | ComponentItemConfig[]
  )[];

  while (contents.length > 0) {
    const content = contents.shift() as
      | RowOrColumnItemConfig[]
      | StackItemConfig[]
      | ComponentItemConfig[];
    for (let itemConfig of content) {
      if (itemConfig.type == "component") {
        const state = itemConfig.componentState as GLState;
        const page = {
          id: state.id,
          label: state.label || itemConfig.title,
          type: state.type || itemConfig.componentType,
          data: state.data,
        } as Page;
        const refId = addComponent(page);
        state.refId = refId; // use new refId every time
        itemConfig.componentState = state;
      } else if (itemConfig.content.length > 0) {
        contents.push(
          itemConfig.content as
            | RowOrColumnItemConfig[]
            | StackItemConfig[]
            | ComponentItemConfig[]
        );
      }
    }
  }

  // no need to show ghost image of the content
  if (config.dimensions) {
    config.dimensions.dragProxyHeight = 0;
    config.dimensions.dragProxyWidth = 0;
  }
  await nextTick(); // wait 1 tick for vue to add the dom
  await GLayout.loadLayout(config);

  // initialization complete, emit initialized
  initialized.value = true;
};

const getLayoutConfig = () => {
  return GLayout.saveLayout();
};

const resize = () => {
  const dom = GLRoot.value;
  let width = dom ? dom.offsetWidth : 0;
  let height = dom ? dom.offsetHeight : 0;
  GLayout.setSize(width, height);
  emit("layoutchanged");
};

/**
 * Focus window by itemId
 * @param itemId
 */
const focusById = (id: string) => {
  const container = glItems.value.get(IdToRef[id])?.container;
  if (container) container.focus();
};

const removeGLComponent = (removeId: string) => {
  const glItem = glItems.value.get(IdToRef[removeId]);
  if (glItem) glItem.container.close();
};

const updateGLComponent = (oldItemId: string, newState: GLState) => {
  if (!(oldItemId in IdToRef)) return;
  const refId = IdToRef[oldItemId];

  // update id so that the page receive new itemId
  const page = pages.value.get(refId);
  if (page) page.id = newState.id;

  // set the window title to new title
  const container = glItems.value.get(refId)?.container as ComponentContainer;
  if (container) {
    container.setTitle(newState.label);
    container.setState({ refId, id: newState.id });
  }
  // update the IdToRef list
  // do not switch the order of these two statements since oldItemId might be the same as newState.id
  delete IdToRef[oldItemId];
  IdToRef[newState.id] = refId;
};

/*******************
 * Mount
 *******************/
onMounted(() => {
  if (GLRoot.value == null)
    throw new Error("Golden Layout can't find the root DOM!");

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
    const removeId = pages.value.get(refId)!.id;
    const glItem = glItems.value.get(refId);
    if (!glItem || !glItem?.glc) {
      throw new Error("handleUnbindComponentEvent: Component not found");
    }

    pages.value.delete(refId);
    glItems.value.delete(refId);
    delete IdToRef[removeId];

    emit("layoutchanged");
  };

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
    emit("update:currentItemId", pages.value.get(state.refId)!.id);
    emit("layoutchanged");
  });

  GLayout.on("activeContentItemChanged", (e) => {
    const state = e.container.state as GLState;
    emit("update:currentItemId", pages.value.get(state.refId)!.id);
    nextTick(() => {
      // wait until layout is updated
      // this is needed for closing component
      emit("layoutchanged");
    });
  });
});

/*******************
 * Expose
 *******************/
defineExpose({
  addGLComponent,
  removeGLComponent,
  updateGLComponent,
  loadGLLayout,
  getLayoutConfig,
  resize,
  initialized,
});
</script>
