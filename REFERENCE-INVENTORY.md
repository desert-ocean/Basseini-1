# Инвентаризация пяти серий справочника

CREATE — новый материал; EXTEND — дополнение существующей темы; LINK — достаточно связать; SKIP — отдельная страница не нужна.

`blog/blog.html` — каталог статей, включая фильтрацию и водоподготовку; самостоятельных технических материалов сверх связанных страниц `articles/` по рассматриваемым темам не найдено.

| № | Тема | Решение и основание |
|---|---|---|
| 1 | Диаметр и расход | LINK — `spravochnik/skorost-vody.html`, гидравлический калькулятор |
| 2 | Рекомендуемые скорости | EXTEND — скорость есть в `spravochnik/skorost-vody.html`; диапазоны только с источником и назначением |
| 3 | Потери на прямом участке | LINK — `spravochnik/gidravlicheskie-poteri.html`, гидравлический калькулятор |
| 4 | Отвод, тройник, кран | EXTEND — формула есть на странице потерь; добавить пояснение по элементам |
| 5 | Напор насоса | CREATE — калькулятор оценивает потери, но отдельного объяснения рабочей точки нет |
| 6 | Расход или скорость | LINK — `spravochnik/skorost-vody.html`, связь Q и площади |
| 7 | м³/ч и л/с | CREATE — перевод упомянут на странице скорости, отдельного инструмента нет |
| 8 | Внутренний и наружный диаметр | LINK — `spravochnik/truby-pvc-u.html` |
| 9 | PN10 и PN16 | EXTEND — таблица и ограничение PN в `spravochnik/truby-pvc-u.html`; паспортные условия требуют пояснения |
| 10 | Почему нельзя выбирать на глаз | SKIP — смысл раскрывается страницами скорости, потерь и калькулятором |
| 11 | Кратность водообмена | EXTEND — Q = V/T в `kalkulyatori/podbor-filtra-i-nasosa.html`; дополнить смыслом и ограничениями |
| 12 | Расход фильтрации | LINK — `kalkulyatori/podbor-filtra-i-nasosa.html` |
| 13 | Подбор фильтра по расходу | LINK — `kalkulyatori/podbor-filtra-i-nasosa.html` |
| 14 | Скорость фильтрации | LINK — тот же калькулятор; `articles/filtratsiya-vody-v-basseyne.html` |
| 15 | Перелив или скиммер | LINK — `articles/skimmernyy-ili-perelivnoy-basseyn.html` |
| 16 | Балансная ёмкость | LINK — `articles/perelivnoy-basseyn-pod-klyuch.html`, калькулятор объёма |
| 17 | Подпитка | EXTEND — учёт есть в материалах по эксплуатации; не равна рециркуляции |
| 18 | Обратная промывка | EXTEND — `articles/filtratsiya-vody-v-basseyne.html`, калькулятор фильтра; добавить короткую схему процесса |
| 19 | Энергия нагрева | LINK — `kalkulyatori/raschet-nagreva-vody-basseyna.html` |
| 20 | Теплообменник или электронагреватель | LINK — `articles/podogrev-vody-v-basseyne.html` |
| 21 | Первичный нагрев и поддержание | LINK — калькулятор нагрева и статья о подогреве |
| 22 | Теплопотери открытого бассейна | LINK — калькулятор нагрева, `articles/ulichnyy-basseyn.html` |
| 23 | Покрытие | LINK — `articles/nakrytie-dlya-basseyna.html`, калькулятор нагрева |
| 24 | Температура воздуха и нагрев | LINK — `articles/podogrev-vody-v-basseyne.html`, калькулятор нагрева |
| 25 | pH | LINK — `articles/balans-ph-vody-v-basseyne.html` |
| 26 | Свободный и связанный хлор | CREATE — требуется отдельное краткое пояснение измерений и условий |
| 27 | Мутная вода | LINK — `articles/ochistka-vody-v-basseyne-problemy.html` |
| 28 | Коагуляция | EXTEND — `articles/filtratsiya-vody-v-basseyne.html`; условия совместимости уточнять по оборудованию |
| 29 | Щёлочность | EXTEND — `articles/balans-ph-vody-v-basseyne.html`, краткое объяснение буферности |
| 30 | Почему нельзя просто добавить химию | LINK — `articles/ochistka-vody-v-basseyne-problemy.html`, статья о pH |
| 31 | Сколько форсунок | CREATE — нет отдельного условного расчёта по паспортному расходу |
| 32 | Донный слив | CREATE — требуется отдельное объяснение с ограничениями безопасности |
| 33 | Скиммеры | LINK — `articles/skimmernyy-basseyn-pod-klyuch.html` |
| 34 | Перелив и скиммер | LINK — `articles/skimmernyy-ili-perelivnoy-basseyn.html` |
| 35 | Расположение форсунок | EXTEND — `articles/proektirovanie-basseynov.html` и статья по оборудованию; нужна схема циркуляции |
| 36 | Циркуляция воды в чаше | EXTEND — `articles/filtratsiya-vody-v-basseyne.html`; необходима схема потоков |

Мини-калькуляторы скорости, сечения, линейных потерь и диаметра уже есть в справочнике и гидравлическом калькуляторе; объём, фильтрация и нагрев — в соответствующих калькуляторах. Эквивалентную длину, дозировки и нормы скоростей не добавлять без подтверждённых входных параметров и области применения. КВт и кВт·ч описывают разные величины и не переводятся друг в друга без времени.
