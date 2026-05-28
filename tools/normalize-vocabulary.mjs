import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filePath = path.join(root, "json", "vocabulary.json");
const levelRank = new Map(["A1", "A2", "B1", "B2", "C1", "C2"].map((level, index) => [level, index]));

const categoryAliases = new Map([
  ["C1/C2 ლექสิka", "C1/C2 ლექსიკა"],
  ["ადამიანები", "ადამიანი"],
  ["საჭმელი", "საჭმელ-სასმელი"],
  ["მაღაზია", "შოპინგი"],
  ["ქალაქი", "ადგილები"],
  ["სწავლა", "განათლება"],
  ["ყოველდღიური ცხოვრება", "ყოველდღიური"],
]);

const additions = [
  {de:"die Auseinandersetzung",ka:"განხილვა / დაპირისპირება",phonetic:"[diː ˈaʊ̯sʔaɪ̯nandɐˌzɛtsʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Auseinandersetzung mit dem Thema ist wichtig."},
  {de:"die Wahrnehmung",ka:"აღქმა",phonetic:"[diː ˈvaːɐ̯neːmʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Unsere Wahrnehmung wird von Erfahrung geprägt."},
  {de:"die Einschätzung",ka:"შეფასება",phonetic:"[diː ˈaɪ̯nʃɛtsʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Seine Einschätzung der Lage war realistisch."},
  {de:"die Belastbarkeit",ka:"გამძლეობა / სტრესის ატანის უნარი",phonetic:"[diː bəˈlastbaːɐ̯kaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Belastbarkeit ist in diesem Beruf sehr wichtig."},
  {de:"die Umsetzung",ka:"განხორციელება",phonetic:"[diː ˈʊmzɛtsʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Umsetzung des Plans dauert mehrere Monate."},
  {de:"die Auswirkung",ka:"გავლენა / შედეგი",phonetic:"[diː ˈaʊ̯svɪʁkʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Entscheidung hat weitreichende Auswirkungen."},
  {de:"die Voraussetzung",ka:"წინაპირობა",phonetic:"[diː ˈfoːɐ̯ʔaʊ̯sˌzɛtsʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Gute Sprachkenntnisse sind eine Voraussetzung."},
  {de:"die Herangehensweise",ka:"მიდგომა",phonetic:"[diː hɛˈʁanɡeːənsˌvaɪ̯zə]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Diese Herangehensweise ist sehr pragmatisch."},
  {de:"die Zielsetzung",ka:"მიზნის დასახვა",phonetic:"[diː ˈtsiːlˌzɛtsʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Zielsetzung muss klar formuliert sein."},
  {de:"die Nachhaltigkeit",ka:"მდგრადობა",phonetic:"[diː ˈnaːxhaltɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Nachhaltigkeit spielt eine zentrale Rolle."},
  {de:"die Verlässlichkeit",ka:"სანდოობა",phonetic:"[diː fɛɐ̯ˈlɛslɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Verlässlichkeit ist die Grundlage jeder Zusammenarbeit."},
  {de:"die Zuständigkeit",ka:"პასუხისმგებლობის სფერო",phonetic:"[diː ˈtsuːʃtɛndɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Zuständigkeit liegt beim Ministerium."},
  {de:"die Begründung",ka:"დასაბუთება",phonetic:"[diː bəˈɡʁʏndʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Begründung klingt überzeugend."},
  {de:"die Einordnung",ka:"კლასიფიკაცია / კონტექსტში მოთავსება",phonetic:"[diː ˈaɪ̯nʔɔʁdnʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Eine historische Einordnung hilft beim Verständnis."},
  {de:"die Abwägung",ka:"გაწონასწორებული განხილვა",phonetic:"[diː ˈapvɛːɡʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Nach sorgfältiger Abwägung traf sie eine Entscheidung."},
  {de:"die Sorgfalt",ka:"სიფრთხილე / გულმოდგინება",phonetic:"[diː ˈzɔʁkfalt]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Arbeit erfordert große Sorgfalt."},
  {de:"die Tragweite",ka:"მნიშვნელობის მასშტაბი",phonetic:"[diː ˈtʁaːkvaɪ̯tə]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Die Tragweite dieser Reform ist noch unklar."},
  {de:"die Erkenntnis",ka:"გაცნობიერება / Erkenntnis",phonetic:"[diː ɛɐ̯ˈkɛntnɪs]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Diese Erkenntnis veränderte seine Sichtweise."},
  {de:"die Wechselwirkung",ka:"ურთიერთქმედება",phonetic:"[diː ˈvɛksəlˌvɪʁkʊŋ]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Es gibt eine Wechselwirkung zwischen Sprache und Kultur."},
  {de:"die Eigeninitiative",ka:"პირადი ინიციატივა",phonetic:"[diː ˈaɪ̯ɡənʔinitsi̯aˌtiːvə]",cat:"C1/C2 ლექსიკა",level:"C1",article:"die",example:"Eigeninitiative wird in vielen Teams geschätzt."},
  {de:"nachvollziehbar",ka:"გასაგები / ლოგიკურად მისაღები",phonetic:"[ˈnaːxˌfɔltsiːbaːɐ̯]",cat:"C1/C2 ლექსიკა",level:"C1",article:"",example:"Die Argumentation ist nachvollziehbar."},
  {de:"aufschlussreich",ka:"ინფორმაციული / თვალისამხელი",phonetic:"[ˈaʊ̯fʃlʊsˌʁaɪ̯ç]",cat:"C1/C2 ლექსიკა",level:"C1",article:"",example:"Das Gespräch war sehr aufschlussreich."},
  {de:"umstritten",ka:"სადავო",phonetic:"[ʊmˈʃtʁɪtn̩]",cat:"C1/C2 ლექსიკა",level:"C1",article:"",example:"Diese Maßnahme ist politisch umstritten."},
  {de:"ausschlaggebend",ka:"გადამწყვეტი",phonetic:"[ˈaʊ̯sʃlaːkˌɡeːbn̩t]",cat:"C1/C2 ლექსიკა",level:"C1",article:"",example:"Die Erfahrung war ausschlaggebend."},
  {de:"sich auseinandersetzen",ka:"განხილვა / საკითხთან გამკლავება",phonetic:"[zɪç ˈaʊ̯sʔaɪ̯nandɐˌzɛtsn̩]",cat:"C1/C2 ლექსიკა",level:"C1",article:"",example:"Wir müssen uns mit Kritik auseinandersetzen."},

  {de:"die Ambivalenz",ka:"ორმხრივობა / წინააღმდეგობრივი განცდა",phonetic:"[diː ambivaˈlɛnts]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Die Ambivalenz seiner Haltung wurde deutlich."},
  {de:"die Diskrepanz",ka:"შეუსაბამობა",phonetic:"[diː dɪskʁeˈpants]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Zwischen Anspruch und Realität besteht eine Diskrepanz."},
  {de:"die Kontingenz",ka:"შემთხვევითობა / პირობითობა",phonetic:"[diː kɔntɪˈɡɛnts]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Der Begriff der Kontingenz ist philosophisch wichtig."},
  {de:"die Deutungshoheit",ka:"ინტერპრეტაციის მონოპოლია",phonetic:"[diː ˈdɔɪ̯tʊŋsˌhoːhaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Medien kämpfen oft um Deutungshoheit."},
  {de:"die Folgerichtigkeit",ka:"ლოგიკური თანმიმდევრულობა",phonetic:"[diː ˈfɔlɡəʁɪçtɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Die Folgerichtigkeit der Theorie ist beeindruckend."},
  {de:"die Unzulänglichkeit",ka:"არასრულყოფილება / ნაკლოვანება",phonetic:"[diː ˈʊntsuˌlɛŋlɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Die Unzulänglichkeit des Systems wurde sichtbar."},
  {de:"die Vergegenwärtigung",ka:"გონებაში ნათლად წარმოდგენა",phonetic:"[diː fɛɐ̯ˈɡeːɡənvɛʁtɪɡʊŋ]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Die Vergegenwärtigung der Vergangenheit fällt schwer."},
  {de:"die Vielschichtigkeit",ka:"მრავალშრიანობა",phonetic:"[diː ˈfiːlʃɪçtɪçkaɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Die Vielschichtigkeit des Problems wird oft unterschätzt."},
  {de:"die Weichenstellung",ka:"გადამწყვეტი მიმართულების მიცემა",phonetic:"[diː ˈvaɪ̯çn̩ˌʃtɛlʊŋ]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Diese Reform war eine wichtige Weichenstellung."},
  {de:"die Zerrissenheit",ka:"შინაგანი გაორება",phonetic:"[diː tsɛɐ̯ˈʁɪsn̩haɪ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"die",example:"Seine Zerrissenheit war deutlich spürbar."},
  {de:"der Erkenntnisgewinn",ka:"ახალი ცოდნის მიღება",phonetic:"[deːɐ̯ ɛɐ̯ˈkɛntnɪsɡəˌvɪn]",cat:"C1/C2 ლექსიკა",level:"C2",article:"der",example:"Der Erkenntnisgewinn ist wissenschaftlich relevant."},
  {de:"der Paradigmenwechsel",ka:"პარადიგმის ცვლილება",phonetic:"[deːɐ̯ paʁaˈdɪɡmənˌvɛksəl]",cat:"C1/C2 ლექსიკა",level:"C2",article:"der",example:"Die Digitalisierung führte zu einem Paradigmenwechsel."},
  {de:"der Ermessensspielraum",ka:"დისკრეციის სივრცე",phonetic:"[deːɐ̯ ɛɐ̯ˈmɛsn̩sˌʃpiːlʁaʊ̯m]",cat:"C1/C2 ლექსიკა",level:"C2",article:"der",example:"Der Ermessensspielraum der Behörde ist begrenzt."},
  {de:"das Spannungsverhältnis",ka:"დაძაბული ურთიერთმიმართება",phonetic:"[das ˈʃpanʊŋsˌfɛɐ̯hɛltnɪs]",cat:"C1/C2 ლექსიკა",level:"C2",article:"das",example:"Es gibt ein Spannungsverhältnis zwischen Freiheit und Sicherheit."},
  {de:"das Selbstverständnis",ka:"თვითაღქმა",phonetic:"[das ˈzɛlpstfɛɐ̯ˌʃtɛntnɪs]",cat:"C1/C2 ლექსიკა",level:"C2",article:"das",example:"Das Selbstverständnis der Institution verändert sich."},
  {de:"das Alleinstellungsmerkmal",ka:"უნიკალური განმასხვავებელი ნიშანი",phonetic:"[das aˈlaɪ̯nʃtɛlʊŋsˌmɛʁkmaːl]",cat:"C1/C2 ლექსიკა",level:"C2",article:"das",example:"Dieses Design ist ihr Alleinstellungsmerkmal."},
  {de:"nuanciert",ka:"ნიუანსირებული",phonetic:"[nyˈʔansiːɐ̯t]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Die Analyse ist nuanciert und ausgewogen."},
  {de:"konstitutiv",ka:"არსებითი / შემადგენელი",phonetic:"[kɔnstituˈtiːf]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Vertrauen ist konstitutiv für Demokratie."},
  {de:"substanziell",ka:"არსებითი / მნიშვნელოვანი",phonetic:"[zʊpstanˈtsi̯ɛl]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Die Verbesserung ist substanziell."},
  {de:"unverhältnismäßig",ka:"არაპროპორციული",phonetic:"[ˈʊnfɛɐ̯hɛltnɪsˌmɛːsɪç]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Die Strafe erscheint unverhältnismäßig."},
  {de:"aufs Engste verknüpft",ka:"მჭიდროდ დაკავშირებული",phonetic:"[aʊ̯fs ˈɛŋstə fɛɐ̯ˈknʏpft]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Sprache und Identität sind aufs Engste verknüpft."},
  {de:"sich manifestieren",ka:"გამოვლენა / ხილულად გახდომა",phonetic:"[zɪç manifɛsˈtiːʁən]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Die Folgen manifestieren sich erst später."},
  {de:"etwas relativieren",ka:"რაიმეს მნიშვნელობის შერბილება",phonetic:"[ˈɛtvas ʁelativiːʁən]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Neue Daten relativieren die alte These."},
  {de:"etwas konterkarieren",ka:"რაიმეს საწინააღმდეგოდ მოქმედება",phonetic:"[ˈɛtvas kɔntɐkaˈʁiːʁən]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Diese Maßnahme konterkariert das ursprüngliche Ziel."},
  {de:"sich herauskristallisieren",ka:"ნელ-ნელა გამოკვეთა",phonetic:"[zɪç hɛˈʁaʊ̯skʁɪstaliˌziːʁən]",cat:"C1/C2 ლექსიკა",level:"C2",article:"",example:"Eine Lösung kristallisierte sich allmählich heraus."},
];

function canonicalCategory(cat) {
  return categoryAliases.get(cat) || cat;
}

function normalizeText(text) {
  return String(text || "").trim();
}

function slugify(text) {
  const prepared = normalizeText(text)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  return prepared
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeText(a, b) {
  const parts = new Set();
  for (const value of [a, b]) {
    normalizeText(value).split(/\s+\/\s+/).forEach(part => {
      const clean = normalizeText(part);
      if (clean) parts.add(clean);
    });
  }
  return [...parts].join(" / ");
}

function chooseBase(current, next) {
  const currentRank = levelRank.get(current.level) ?? 99;
  const nextRank = levelRank.get(next.level) ?? 99;
  if (nextRank < currentRank) return {...next, ka:mergeText(current.ka, next.ka)};
  return {...current, ka:mergeText(current.ka, next.ka)};
}

const existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
const normalized = existing.map(word => ({
  ...word,
  de: normalizeText(word.de),
  ka: normalizeText(word.ka),
  phonetic: normalizeText(word.phonetic),
  cat: canonicalCategory(normalizeText(word.cat)),
  level: normalizeText(word.level),
  article: normalizeText(word.article),
  example: normalizeText(word.example),
}));

for (const word of additions) {
  normalized.push({...word, cat:canonicalCategory(word.cat)});
}

const byGerman = new Map();
for (const word of normalized) {
  const key = word.de.toLocaleLowerCase("de-DE");
  if (!byGerman.has(key)) {
    byGerman.set(key, word);
  } else {
    byGerman.set(key, chooseBase(byGerman.get(key), word));
  }
}

const usedIds = new Map();
const result = [...byGerman.values()].map(word => {
  const base = slugify(word.de) || `word-${usedIds.size + 1}`;
  const nextCount = (usedIds.get(base) || 0) + 1;
  usedIds.set(base, nextCount);
  const id = nextCount === 1 ? base : `${base}-${nextCount}`;
  return {id, ...word};
});

fs.writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Normalized vocabulary: ${existing.length} existing + ${additions.length} additions -> ${result.length} unique entries`);
