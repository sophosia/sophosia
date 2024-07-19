import WelcomeCarousel from "./WelcomeCarousel.vue";

describe("<WelcomeCarousel />", () => {
  beforeEach(() => {
    cy.mount(WelcomeCarousel, { props: { modelValue: true } }).as("vue");
  });
  it("renders", () => {
    cy.dataCy("title").should("contain.text", "Research Helper");
  });

  it("chinese", () => {
    cy.dataCy("language-select").select("中文 (zh_CN)");
    cy.dataCy("title").should("contain.text", "研究小助手");
  });
});
