import ExportDialog from "./ExportDialog.vue";
import { exportDialog } from "./dialogController";

describe("<ExportDialog />", () => {
  beforeEach(() => {
    cy.mount(ExportDialog);
    exportDialog.show();
    exportDialog.onConfirm(
      cy
        .stub()
        .as("onConfirmCallback")
        .callsFake(() => {
          const format = exportDialog.format.value;
          const template = exportDialog.template.value;
          if (exportDialog.format.value !== "bibliography") return { format };
          else return { format, template };
        })
    );
  });

  it("cancel", () => {
    cy.dataCy("btn-cancel").click().should("not.exist");
  });

  it("confirm format!=bibliography", () => {
    const formats = exportDialog.formats.filter(
      (format) => format.value !== "bibliography"
    );
    const randomFormat = formats[Math.floor(Math.random() * formats.length)];
    const formatSelector = cy.dataCy("format-select");
    formatSelector.select(randomFormat.label);
    cy.contains(randomFormat.label).should("exist");
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback")
      .should("be.called")
      .should("returned", { format: randomFormat.value });
  });

  it("confirm format==bibliography", () => {
    const templates = exportDialog.templates;
    const randomTemplate =
      templates[Math.floor(Math.random() * templates.length)];
    cy.dataCy("format-select").select("Bibliography");
    const templateSelector = cy.dataCy("template-select");
    templateSelector.select(randomTemplate.label);
    cy.contains(randomTemplate.label).should("exist");
    cy.dataCy("btn-confirm").click().should("not.exist");
    cy.get("@onConfirmCallback").should("be.called").should("returned", {
      format: "bibliography",
      template: randomTemplate.value,
    });
  });
});
