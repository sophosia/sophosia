import IdentifierDialog from "./IdentifierDialog.vue";
import { identifierDialog } from "./dialogController";

describe("<IdentifierDialog />", () => {
  beforeEach(() => {
    cy.mount(IdentifierDialog);
    identifierDialog.show();
    identifierDialog.onConfirm(
      cy
        .stub()
        .as("onConfirmCallback")
        .callsFake(() => identifierDialog.identifier)
    );
  });
  it("renders", () => {
    cy.dataCy("btn-confirm").should("be.disabled");
  });

  it("cancel", () => {
    cy.dataCy("btn-cancel").click().should("not.exist");
  });

  it("confirm", () => {
    const identifier = "test-identifier";
    cy.dataCy("identifier-input").type(identifier);
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback")
      .should("be.called")
      .should("returned", identifier);
  });
});
