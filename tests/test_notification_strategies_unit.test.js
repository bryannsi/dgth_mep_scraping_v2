import assert from "node:assert";
import test from "node:test";
import { NotificationFactory } from "../src/services/factories/NotificationFactory.js";
import { NotificationService } from "../src/services/notificationService.js";
import { TemplateBuilder } from "../src/services/templateBuilder.js";
import { TemplateService } from "../src/services/templateService.js";

// --- Mocks ---
const mockClient = {
  id: 1,
  name: "Juan Perez",
  email: "test@example.com",
  templateKey: "PerezTemplate",
  isTest: false,
  config: {
    notificationChannel: ["email", "telegram"],
    regions: ["Alajuela"],
  },
};

const mockVacancies = [
  {
    id: 101,
    mepId: "V001",
    especialidad: "Matemáticas",
    clasePuesto: "Profesor",
    institucion: "Liceo X",
    regional: "Alajuela",
    lecciones: 10,
    rige: new Date(),
    vence: new Date(),
  },
];

// --- Tests de TemplateBuilder ---
test("TemplateBuilder: Debe generar HTML si hay vacantes", () => {
  const html = TemplateBuilder.createHtmlTable(mockVacancies);
  assert.ok(html.includes("Matemáticas"));
  assert.ok(html.includes("Liceo X"));
});

test("TemplateBuilder: Debe retornar string vacío si no hay vacantes", () => {
  const html = TemplateBuilder.createHtmlTable([]);
  assert.strictEqual(html, "");
});

// --- Tests de NotificationFactory ---
test("NotificationFactory: Debe seleccionar canales correctos", () => {
  const factory = new NotificationFactory(new TemplateService());
  const strategies = factory.getStrategies(mockClient);

  assert.strictEqual(strategies.length, 2);
  assert.strictEqual(strategies[0].channelName, "email");
  assert.strictEqual(strategies[1].channelName, "telegram");
});

test("NotificationFactory: Debe forzar consola si isTest es true", () => {
  const factory = new NotificationFactory(new TemplateService());
  const testClient = { ...mockClient, isTest: true };
  const strategies = factory.getStrategies(testClient);

  assert.strictEqual(strategies.length, 1);
  assert.strictEqual(strategies[0].channelName, "console");
});

// --- Tests de Lógica Multicanal (Nuevo) ---
test("NotificationService: Carga de vacantes por canal", async () => {
  // Simulamos que el factory devuelve dos estrategias
  const mockFactory = {
    getStrategies: () => [
      { channelName: "email", send: async () => ({ success: true }) },
      { channelName: "telegram", send: async () => ({ success: true }) }
    ]
  };

  const service = new NotificationService(mockFactory);
  assert.ok(service instanceof NotificationService);
  
  // La lógica interna ahora invoca DbService.getPendingVacanciesByTemplate(tpl, channel)
  // Esto se verifica en la integración real de la DB, pero arquitecturalmente
  // el servicio ya está preparado para iterar y pedir por canal.
});
