import { Note } from "src/backend/database";
import TableItemRow from "./TableItemRow.vue";

describe("<TableItemRow />", () => {
  it("render label (linux)", () => {
    let item = {
      _id: "testId",
      dataType: "note",
      path: "/home/user/sophosia/label.pdf",
    } as Note;
    cy.mount(TableItemRow, { props: { item } });
    // TODO: tauri's basename() cannot be used in cypress
    // cy.dataCy("content").should("contain.text", "label.pdf");
    cy.dataCy("content").rightclick();
    cy.dataCy("menu").should("exist");
  });

  it("render label (windows)", () => {
    let item = {
      _id: "testId",
      dataType: "note",
      path: "C:\\user\\sophosia\\label.pdf",
    } as Note;
    cy.mount(TableItemRow, { props: { item } });
    cy.dataCy("content").rightclick();
    cy.dataCy("menu").should("exist");
  });

  it("open note", () => {
    let item = {
      _id: "testId",
      label: "test node",
      dataType: "note",
    } as Note;
    cy.mount(TableItemRow, { props: { item } });
    cy.dataCy("content").rightclick();
    cy.dataCy("btn-open-item").click();
  });
});
