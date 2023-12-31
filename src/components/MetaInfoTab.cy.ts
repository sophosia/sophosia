import MetaInfoTab from "./MetaInfoTab.vue";

describe("<MetaInfoTab />", () => {
  beforeEach(() => {
    let project = {
      title: "test title",
      reference: [],
      author: [{ family: "Feng", given: "Hunt" }],
    };

    cy.mount(MetaInfoTab, {
      props: {
        project,
      },
    });
  });
  it("renders", () => {
    cy.dataCy("title").should("have.value", "test title");

    cy.get('[data-cy="q-chip-0"] > .q-chip__content').should(
      "have.text",
      "Hunt Feng"
    );
  });

  it("input author", () => {
    let input = cy.get('[data-cy="author-input"]');
    input.type("family, given{enter}");
    cy.get('[data-cy="q-chip-1"] > .q-chip__content').should(
      "have.text",
      "given family"
    );

    input.type("given1 family1{enter}");
    cy.get('[data-cy="q-chip-2"] > .q-chip__content').should(
      "have.text",
      "given1 family1"
    );
  });
});
