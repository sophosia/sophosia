import { db } from "src/backend/database";
import WorkspacePage from "./WorkspacePage.vue";

describe("<WorkspacePage />", () => {
  beforeEach(() => {
    // Set config directly on the reactive object (db.setConfig is async and needs Tauri IPC)
    db.config.storagePath = "/home/user/Documents/research";
    db.config.storagePaths = [
      "/home/user/Documents/research",
      "/home/user/Documents/papers",
    ];
  });

  it("renders nothing when not visible", () => {
    cy.mount(WorkspacePage, {
      props: { visible: false, itemId: "workspace" },
    });
    cy.dataCy("workspace-title").should("not.exist");
  });

  it("renders title when visible", () => {
    cy.mount(WorkspacePage, {
      props: { visible: true, itemId: "workspace" },
    });
    cy.dataCy("workspace-title").should("contain.text", "Workspace");
  });

  it("renders workspace items from db config", () => {
    cy.mount(WorkspacePage, {
      props: { visible: true, itemId: "workspace" },
    });
    cy.dataCy("workspace-item").should("have.length", 2);
  });

  it("highlights the active workspace", () => {
    cy.mount(WorkspacePage, {
      props: { visible: true, itemId: "workspace" },
    });
    cy.dataCy("workspace-item")
      .first()
      .should("have.class", "workspace-item-active");
    cy.dataCy("workspace-item")
      .last()
      .should("not.have.class", "workspace-item-active");
  });

  it("renders add workspace button", () => {
    cy.mount(WorkspacePage, {
      props: { visible: true, itemId: "workspace" },
    });
    cy.dataCy("workspace-add-btn").should("contain.text", "Add Workspace");
  });

  it("renders empty list when no workspaces configured", () => {
    db.config.storagePath = "";
    db.config.storagePaths = [];
    cy.mount(WorkspacePage, {
      props: { visible: true, itemId: "workspace" },
    });
    cy.dataCy("workspace-item").should("not.exist");
    cy.dataCy("workspace-add-btn").should("exist");
  });
});
