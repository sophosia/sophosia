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
        v-for="[refId, component] in AllComponents"
        :key="refId"
        :ref="`glc_${refId}`"
        :id="`glc_${refId}`"
        @click="onClick(refId)"
      >
        <component
          v-if="initialized && !!component.visible"
          :is="component.asyncComponent"
          :itemId="component.id"
          :visible="!!component.visible"
          :data="component.data"
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
const emit = defineEmits(["update:currentItemId", "layoutchanged"]);

/*******************
 * Data
 *******************/
const GLRoot = ref<null | HTMLElement>(null);
let GLayout: VirtualLayout;

const AllComponents = ref(
  new Map<
    number,
    {
      asyncComponent: any;
      id: string;
      visible?: boolean;
      data?: { path?: string; focusAnnotId?: string };
      container?: any;
      glc?: any;
    }
  >()
);
const IdToRef = {} as { [id: string]: number };
const UnusedIndexes: number[] = [];
let CurIndex = 0;
let GlBoundingClientRect: DOMRect;
const asyncComponents = ref(new Map<string, any>()); // <itemId, asyncComponent> pair
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
  if (!asyncComponents.value.has(componentType)) {
    asyncComponents.value.set(
      componentType,
      markRaw(
        defineAsyncComponent(() => import(`../pages/${componentType}.vue`))
      )
    );
  }
  const asyncComponent = asyncComponents.value.get(componentType);
  AllComponents.value.set(index, { asyncComponent, id, data });

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
    const component = AllComponents.value.get(IdToRef[id]);
    if (component && data) component.data = data;
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

const onClick = (refId: number) => {
  AllComponents.value.get(refId)?.container.focus();
};

/**
 * Focus window by itemId
 * @param itemId
 */
const focusById = (id: string) => {
  AllComponents.value.get(IdToRef[id])?.container.focus();
};

const removeGLComponent = (removeId: string) => {
  const glComponent = AllComponents.value.get(IdToRef[removeId]);
  if (glComponent) {
    glComponent.visible = false;
    if (removeId.endsWith(".excalidraw"))
      setTimeout(() => {
        // slowly close the excalidraw page, otherwise the page sticks there and crashes the app
        glComponent.container.close();
      }, 50);
    else
      nextTick(() => {
        glComponent.container.close();
      });
  }
};

const updateGLComponent = (
  oldItemId: string,
  state: { id: string; label: string }
) => {
  if (!(oldItemId in IdToRef)) return;
  const refId = IdToRef[oldItemId];

  // update id so that the page receive new itemId
  const glComponent = AllComponents.value.get(refId);
  if (!!glComponent) glComponent.id = state.id;

  // set the window title to new title
  const container = AllComponents.value.get(refId)?.container;
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
    const component = AllComponents.value.get(refId);
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
    const component = AllComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error(
        "handleContainerVirtualVisibilityChangeRequiredEvent: Component not found"
      );
    }
    component.visible = visible;
    component.glc.setVisibility(visible);
  };

  const handleContainerVirtualZIndexChangeRequiredEvent = (
    container: ComponentContainer,
    logicalZIndex: LogicalZIndex,
    defaultZIndex: string
  ) => {
    let refId = (container.state as Json).refId as number;
    const component = AllComponents.value.get(refId);
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

    const component = instance?.refs[`glc_${refId}`];

    const glComponent = AllComponents.value.get(refId) as any;
    Object.assign(glComponent, {
      container: container,
      glc: (component as any)[0],
    });
    AllComponents.value.set(refId, glComponent);

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
    const component = AllComponents.value.get(refId);
    if (!component || !component?.glc) {
      throw new Error("handleUnbindComponentEvent: Component not found");
    }

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
