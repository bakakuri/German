# DeutschGeo

DeutschGeo არის გერმანული ენის სასწავლო PWA ქართველებისთვის. პროექტი მუშაობს როგორც სტატიკური ვებ-აპი და მოიცავს ლექსიკონს, SRS გამეორებას, flashcards-ს, quiz/test რეჟიმებს, listening/speaking პრაქტიკას, ფონეტიკას, გრამატიკის სავარჯიშოებს, მიღწევებს, daily goal-ს, XP-ს, streak-ს და progress import/export-ს.

## გაშვება

აპი JSON ფაილებს `fetch()`-ით კითხულობს, ამიტომ საუკეთესოა პატარა local server-ით გაშვება:

```bash
node tools/serve-static.mjs 8000
```

შემდეგ გახსენით `http://127.0.0.1:8000`.

## მონაცემები

მთავარი სასწავლო კონტენტი ინახება JSON ფაილებში:

- `json/vocabulary.json` - სიტყვები, თარგმანები, ფონეტიკა, კატეგორია, დონე და მაგალითები
- `json/daily_phrases.json` - დღის ფრაზები
- `json/achievements.json` - მიღწევების წესები და XP ჯილდოები

ლექსიკონის ჩანაწერის ძირითადი ფორმატი:

```json
{
  "id": "das-haus",
  "de": "das Haus",
  "ka": "სახლი",
  "phonetic": "[das haʊs]",
  "cat": "სახლი",
  "level": "A1",
  "article": "das",
  "example": "Das Haus hat einen großen Garten."
}
```

## შემოწმება

მონაცემების სწრაფი შემოწმება:

```bash
node tools/validate-data.mjs
```

strict რეჟიმი warnings-ზეც აბრუნებს არანულოვან exit code-ს:

```bash
node tools/validate-data.mjs --strict
```

validator ამოწმებს `id`-ების უნიკალურობას, duplicate German values-ს, სავალდებულო ველებს, CEFR დონეებს და კატეგორიებს.

## ბოლო გაუმჯობესებები

- SRS queue-ში due ნასწავლი სიტყვებიც ბრუნდება.
- "ასე-ისე" მონიშნული სიტყვები reload-ის შემდეგ აღარ იკარგება reinforce სიიდან.
- category + level filter ერთად მუშაობს.
- გრამატიკის XP ერთსა და იმავე თემაზე განმეორებით გახსნით აღარ იფარმება.
- დაემატა data validator.
- ლექსიკონის ყველა სიტყვას დაემატა სტაბილური `id`.
- duplicate German values გაერთიანდა და progress უკვე `id`-ებით ინახება.
- typo/გაფანტული კატეგორიები დაინორმალიზდა ან sidebar icon-ებით დაიფარა.
- C1/C2 ლექსიკა გაიზარდა 53 ჩანაწერამდე.
- დაემატა daily goal, listening practice, speaking practice და გრამატიკის პრაქტიკული სავარჯიშოები.
- Service worker cache განახლდა `deutschgeo-v6`-ზე.
- დაემატა vocabulary normalization script.
- გრამატიკის სავარჯიშოები გაიზარდა თემების მიხედვით და დაემატა ბოლო შეცდომების ისტორია.
- speaking რეჟიმში დაემატა similarity score, pronunciation tips და ბოლო speaking მცდელობების ისტორია.
- daily goal-ს დაემატა თვიური კალენდარული ისტორია.
- streak გამკაცრდა: აღარ იზრდება აპის გახსნაზე და ითვლება მხოლოდ შესრულებული daily goal დღეებით.
- გრამატიკის შეცდომების history-ს დაემატა replay რეჟიმი.
- speaking tips გახდა სიტყვა-სპეციფიკური IPA rule-ების მიხედვით.
- აპს დაემატა footer.

## შემდეგი კარგი ნაბიჯები

- speaking რეჟიმში დაემატოს მარცვლებად დაყოფილი live feedback.
- daily goal calendar-ში დაემატოს წინა/შემდეგი თვის გადართვა.
- გრამატიკის replay-ს დაემატოს spaced repetition queue.
