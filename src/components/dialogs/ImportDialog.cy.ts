import ImportDialog from "./ImportDialog.vue";
import { importDialog } from "./dialogController";

describe("<ImportDialog />", () => {
  beforeEach(() => {
    cy.mount(ImportDialog);
    importDialog.show();
    importDialog.onConfirm(
      cy
        .stub()
        .as("onConfirmCallback")
        .callsFake(() => importDialog.isCreateFolder)
    );
  });

  it("cancel", () => {
    cy.dataCy("btn-cancel").click().should("not.exist");
  });

  it("confirm createFolder=true", () => {
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback").should("be.called").should("returned", true);
  });

  it("confirm createFolder=false", () => {
    cy.get(".q-checkbox").click();
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback").should("be.called").should("returned", false);
  });
});
