import { QSplitter } from "quasar";
import { PageType, type Layout } from "src/backend/database/models";
import {
  VNode,
  defineAsyncComponent,
  h,
  markRaw,
  type SetupContext,
} from "vue";
import Stack from "./Stack.vue";

const asyncPages = new Map<string, any>();
for (const pageType of Object.values(PageType)) {
  asyncPages.set(
    pageType,
    markRaw(
      defineAsyncComponent(() => {
        const page = `../../pages/${pageType}.vue`;
        return import(page);
      })
    )
  );
}

type FComponentProps = { layout: Layout };
type Events = {
  "onUpdate:layout"(newLayout: Layout): void;
};
export default function Layout(
  props: FComponentProps,
  context: SetupContext<Events>
): VNode {
  const node = props.layout;

  if (node.type === "stack") {
    return h(Stack, {
      stack: node,
      asyncPages: asyncPages,
    });
  } else if (node.type === "row" || node.type === "col") {
    return h(
      QSplitter,
      {
        style: "height: 100%",
        modelValue: node.split,
        "onUpdate:modelValue": (value: number) => {
          node.split = value;
          context.emit("onUpdate:layout", node);
        },
        horizontal: node.type === "col",
      },
      {
        before: () => Layout({ layout: node.children[0] }, context),
        after: () => Layout({ layout: node.children[1] }, context),
      }
    );
  } else {
    // code will not reach here since recursion stops at the stack level
    // return a vnode to match the return type
    return h("div");
  }
}
