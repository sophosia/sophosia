import ProgressDialog from "./ProgressDialog.vue";
import { progressDialog } from "./dialogController";

describe("<ProgressDialog />", () => {
  beforeEach(() => {
    cy.mount(ProgressDialog);
    progressDialog.show();
  });

  it("renders btn-ok disabled", () => {
    progressDialog.progress = Math.random() * 0.99;
    cy.dataCy("btn-ok").should("be.disabled");
  });

  it("renders btn-ok not disabled", () => {
    progressDialog.progress = 1.0;
    cy.dataCy("btn-ok").should("not.be.disabled");
  });

  it("renders errors", () => {
    progressDialog.errors = [new Error("error 1"), new Error("error 2")];
    for (let i = 0; i < progressDialog.errors.length; i++)
      cy.dataCy(`error-prompt-${i}`).should("exist");
  });
});
