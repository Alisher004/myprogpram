# Тесттер

| Suite | Команда | Эмнени текшерет | Керектүү нерселер |
| --- | --- | --- | --- |
| unit | `npm test` | Hook'тор, auth портал логикасы (Firebase mock), роль боюнча багыттоо, кирүү барагы, тил, навигация, котормолор | Node гана |
| rules | `npm run test:rules` | `firestore.rules`: ар бир роль үчүн allow/deny, IDOR, privilege escalation, кайталанган суроо-талаптар | Java 21+, Firebase CLI |
| e2e | `npm run test:e2e` | Чыныгы Chrome + Auth/Firestore эмуляторлору: үч роль, порталдар, багыттоо, мутациялар, кош басуу, мобилдик | Java 21+, Firebase CLI, Chrome |

Бардык suite'тер `demo-codebilim` деген жасалма долбоорду колдонот. `demo-` префикси
Firebase'ке production'го туташууга тыюу салат. Production маалыматына эч бир тест тийбейт.

## Мурунку 45 кол менен текшерилген сценарий → азыркы тесттер

| # | Сценарий | Күтүлгөн натыйжа | Тест |
| --- | --- | --- | --- |
| 1–3 | Катталуу → кабинет, студенттин sidebar'ы, staff пункттары жок | `/cabinet`, role=student | e2e › student › registers… |
| 4–11 | Студент 8 staff/login URL'ин терет | `/cabinet`ке кайтат | e2e › student › is bounced back… ; unit › RequireRole (9 роль×аймак комбинациясы) |
| 12 | "Өттүм" 3 жолу тез басылат | 1 toggle, 1 progress документ | e2e › triple-clicking 'done'… ; rules › progress toggled twice |
| 13 | Тапшырма 2 жолу тез жөнөтүлөт | 1 submission | e2e › homework submitted twice… ; rules › homework submitted twice |
| 14–16 | Тил тандоо, которулушу, reload'дон кийин сакталышы | 2 тил, `ru` сакталат | e2e › keeps the chosen language… ; unit › language selection |
| 17–19 | Чыгуу, андан кийин кабинетке кирүү | `/login` | e2e › logs out to the student login… |
| 20–21 | Кирбеген адам staff URL'ин ачат | Ошол аймактын login'и | e2e › signed-out visitors… ; unit › RequireRole signed out |
| 22–27 | Студент мугалим/админ порталынан кирет | Ката, форма калат, сессия жабылат | e2e › login portals (9 комбинация) ; unit › portals (9 комбинация) |
| 28 | Өз профилин окуйт | allow | rules › student › read own profile |
| 29 | Өзүн admin кылат | deny | rules › student → admin ; e2e › direct API |
| 30–31 | Email өзгөртүү / атын өзгөртүү | deny / allow | rules › change own email / display name |
| 32–35 | users, students(filter), submissions, progress тизмелөө | deny | rules › student › list… |
| 36–39 | Өзүнө баа коюу, progress'ке бөтөн талаа, тапшырманы өчүрүү, 99-сабак | deny | rules › student › submissions/progress |
| 40 | Кош жөнөтүүдөн кийин базада 1 жазуу | 1 документ | rules › duplicate requests ; e2e |
| 41–43 | role=teacher менен катталуу, бөтөн email, профилсиз аккаунт | deny | rules › registration |
| 44–45 | Жараксыз токен / токенсиз | авторизацияланбайт | e2e › no token or a garbage token ; rules › unauthenticated |

Мурун текшерилбеген мугалим жана админ сценарийлери: `rules › teacher`, `rules › admin`,
`e2e › teacher`, `e2e › admin`, `unit › portals`.
