import ErrorDialog from "./ErrorDialog.vue";
import { errorDialog } from "./dialogController";

const error = new Error("test error");

describe("<ErrorDialog />", () => {
  beforeEach(() => {
    cy.mount(ErrorDialog);
    errorDialog.error = error;
    errorDialog.show();
  });

  it("renders", () => {
    cy.dataCy("error-msg").should("have.text", error.message);
  });

  it("close", () => {
    cy.dataCy("btn-ok").click();
    cy.contains(error.message).should("not.exist");
  });
});
