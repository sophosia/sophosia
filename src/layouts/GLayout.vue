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
        v-for="pair in AllComponents"
        :key="pair[0]"
        :ref="GlcKeyPrefix + pair[0]"
        :id="GlcKeyPrefix + pair[0]"
        @click="onClick(pair[0])"
      >
        <component
          v-if="initialized"
          :is="pair[1].component"
          :itemId="pair[1].id"
          :visible="MapComponents.get(pair[0])?.container?.visible"
          :data="pair[1].data"
        ></component>
      </GLComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  ref,
  toRaw,
  markRaw,
  readonly,
  defineExpose,
  defineAsyncComponent,
  defineProps,
  defineEmits,
  nextTick,
  getCurrentInstance,
  watch,
} from "vue";
import {
  ComponentContainer,
  Json,
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

/*******************
 * Props and Emits
 *******************/
const props = defineProps({
  currentItemId: String,
});
const emit = defineEmits([
  "update:currentItemId",
  "layoutchanged",
  "itemdestroyed",
]);

/*******************
 * Data
 *******************/
const GLRoot = ref<null | HTMLElement>(null);
let GLayout: VirtualLayout;
const GlcKeyPrefix = readonly(ref("glc_"));

const AllComponents = ref(
  new Map<
    number,
    {
      component: any;
      id: string;
      data?: { path: string };
    }
  >()
);
const MapComponents = ref(
  new Map<number, { container: ComponentContainer; glc: any }>()
);
const IdToRef = {} as { [id: string]: number };
const UnusedIndexes: number[] = [];
let CurIndex = 0;
let GlBoundingClientRect: DOMRect;

const components = ref(new Map<string, any>());
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
const addComponent = (
  componentType: string,
  title: string,
  id: string,
  data: any
) => {
  let index = CurIndex;
  if (UnusedIndexes.length > 0) index = UnusedIndexes.pop() as number;
  else CurIndex++;

  // for vite's dynamic import, see the following page
  // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  // when building the app, vite will automatically take care the imports for us

  // unknown async component error occurs if we create multiple async component with the same type at start up
  if (!components.value.has(componentType)) {
    components.value.set(
      componentType,
      markRaw(
        defineAsyncComponent(() => import(`../pages/${componentType}.vue`))
      )
    );
  }
  const component = components.value.get(componentType);
  AllComponents.value.set(index, { component, id, data });

  return index;
};

/**
 *
 * @param componentType - Vue document name
 * @param title - Tab title
 * @param id - projectId or noteId
 */
const addGLComponent = async (
  componentType: string,
  title: string,
  id: string,
  data: any
) => {
  if (componentType.length == 0)
    throw new Error("addGLComponent: Component's type is empty");

  // don't repeatly add components
  if (id in IdToRef) {
    focusById(id);
    return;
  }

  const index = addComponent(componentType, title, id, data);
  await nextTick(); // wait 1 tick for vue to add the dom
  GLayout.addComponent(
    componentType,
    { refId: index, id: id, data: data },
    title
  );
};

const loadGLLayout = async (
  layoutConfig: LayoutConfig | ResolvedLayoutConfig
) => {
  GLayout.clear();
  AllComponents.value.clear();
  MapComponents.value.clear();
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

  let index = 0;
  while (contents.length > 0) {
    const content = contents.shift() as
      | RowOrColumnItemConfig[]
      | StackItemConfig[]
      | ComponentItemConfig[];
    for (let itemConfig of content) {
      if (itemConfig.type == "component") {
        index = addComponent(
          itemConfig.componentType as string,
          itemConfig.title as string,
          (itemConfig.componentState as Json).id as string,
          (itemConfig.componentState as Json).data
        );
        await nextTick();
        await nextTick();
        await nextTick();
        await nextTick();
        await nextTick();
        await nextTick();
        if (typeof itemConfig.componentState == "object")
          (itemConfig.componentState as Json)["refId"] = index;
        else itemConfig.componentState = { refId: index };
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

const onClick = (refId: number) => {
  MapComponents.value.get(refId)?.container.focus();
};

/**
 * Focus window by itemId
 * @param itemId
 */
const focusById = (id: string) => {
  let refId = IdToRef[id];
  MapComponents.value.get(refId)?.container.focus();
};

const removeGLComponent = (removeId: string) => {
  MapComponents.value.get(IdToRef[removeId])?.container.close();
};

const updateGLComponent = (
  oldItemId: string,
  state: { id: string; label: string }
) => {
  if (!(oldItemId in IdToRef)) return;
  const refId = IdToRef[oldItemId];

  // update id so that the page receive new itemId
  const component = AllComponents.value.get(refId);
  if (!!component) component.id = state.id;

  // set the window title to new title
  const container = MapComponents.value.get(refId)?.container;
  if (!!container) {
    container.setTitle(state.label);
    container.setState(Object.assign(container.state as {}, state));
  }
  // update the IdToRef list
  // do not switch the order of these two statements since oldItemId might be the same as state.id
  delete IdToRef[oldItemId];
  IdToRef[state.id] = refId;
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
    let refId = (container.state as Json).refId as number;
    const component = MapComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error(
        "handleContainerVirtualRectingRequiredEvent: Component not found"
      );
    }

    const containerBoundingClientRect =
      container.element.getBoundingClientRect();
    const left = containerBoundingClientRect.left - GlBoundingClientRect.left;
    const top = containerBoundingClientRect.top - GlBoundingClientRect.top;
    component.glc.setPosAndSize(left, top, width, height);
  };

  const handleContainerVirtualVisibilityChangeRequiredEvent = (
    container: ComponentContainer,
    visible: boolean
  ) => {
    let refId = (container.state as Json).refId as number;
    const component = MapComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error(
        "handleContainerVirtualVisibilityChangeRequiredEvent: Component not found"
      );
    }
    component.glc.setVisibility(visible);
  };

  const handleContainerVirtualZIndexChangeRequiredEvent = (
    container: ComponentContainer,
    logicalZIndex: LogicalZIndex,
    defaultZIndex: string
  ) => {
    let refId = (container.state as Json).refId as number;
    const component = MapComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error(
        "handleContainerVirtualZIndexChangeRequiredEvent: Component not found"
      );
    }

    component.glc.setZIndex(defaultZIndex);
  };

  const bindComponentEventListener = (
    container: ComponentContainer,
    itemConfig: ResolvedComponentItemConfig
  ) => {
    let refId = -1;
    if (itemConfig && itemConfig.componentState) {
      refId = (itemConfig.componentState as Json).refId as number;
    } else {
      throw new Error(
        "bindComponentEventListener: component's ref id is required"
      );
    }

    let ref = GlcKeyPrefix.value + refId;
    const component = instance?.refs[ref];

    MapComponents.value.set(refId, {
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
    let state = container.state as Json;
    let refId = state.refId as number;
    let removeId = state.id as string;
    const component = MapComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error("handleUnbindComponentEvent: Component not found");
    }

    MapComponents.value.delete(refId);
    AllComponents.value.delete(refId);
    delete IdToRef[removeId];
    UnusedIndexes.push(refId);

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
    let state = (target as ComponentItem).container.state as {
      refId: string;
      id: string;
      data?: { path: string };
    };
    emit("update:currentItemId", state.id);
    emit("layoutchanged");
  });

  GLayout.on("itemCreated", (e) => {
    let target = e.target as ComponentItem | RowOrColumn | Stack;
    if (!target.isComponent) return;
    let state = (target as ComponentItem).container.state as Json;
    IdToRef[state.id as string] = state.refId as number;
  });

  GLayout.on("activeContentItemChanged", (e) => {
    let state = e.container.state as {
      refId: string;
      id: string;
      data?: { path: string };
    };
    emit("update:currentItemId", state.id);
    nextTick(() => {
      // wait until layout is updated
      // this is needed for closing component
      emit("layoutchanged");
    });
  });

  GLayout.on("itemDestroyed", (e) => {
    let target = e.target as ComponentItem | RowOrColumn | Stack;
    if (!target.isComponent) return;
    let state = (target as ComponentItem).container.state as {
      refId: string;
      id: string;
      data?: { path: string };
    };
    emit("itemdestroyed", state.id);
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
  AllComponents,
});
</script>
