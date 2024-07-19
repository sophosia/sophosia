import { Project } from "src/backend/database";
import DeleteDialog from "./DeleteDialog.vue";
import { deleteDialog } from "./dialogController";
const projects = [
  { title: "title1" },
  { title: "title2" },
  { title: "title3" },
] as Project[];
function mount(isDeleteFromDB: boolean) {
  cy.mount(DeleteDialog);
  deleteDialog.deleteProjects = projects;
  deleteDialog.isDeleteFromDB = isDeleteFromDB;
  deleteDialog.onConfirm(cy.stub().as("onConfirmCallback"));
  deleteDialog.show();
}

describe("<DeleteDialog />", () => {
  beforeEach(() => {});
  it("renders with deleteFromDB=true", () => {
    mount(true);
    for (const project of projects) cy.contains(project.title).should("exist");
    cy.contains("* This operation is not reversible").should("exist");
    cy.contains("* Notes in this project will be deleted").should("exist");
  });

  it("renders with deleteFromDB=false", () => {
    mount(false);
    for (const project of projects) cy.contains(project.title).should("exist");
    cy.contains("* This operation is not reversible").should("not.exist");
    cy.contains("* Notes in this project will be deleted").should("not.exist");
  });

  it("cancel", () => {
    mount(true);
    cy.dataCy("btn-cancel").click().should("not.exist");
  });

  it("confirm", () => {
    mount(true);
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback").should("be.called");
  });
});
