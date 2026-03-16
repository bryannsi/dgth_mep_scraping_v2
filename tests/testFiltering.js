import { filterVacancies } from "../src/helpers/helpers.js";

const mockVacancies = [
  {
    vacante: "123",
    especialidad: "MATEMATICA",
    regional: "SAN JOSE OESTE",
    clasePuesto: "GENERAL BASICA 1 (I Y II CICLOS)",
  },
  {
    vacante: "456",
    especialidad: "ESPAÑOL",
    regional: "ALAJUELA",
    clasePuesto: "PROFESOR DE ENSEÑANZA MEDIA",
  },
  {
    vacante: "789",
    especialidad: "CIENCIAS",
    regional: "HEREDIA",
    clasePuesto: "PROFESOR DE ENSEÑANZA TECNICA",
  },
];

console.log("--- Testing clasePuesto Filter ---");

// Test 1: Full match
const test1 = filterVacancies(mockVacancies, [], [], ["GENERAL BASICA 1 (I Y II CICLOS)"]);
console.log(`Test 1 (Exact match): ${test1.length === 1 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test1.length})`);

// Test 2: Partial match (case insensitive already handled by normalizeValue)
const test2 = filterVacancies(mockVacancies, [], [], ["general basica 1"]);
console.log(`Test 2 (Partial/Case match): ${test2.length === 1 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test2.length})`);

// Test 3: No matches
const test3 = filterVacancies(mockVacancies, [], [], ["NON_EXISTENT"]);
console.log(`Test 3 (No matches): ${test3.length === 0 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test3.length})`);

// Test 4: Multiple classes
const test4 = filterVacancies(mockVacancies, [], [], ["GENERAL BASICA 1", "PROFESOR DE ENSEÑANZA MEDIA"]);
console.log(`Test 4 (Multiple classes): ${test4.length === 2 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test4.length})`);

// Test 5: All vacant (empty config)
const test5 = filterVacancies(mockVacancies, [], [], []);
console.log(`Test 5 (Empty config - all matches): ${test5.length === 3 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test5.length})`);

// Test 6: Combined filters
const test6 = filterVacancies(mockVacancies, ["MATEMATICA"], ["SAN JOSE OESTE"], ["GENERAL BASICA 1"]);
console.log(`Test 6 (Combined filters): ${test6.length === 1 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test6.length})`);

// Test 7: Combined filters (negative)
const test7 = filterVacancies(mockVacancies, ["MATEMATICA"], ["ALAJUELA"], ["GENERAL BASICA 1"]);
console.log(`Test 7 (Combined filters mismatch): ${test7.length === 0 ? "✅ PASSED" : "❌ FAILED"} (Found: ${test7.length})`);

console.log("\n--- Verification Completed ---");
