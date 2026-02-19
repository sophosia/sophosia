import { KEY_pdfApp } from "./injectKeys";
import RightMenu from "./RightMenu.vue";

describe("<RightMenu />", () => {
  it("renders", function () {
    const mockPdfApp = {
      outline: [],
      clickTOC: () => {},
      annotStore: {
        annots: [],
        selectedId: "",
        setActive: () => {},
      },
    };

    cy.mount(RightMenu, {
      global: {
        provide: {
          [KEY_pdfApp as symbol]: mockPdfApp,
        },
      },
    });

    cy.dataCy("tab-toc").should("be.visible");
    cy.dataCy("tab-annot-list").should("be.visible");
  });
});
