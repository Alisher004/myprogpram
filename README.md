# Кодбилим

3 айлык frontend курсунун платформасы: React + Vite + Firebase.

## Иштетүү

```bash
npm install
npm run dev
```

Firebase'сиз деле сайт иштейт — кирүү жана прогресс гана өчүк болот.

## Firebase туташтыруу

1. [Firebase Console](https://console.firebase.google.com) → жаңы долбоор → Web app кошуу.
2. Authentication → Sign-in method → **Google** жана **Email/Password** күйгүзүү.
3. Firestore Database → Create database.
4. `.env.example` файлын `.env.local` деп көчүрүп, SDK config маанилерин толтуруу.
5. Коопсуздук эрежелерин жүктөө: `firebase deploy --only firestore:rules`

## Ролдор жана кирүү

| Роль | Кирүү барагы | Кабинет | Катталуу |
| --- | --- | --- | --- |
| Студент | `/login` | `/cabinet` | `/register` (ачык) |
| Мугалим | `/<VITE_TEACHER_BASE>/login` | `/<VITE_TEACHER_BASE>` | жок, админ дайындайт |
| Админ | `/<VITE_ADMIN_BASE>/login` | `/<VITE_ADMIN_BASE>` | жок |

- Ар бир кирүү барагы бир гана ролго тиешелүү. Башка ролдун аккаунту менен кирсе, сессия ошол замат жабылат.
- Мугалим жана админ панелинин дареги `.env.local` файлында берилет (`VITE_TEACHER_BASE`, `VITE_ADMIN_BASE`). Production үчүн өзүңүздүн маанилериңизди коюңуз.
- Даректи жашыруу коопсуздук эмес. Негизги коргоо `firestore.rules` файлында: ар бир окуу жана жазуу сервердин өзүндө ролго жараша текшерилет.
- **Биринчи админди дайындоо:** Firestore Console → `users/{uid}` → `role: "admin"`. Калгандарын админ панелинен дайындаса болот.

## Тесттер

### Талаптар
- Node.js 20+
- **Java 21+** (Firestore эмулятору үчүн гана). Скрипт аны PATH, `JAVA_HOME` жана Homebrew'дун
  `openjdk` папкаларынан өзү табат, эч нерсе орнотпойт. Жок болсо так билдирүү чыгат.
- **Firebase CLI**: `npm i -g firebase-tools`
- **Chrome** (E2E үчүн). Башка жерде болсо: `CHROME_PATH=/path/to/chrome npm run test:e2e`

### Командалар
| Команда | Эмне кылат |
| --- | --- |
| `npm test` | Unit тесттер (Java/эмулятор керек эмес) |
| `npm run test:watch` | Unit тесттер, өзгөртүү сайын кайра иштейт |
| `npm run test:rules` | Firestore эрежелери, эмулятордо |
| `npm run test:e2e` | Браузер тесттери: колдонмо build кылынып, Auth + Firestore эмуляторлоруна туташат |
| `npm run test:all` | Үчөө тең катары менен |

Эмулятор `node scripts/emulators.mjs` аркылуу `demo-codebilim` долбоору менен иштейт, ошондуктан
тесттер production'го эч качан жазбайт. Сценарийлердин толук тизмеси: [tests/README.md](tests/README.md).

### Troubleshooting
- **"Java not found"**: `brew install openjdk` же `JAVA_HOME` коюңуз. Unit тесттер Java'сыз иштейт.
- **Порт бош эмес (8080, 9099, 4410)**: мурунку эмулятор же `vite preview` иштеп калган. `lsof -i :8080` менен табып токтотуңуз.
- **"Chrome not found"**: `CHROME_PATH` коюңуз.
- **E2E'де кокус redirect timeout**: эмулятор HTTP/1.1 колдонот жана бир табда тез-тез кайра жүктөөдө Chrome'дун
  6 байланыш чеги толуп калышы мүмкүн. Ошондуктан redirect тесттери ар бир URL'ди жаңы табда ачат.

## Структура

| Жол | Эмне |
| --- | --- |
| `src/lib/routes.js` | Бардык URL'дер жана роль боюнча багыттоо (`homeFor`, `loginFor`) |
| `src/auth/` | Firebase Auth контексти, `RequireRole`, прогресс хугу |
| `src/components/AppShell.jsx` | Студент, мугалим жана админ кабинеттеринин жалпы макети (sidebar, topbar) |
| `src/pages/student`, `teacher`, `admin` | Ар бир ролдун беттери |
| `src/pages/auth/LoginPage.jsx` | Үч порталдын кирүү барагы |
| `src/hooks/useAsyncAction.js` | Эки жолу басуудан коргоо |
| `src/i18n/kg.json`, `ru.json` | Бардык UI тексттери |
| `src/data/lessons.json` | 60 сабак |
| `src/styles/style.css` | Дизайн токендери (3 негизги түс: primary, secondary, accent) |
| `firestore.rules` | Сервер тараптагы авторизация |

Жаңы видео кошуу: `src/data/lessons.json` ичинде сабактын `video` талаасына
`https://www.youtube.com/embed/<ID>` жазуу.

## Deploy

Vercel: репозиторийди импорттоо → Environment Variables'ке `.env.local` маанилерин кошуу.
`vercel.json` бардык маршруттарды `index.html`ге багыттайт.
