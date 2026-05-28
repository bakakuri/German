import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");

const expectedLevels = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const categoriesWithIcons = new Set([
  "მისალმება",
  "ზოგადი",
  "ადამიანი",
  "ოჯახი",
  "სახლი",
  "რიცხვები",
  "ფერები",
  "საჭმელ-სასმელი",
  "კვირის დღეები",
  "თვეები",
  "ზმნები",
  "ზედსართავები",
  "წინდებულები",
  "ცხოველები",
  "სხეულის ნაწილები",
  "ტანსაცმელი",
  "ტრანსპორტი",
  "ემოციები",
  "ბუნება",
  "ამინდი",
  "სამსახური",
  "ტექნოლოგია",
  "ადგილები",
  "განათლება",
  "ჯანმრთელობა",
  "ქვეყნები",
  "შოპინგი",
  "დრო",
  "მოგზაურობა",
  "მიმართულება",
  "ზმნიზედა",
  "კავშირები",
  "ფული",
  "კომუნიკაცია",
  "სოციალური",
  "ყოველდღიური",
  "B1 ლექსიკა",
  "B2 ლექსიკა",
  "C1/C2 ლექსიკა",
]);

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function topEntries(map, limit = 20) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit);
}

const vocabulary = readJson("json/vocabulary.json");
readJson("json/daily_phrases.json");
readJson("json/achievements.json");
readJson("manifest.json");

const errors = [];
const warnings = [];

vocabulary.forEach((word, index) => {
  for (const field of ["id", "de", "ka", "phonetic", "cat", "level", "example"]) {
    if (!word[field]) errors.push(`vocabulary[${index}] is missing "${field}"`);
  }
  if (word.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(word.id)) {
    errors.push(`vocabulary[${index}] has invalid id "${word.id}"`);
  }
  if (word.level && !expectedLevels.has(word.level)) {
    errors.push(`vocabulary[${index}] has invalid level "${word.level}"`);
  }
  if (word.cat && !categoriesWithIcons.has(word.cat)) {
    warnings.push(`category has no sidebar icon: "${word.cat}"`);
  }
});

const duplicateWords = [...countBy(vocabulary, word => word.de).entries()]
  .filter(([, count]) => count > 1)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const duplicateIds = [...countBy(vocabulary, word => word.id).entries()]
  .filter(([, count]) => count > 1)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

if (duplicateWords.length) {
  errors.push(`${duplicateWords.length} German entries are duplicated by "de"`);
}
if (duplicateIds.length) {
  errors.push(`${duplicateIds.length} vocabulary ids are duplicated`);
}

const levels = countBy(vocabulary, word => word.level);
const categories = countBy(vocabulary, word => word.cat);

console.log(`Vocabulary entries: ${vocabulary.length}`);
console.log(`Unique German values: ${new Set(vocabulary.map(word => word.de)).size}`);
console.log("");

console.log("Levels:");
for (const [level, count] of [...levels.entries()].sort()) {
  console.log(`  ${level}: ${count}`);
}
console.log("");

console.log("Largest categories:");
for (const [category, count] of topEntries(categories, 12)) {
  console.log(`  ${category}: ${count}`);
}
console.log("");

if (duplicateWords.length) {
  console.log("Duplicate German values:");
  for (const [word, count] of duplicateWords.slice(0, 25)) {
    console.log(`  ${word}: ${count}`);
  }
  if (duplicateWords.length > 25) {
    console.log(`  ...and ${duplicateWords.length - 25} more`);
  }
  console.log("");
}

const uniqueWarnings = [...new Set(warnings)];
const uniqueErrors = [...new Set(errors)];

if (uniqueWarnings.length) {
  console.log("Warnings:");
  for (const warning of uniqueWarnings) {
    console.log(`  - ${warning}`);
  }
  console.log("");
}

if (uniqueErrors.length) {
  console.error("Errors:");
  for (const error of uniqueErrors) {
    console.error(`  - ${error}`);
  }
}

if (uniqueErrors.length || (strict && uniqueWarnings.length)) {
  process.exitCode = 1;
}
