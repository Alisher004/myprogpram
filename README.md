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

Мугалим же админ кылуу: Firestore'до `users/{uid}` документиндеги `role` талаасын
`"teacher"` же `"admin"` кылып колдон өзгөртүү (студент өзү өзгөртө албайт).

## Структура

| Жол | Эмне |
| --- | --- |
| `src/pages/` | Беттер (Home, Programma, Lesson, Login, Dashboard …) |
| `src/i18n/kg.json`, `ru.json` | Бардык UI тексттери |
| `src/data/lessons.json` | 60 сабак: аталыш, видео, үй тапшырма, колдонмо, playground |
| `src/auth/` | Firebase Auth контексти жана прогресс хугу |
| `firestore.rules` | Firestore коопсуздук эрежелери |

Жаңы видео кошуу: `src/data/lessons.json` ичинде сабактын `video` талаасына
`https://www.youtube.com/embed/<ID>` жазуу.

## Deploy

Vercel: репозиторийди импорттоо → Environment Variables'ке `.env.local` маанилерин кошуу.
`vercel.json` бардык маршруттарды `index.html`ге багыттайт.
