import { filterVacancies } from "./helpers/helpers.js";
import { TemplateService } from "./services/templateService.js";

// MOCK DATA
const mockData = [
  { ESPECIALIDAD: "PROFESOR DE INFORMATICA EDUCATIVA", VACANTE: "123" },
  { ESPECIALIDAD: "TECNICO EN SEGURIDAD COMUNITARIA", VACANTE: "456" },
  { ESPECIALIDAD: "INGENIERO DE SOFTWARE", VACANTE: "789" },
  { ESPECIALIDAD: "REPARACION DE DISPOSITIVOS MOVILES", VACANTE: "012" },
  { ESPECIALIDAD: "COCINERO", VACANTE: "345" }, // Should match nothing
];

async function testGrouping() {
  console.log("🧪 Testing Keyword Grouping Logic...");

  const templates = new TemplateService().templates;
  console.log("📋 Templates found:", Object.keys(templates));

  for (const [tplName, tplConfig] of Object.entries(templates)) {
    const tplKeywords = tplConfig.keywords || [];
    console.log(
      `\n🔍 Checking template: ${tplName} (Keywords: ${tplKeywords.join(", ")})`,
    );

    const filteredData = filterVacancies(mockData, tplKeywords);

    if (filteredData.length > 0) {
      console.log(`✅ MATCH: Found ${filteredData.length} items.`);
      filteredData.forEach((item) => console.log(`   - ${item.ESPECIALIDAD}`));
    } else {
      console.log(`❌ NO MATCH: No items found for this template.`);
    }
  }
}

testGrouping();
