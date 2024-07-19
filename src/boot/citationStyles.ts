import { plugins } from "citation-js";
import { chicagoStyle } from "../../citation_styles/chicago-author-date";
import { ieeeStyle } from "../../citation_styles/ieee-with-url";
import { mlaStyle } from "../../citation_styles/modern-language-association";
import { apaStyle } from "../../citation_styles/apa";

/**
 * Adds a new CSL (Citation Style Language) template to the configuration.
 *
 * @param {string} templateName - The name to assign to the new template.
 * @param {string} template - The CSL template string.
 *
 * Retrieves the CSL plugin configuration and adds the specified template under the provided name.
 */
function addCSLTemplate(templateName: string, template: string) {
  let config = plugins.config.get("@csl");
  config.templates.add(templateName, template);
}

addCSLTemplate("Chicago 17th", chicagoStyle);
addCSLTemplate("IEEE", ieeeStyle);
addCSLTemplate("MLA 9th", mlaStyle);
addCSLTemplate("APA 7th", apaStyle);
