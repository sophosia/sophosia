import { plugins } from "citation-js";
import { chicagoStyle } from "../../citation_styles/chicago-author-date";
import { ieeeStyle } from "../../citation_styles/ieee-with-url";
import { mlaStyle } from "../../citation_styles/modern-language-association";
import { apaStyle } from "../../citation_styles/apa";

function addCSLTemplate(templateName: string, template: string) {
  let config = plugins.config.get("@csl");
  config.templates.add(templateName, template);
}

addCSLTemplate("Chicago 17th", chicagoStyle);
addCSLTemplate("IEEE", ieeeStyle);
addCSLTemplate("MLA 9th", mlaStyle);
addCSLTemplate("APA 7th", apaStyle);
