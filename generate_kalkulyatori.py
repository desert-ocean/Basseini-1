from pathlib import Path

ROOT = Path(r"E:\-=Программирование=-\Свой сайт по бассейнам\Basseini-1")
CALC_DIR = ROOT / "kalkulyatori"
CAT_DIR = ROOT / "kalkulyatory"
CAT_DIR.mkdir(exist_ok=True)

CONTACT = """<footer id="footer">
  <section id="contact" class="contact-form-section" aria-labelledby="contact-title">
    <header>
      <span class="date">Контакты</span>
      <h2 id="contact-title">Получить персональную консультацию</h2>
      <p>Оставьте заявку — свяжемся, уточним параметры объекта и предложим следующий шаг.</p>
    </header>
    <form method="POST" action="https://formspree.io/f/xnjwywvy">
      <div class="fields">
        <div class="field"><label for="name">Имя</label><input type="text" name="name" id="name" placeholder="Ваше имя" autocomplete="name" /></div>
        <div class="field"><label for="phone">Телефон</label><input type="tel" name="phone" id="phone" placeholder="+7 (___) ___-__-__" autocomplete="tel" /></div>
        <div class="field"><label for="message">Комментарий</label><textarea name="message" id="message" placeholder="Что нужно рассчитать?"></textarea></div>
      </div>
      <button type="submit" class="button large">Получить консультацию</button>
    </form>
  </section>
</footer>"""

ALL_LINKS = [
    ("/kalkulyatori/kalkulyator-obema-basseyna.html", "Объем"),
    ("/kalkulyatori/kalkulyator-filtracii.html", "Фильтрация"),
    ("/kalkulyatori/kalkulyator-moshnosti-teploobmennika.html", "Теплообменник"),
    ("/kalkulyatori/kalkulyator-teplovogo-nasosa.html", "Тепловой насос"),
    ("/kalkulyatori/kalkulyator-podogreva-basseyna.html", "Подогрев"),
    ("/kalkulyatori/kalkulyator-rashoda-vody.html", "Расход воды"),
    ("/kalkulyatori/kalkulyator-dozirovki-himii.html", "Химия"),
    ("/kalkulyatori/kalkulyator-plitki.html", "Плитка"),
    ("/kalkulyatori/kalkulyator-mozaiki.html", "Мозаика"),
    ("/kalkulyatori/kalkulyator-gidroizolyacii.html", "Гидроизоляция"),
    ("/kalkulyatori/kalkulyator-betona-basseina.html", "Бетон"),
    ("/kalkulyatori/kalkulyator-armatury.html", "Арматура"),
    ("/kalkulyatori/kalkulyator-zemlyanyh-rabot.html", "Земляные работы"),
    ("/kalkulyatori/kalkulyator-stoimosti-pavilona.html", "Павильон"),
    ("/kalkulyatori/kalkulyator-osushitelya.html", "Осушитель"),
]


def links_html(current: str) -> str:
    return "\n".join(
        f'      <a href="{href}">{label}</a>'
        for href, label in ALL_LINKS
        if not href.endswith(current)
    )


def faq_html(items) -> str:
    return "\n".join(
        f"    <dt>{items[i]}</dt><dd>{items[i+1]}</dd>"
        for i in range(0, len(items), 2)
    )


def benefits_html(items) -> str:
    return "\n".join(
        f'      <article class="trust-item"><strong>{items[i]}</strong><span>{items[i+1]}</span></article>'
        for i in range(0, len(items), 2)
    )


PAGES = [
    {
        "file": "kalkulyator-obema-basseyna.html",
        "title": "Калькулятор объема бассейна",
        "desc": "Рассчитайте объем воды в бассейне и получите ориентир по первичному заполнению чаши.",
        "h1": "Калькулятор объема бассейна",
        "intro": [
            "Рассчитайте объем бассейна по форме чаши и получите значение в кубометрах и литрах.",
            "Калькулятор помогает быстро оценить первичное заполнение и базовые параметры для дальнейших расчетов.",
            "Подходит для предварительной оценки частных и коммерческих проектов.",
        ],
        "form": """    <label>Тип бассейна</label>
    <select id="shape"><option value="rect">Прямоугольный</option><option value="round">Круглый</option><option value="oval">Овальный</option></select>
    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Средняя глубина (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Объем воды: <b id="v"></b> м³</div>
    <div>Объем воды: <b id="l"></b> литров</div>""",
        "js": """function calculate(){const shape=document.getElementById("shape").value;const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const H=+document.getElementById("depth").value||0;let v=0;if(shape==="rect")v=L*W*H;if(shape==="round")v=Math.PI*Math.pow(L/2,2)*H;if(shape==="oval")v=Math.PI*L*W*H/4;document.getElementById("v").innerText=v.toFixed(2);document.getElementById("l").innerText=Math.round(v*1000).toLocaleString();document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой объем считать для бассейна?", "Берите объем чаши по внутренним размерам и средней глубине.",
            "Что если форма нестандартная?", "Используйте ближайшую геометрию или переходите к консультации инженера.",
            "Можно ли использовать результат для сметы?", "Да, это хороший ориентир для первичного расчета.",
            "Почему результат предварительный?", "Потому что итог зависит от конструкции, отделки и инженерии.",
            "Куда обратиться за точным расчетом?", "Нажмите «Получить консультацию» и отправьте параметры инженеру."
        ],
        "benefits": [
            "01", "Быстрый расчет по базовым размерам",
            "02", "Подходит для предварительной оценки бюджета",
            "03", "Помогает подготовиться к консультации",
            "04", "Связан с остальными калькуляторами",
        ],
    },
    {
        "file": "kalkulyator-filtracii.html",
        "title": "Калькулятор производительности фильтра",
        "desc": "Рассчитайте производительность фильтра и подбор насоса для бассейна по объему воды.",
        "h1": "Калькулятор производительности фильтра",
        "intro": [
            "Введите объем бассейна и получите рекомендуемую производительность насоса.",
            "Расчет помогает понять, какой фильтр и насос подойдут под полный оборот воды за 6 часов.",
            "Результат нужен для предварительного подбора системы водоподготовки.",
        ],
        "form": """    <div class="field"><label>Объем бассейна (м³)</label><input type="number" id="volume" value="40"></div>""",
        "result": """    <div>Рекомендуемая производительность насоса: <b id="q"></b> м³/ч</div>
    <div>Рекомендуемый диапазон фильтра: <b id="filter"></b></div>""",
        "js": """function calculate(){const V=+document.getElementById("volume").value||0;const q=V/6;document.getElementById("q").innerText=q.toFixed(2);document.getElementById("filter").innerText=(Math.round(q*1.2))+"–"+(Math.round(q*1.6))+" м³/ч";document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой оборот воды считать нормальным?", "Обычно полный оборот принимают за 6 часов.",
            "Можно ли использовать расчет для частного бассейна?", "Да, это базовый ориентир для подбора оборудования.",
            "Что влияет на выбор насоса?", "Объем, гидравлика, длина трассы и тип фильтра.",
            "Нужна ли корректировка специалиста?", "Да, итог лучше проверять инженером.",
            "Где получить точный подбор?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Быстрый расчет по объему",
            "02", "Понимание нагрузки на систему",
            "03", "Связь с подбором оборудования",
            "04", "Единая подача данных",
        ],
    },
    {
        "file": "kalkulyator-moshnosti-teploobmennika.html",
        "title": "Калькулятор мощности теплообменника",
        "desc": "Рассчитайте требуемую мощность теплообменника для нагрева воды в бассейне.",
        "h1": "Калькулятор мощности теплообменника",
        "intro": [
            "Введите объем бассейна, температуры и время нагрева, чтобы получить мощность теплообменника.",
            "Формула помогает оценить тепловую нагрузку и подобрать оборудование под задачу проекта.",
            "Результат подходит для предварительного инженерного расчета.",
        ],
        "form": """    <div class="field"><label>Объем бассейна (м³)</label><input type="number" id="volume" value="40"></div>
    <div class="field"><label>Текущая температура (°C)</label><input type="number" id="t1" value="20"></div>
    <div class="field"><label>Желаемая температура (°C)</label><input type="number" id="t2" value="28"></div>
    <div class="field"><label>Время нагрева (ч)</label><input type="number" id="time" value="8"></div>""",
        "result": """    <div>Требуемая мощность теплообменника: <b id="power"></b> кВт</div>""",
        "js": """function calculate(){const V=+document.getElementById("volume").value||0;const t1=+document.getElementById("t1").value||0;const t2=+document.getElementById("t2").value||0;const time=+document.getElementById("time").value||1;const dT=Math.max(0,t2-t1);const q=(V*1.163*dT)/time;document.getElementById("power").innerText=q.toFixed(2);document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой объем вводить?", "Берите объем воды в бассейне по внутренним размерам.",
            "Почему учитывается время нагрева?", "Потому что от него зависит необходимая мощность.",
            "Можно ли использовать расчет для подбора оборудования?", "Да, это базовый ориентир.",
            "Нужна ли корректировка инженером?", "Да, итог лучше сверять по проекту.",
            "Как получить точный расчет?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Быстрый расчет по формуле",
            "02", "Помогает сравнить решения",
            "03", "Подходит для подбора оборудования",
            "04", "Единый стиль страницы",
        ],
    },
    {
        "file": "kalkulyator-teplovogo-nasosa.html",
        "title": "Калькулятор теплового насоса",
        "desc": "Подберите мощность теплового насоса для бассейна по объему воды.",
        "h1": "Калькулятор теплового насоса",
        "intro": [
            "Введите объем бассейна, чтобы получить ориентир по мощности теплового насоса.",
            "Калькулятор показывает диапазон мощности для разных размеров бассейнов.",
            "Это удобная точка старта перед консультацией с инженером.",
        ],
        "form": """    <div class="field"><label>Объем бассейна (м³)</label><input type="number" id="volume" value="40"></div>""",
        "result": """    <div>Рекомендуемая мощность: <b id="power"></b></div>
    <div>Примерный диапазон моделей: <b id="models"></b></div>""",
        "js": """function calculate(){const V=+document.getElementById("volume").value||0;let power="5–7 кВт",models="малые модели";if(V>20&&V<=40){power="9–12 кВт";models="средние модели";}if(V>40&&V<=70){power="12–17 кВт";models="средние/старшие модели";}if(V>70){power="17–25 кВт";models="крупные модели";}document.getElementById("power").innerText=power;document.getElementById("models").innerText=models;document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой объем бассейна нужен для расчета?", "Введите объем воды в кубометрах.",
            "Можно ли использовать ориентир как точный подбор?", "Нет, для точного подбора нужна проверка инженером.",
            "Что влияет на мощность?", "Объем, температура воды и условия эксплуатации.",
            "Есть ли диапазон моделей?", "Да, калькулятор показывает ориентир по мощности.",
            "Как получить консультацию?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Быстрый ориентир",
            "02", "Привязка к объему бассейна",
            "03", "Подходит для первичного отбора",
            "04", "Согласован с другими калькуляторами",
        ],
    },
    {
        "file": "kalkulyator-podogreva-basseyna.html",
        "title": "Калькулятор подогрева бассейна",
        "desc": "Рассчитайте время нагрева и необходимую энергию для подогрева бассейна.",
        "h1": "Калькулятор подогрева бассейна",
        "intro": [
            "Введите объем бассейна, начальную и требуемую температуру, а также мощность нагревателя.",
            "Калькулятор показывает время нагрева и необходимую энергию.",
            "Используйте результат как предварительный ориентир по подогреву воды.",
        ],
        "form": """    <div class="field"><label>Объем бассейна (м³)</label><input type="number" id="volume" value="40"></div>
    <div class="field"><label>Начальная температура (°C)</label><input type="number" id="t1" value="20"></div>
    <div class="field"><label>Требуемая температура (°C)</label><input type="number" id="t2" value="28"></div>
    <div class="field"><label>Мощность нагревателя (кВт)</label><input type="number" id="powerIn" value="15"></div>""",
        "result": """    <div>Время нагрева: <b id="time"></b> ч</div>
    <div>Необходимая энергия: <b id="energy"></b> кВт·ч</div>""",
        "js": """function calculate(){const V=+document.getElementById("volume").value||0;const t1=+document.getElementById("t1").value||0;const t2=+document.getElementById("t2").value||0;const P=+document.getElementById("powerIn").value||1;const dT=Math.max(0,t2-t1);const energy=V*1.163*dT;const time=energy/P;document.getElementById("time").innerText=time.toFixed(1);document.getElementById("energy").innerText=energy.toFixed(1);document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой объем использовать?", "Берите реальный объем воды в чаше.",
            "Что показывает энергия?", "Сколько кВт·ч потребуется на нагрев.",
            "Почему время может отличаться?", "На него влияют температура, ветер и теплоизоляция.",
            "Можно ли рассчитывать для уличного бассейна?", "Да, это универсальный ориентир.",
            "Как получить точный расчет?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Понятный расчет тепла",
            "02", "Оценка времени нагрева",
            "03", "Связь с подбором оборудования",
            "04", "Единый UI сайта",
        ],
    },
    {
        "file": "kalkulyator-rashoda-vody.html",
        "title": "Калькулятор расхода воды",
        "desc": "Рассчитайте объем воды для первичного заполнения бассейна.",
        "h1": "Калькулятор расхода воды",
        "intro": [
            "Определите объем воды для первичного заполнения бассейна по форме чаши.",
            "Калькулятор использует те же формулы объема и помогает оценить объём воды для запуска.",
            "Это удобно для планирования подвоза и первичного наполнения.",
        ],
        "form": """    <label>Тип бассейна</label>
    <select id="shape"><option value="rect">Прямоугольный</option><option value="round">Круглый</option><option value="oval">Овальный</option></select>
    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Средняя глубина (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Объем воды: <b id="v"></b> м³</div>
    <div>Для первичного заполнения потребуется: <b id="fill"></b> литров</div>""",
        "js": """function calculate(){const shape=document.getElementById("shape").value;const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const H=+document.getElementById("depth").value||0;let v=0;if(shape==="rect")v=L*W*H;if(shape==="round")v=Math.PI*Math.pow(L/2,2)*H;if(shape==="oval")v=Math.PI*L*W*H/4;document.getElementById("v").innerText=v.toFixed(2);document.getElementById("fill").innerText=Math.round(v*1000).toLocaleString();document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Чем отличается объем от расхода воды?", "Здесь показывается объем для первичного заполнения.",
            "Можно ли использовать для круглого бассейна?", "Да, есть отдельная формула.",
            "Подходит ли для овальной чаши?", "Да, используется соответствующая формула.",
            "Как получить точный подбор?", "Нажмите «Получить консультацию».",
            "Это предварительный расчет?", "Да, результат ориентировочный."
        ],
        "benefits": [
            "01", "Подходит для запуска",
            "02", "Простая подача результата",
            "03", "Вязка с объемом чаши",
            "04", "Единый стиль",
        ],
    },
    {
        "file": "kalkulyator-dozirovki-himii.html",
        "title": "Калькулятор дозировки химии",
        "desc": "Рассчитайте дозировку химии для бассейна по объему воды.",
        "h1": "Калькулятор дозировки химии",
        "intro": [
            "Введите объем бассейна и получите ориентиры по дозировке основных реагентов.",
            "Калькулятор показывает диапазон дозировки для хлора, альгицидов, коагулянта и корректоров pH.",
            "Используйте расчет как базовую точку перед настройкой водоподготовки.",
        ],
        "form": """    <div class="field"><label>Объем бассейна (м³)</label><input type="number" id="volume" value="40"></div>""",
        "result": """    <div>Хлор: <b id="chlorine"></b></div>
    <div>Альгицид: <b id="algaecide"></b></div>
    <div>Коагулянт: <b id="coag"></b></div>
    <div>pH минус: <b id="phminus"></b></div>
    <div>pH плюс: <b id="phplus"></b></div>""",
        "js": """function calculate(){const V=+document.getElementById("volume").value||0;document.getElementById("chlorine").innerText=(V*35).toFixed(0)+" г";document.getElementById("algaecide").innerText=(V*5).toFixed(0)+"–"+(V*10).toFixed(0)+" мл";document.getElementById("coag").innerText=(V*10).toFixed(0)+"–"+(V*20).toFixed(0)+" мл";document.getElementById("phminus").innerText=(V*10).toFixed(0)+" г";document.getElementById("phplus").innerText=(V*10).toFixed(0)+" г";document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "На что ориентирован расчет?", "На базовые дозировки реагентов по объему бассейна.",
            "Можно ли брать результат как точный?", "Нет, дозировка зависит от анализа воды.",
            "Какие реагенты учтены?", "Хлор, альгицид, коагулянт, pH минус и pH плюс.",
            "Как часто корректировать дозировку?", "Регулярно, по состоянию воды.",
            "Где получить помощь?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Быстрый ориентир по реагентам",
            "02", "Подходит для обслуживания",
            "03", "Снижает риск перерасхода",
            "04", "Единый стиль",
        ],
    },
    {
        "file": "kalkulyator-plitki.html",
        "title": "Калькулятор плитки для бассейна",
        "desc": "Рассчитайте площадь облицовки и количество плитки для бассейна.",
        "h1": "Калькулятор плитки для бассейна",
        "intro": [
            "Введите размеры чаши и получите площадь облицовки с учетом запаса.",
            "Калькулятор помогает оценить количество плитки для стен и дна бассейна.",
            "Результат подходит для предварительной закупки материала.",
        ],
        "form": """    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Площадь облицовки: <b id="area"></b> м²</div>
    <div>Количество плитки: <b id="tiles"></b></div>
    <div>Запас 10%: <b id="reserve"></b></div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const H=+document.getElementById("depth").value||0;const area=2*(L*H+W*H)+L*W;const reserve=area*1.1;document.getElementById("area").innerText=area.toFixed(2);document.getElementById("tiles").innerText=Math.ceil(area/0.01).toLocaleString();document.getElementById("reserve").innerText=reserve.toFixed(2)+" м²";document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что считает калькулятор?", "Площадь облицовки и ориентир по количеству плитки.",
            "Почему есть запас?", "Чтобы учесть подрезку и возможные потери.",
            "Можно ли применять для мозаики?", "Да, для расчета площади.",
            "Как получить точный расчет?", "Нажмите «Получить консультацию».",
            "Подходит ли для любой чаши?", "Да, для предварительной оценки."
        ],
        "benefits": [
            "01", "Быстрый расчет площади",
            "02", "Учет запаса",
            "03", "Подходит для закупки",
            "04", "Единый интерфейс",
        ],
    },
    {
        "file": "kalkulyator-mozaiki.html",
        "title": "Калькулятор мозаики для бассейна",
        "desc": "Рассчитайте площадь чаши и количество листов мозаики.",
        "h1": "Калькулятор мозаики для бассейна",
        "intro": [
            "Введите размеры чаши и размер листа мозаики, чтобы получить ориентир по количеству листов.",
            "Калькулятор показывает площадь и запас 10%.",
            "Это удобный инструмент для предварительной сметы.",
        ],
        "form": """    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина (м)</label><input type="number" id="depth" value="1.5"></div>
    <div class="field"><label>Размер листа (м²)</label><input type="number" id="sheet" value="0.1"></div>""",
        "result": """    <div>Площадь чаши: <b id="area"></b> м²</div>
    <div>Количество листов: <b id="sheets"></b></div>
    <div>Запас 10%: <b id="reserve"></b></div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const H=+document.getElementById("depth").value||0;const sheet=+document.getElementById("sheet").value||0.1;const area=2*(L*H+W*H)+L*W;const reserve=area*1.1;document.getElementById("area").innerText=area.toFixed(2);document.getElementById("sheets").innerText=Math.ceil(reserve/sheet).toLocaleString();document.getElementById("reserve").innerText=reserve.toFixed(2)+" м²";document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Зачем нужен размер листа?", "Чтобы перевести площадь в количество листов.",
            "Учтен ли запас?", "Да, запас 10% включён.",
            "Можно ли считать для стен и дна?", "Да, площадь чаши учитывает обе зоны.",
            "Подходит ли для коммерческих объектов?", "Да, как предварительный ориентир.",
            "Где получить точный подбор?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Предварительная смета",
            "02", "Учет запаса",
            "03", "Простая подача",
            "04", "Единая система",
        ],
    },
    {
        "file": "kalkulyator-gidroizolyacii.html",
        "title": "Калькулятор гидроизоляции бассейна",
        "desc": "Рассчитайте площадь поверхности и расход гидроизоляции для бассейна.",
        "h1": "Калькулятор гидроизоляции бассейна",
        "intro": [
            "Введите размеры чаши и получите площадь поверхности под гидроизоляцию.",
            "Калькулятор применяет ориентир 2 кг на м² на два слоя.",
            "Это помогает подготовить предварительную смету материалов.",
        ],
        "form": """    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Площадь поверхности: <b id="area"></b> м²</div>
    <div>Расход гидроизоляции: <b id="consumption"></b> кг</div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const H=+document.getElementById("depth").value||0;const area=2*(L*H+W*H)+L*W;document.getElementById("area").innerText=area.toFixed(2);document.getElementById("consumption").innerText=(area*2).toFixed(1);document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что учитывает расчет?", "Площадь поверхности и расход на два слоя.",
            "Почему расход в килограммах?", "Так удобнее планировать закупку материалов.",
            "Можно ли применять для сложной чаши?", "Да, как предварительный ориентир.",
            "Как получить точный расчет?", "Нажмите «Получить консультацию».",
            "Нужна ли проверка инженера?", "Да, итог лучше сверять по проекту."
        ],
        "benefits": [
            "01", "Быстрый расход материалов",
            "02", "Подходит для сметы",
            "03", "Простое заполнение",
            "04", "Единый стиль",
        ],
    },
    {
        "file": "kalkulyator-betona-basseina.html",
        "title": "Калькулятор бетона для бассейна",
        "desc": "Рассчитайте объем бетона, массу бетона и арматуру для чаши бассейна.",
        "h1": "Калькулятор бетона для бассейна",
        "intro": [
            "Введите размеры чаши и толщину стен и дна, чтобы получить объем бетона.",
            "Калькулятор помогает оценить массу бетона и ориентир по арматуре.",
            "Результат подходит для первичного сравнения сметы.",
        ],
        "form": """    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина (м)</label><input type="number" id="depth" value="1.5"></div>
    <div class="field"><label>Толщина стен (м)</label><input type="number" id="wall" value="0.2"></div>
    <div class="field"><label>Толщина дна (м)</label><input type="number" id="bottom" value="0.2"></div>""",
        "result": """    <div>Объем бетона: <b id="volume"></b> м³</div>
    <div>Масса бетона: <b id="mass"></b> кг</div>
    <div>Ориентировочная масса арматуры: <b id="rebar"></b> кг</div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const D=+document.getElementById("depth").value||0;const wall=+document.getElementById("wall").value||0;const bottom=+document.getElementById("bottom").value||0;const v=(2*(L*D*wall)+2*(W*D*wall)+L*W*bottom)*1.1;document.getElementById("volume").innerText=v.toFixed(2);document.getElementById("mass").innerText=Math.round(v*2400).toLocaleString();document.getElementById("rebar").innerText=Math.round(v*100).toLocaleString();document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Какой объем бетона показывает калькулятор?", "Ориентир по телу чаши с учетом толщины элементов.",
            "Почему есть коэффициент запаса?", "Чтобы учесть технологические потери.",
            "Можно ли использовать для сметы?", "Да, как предварительный расчет.",
            "Что означает масса арматуры?", "Это ориентировочный расход по объему бетона.",
            "Где получить точный расчет?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Ориентир по материалам",
            "02", "Помогает сравнить предложения",
            "03", "Удобен для сметы",
            "04", "Собран в едином стиле",
        ],
    },
    {
        "file": "kalkulyator-armatury.html",
        "title": "Калькулятор арматуры для бассейна",
        "desc": "Рассчитайте площадь армирования и массу арматуры для бассейна.",
        "h1": "Калькулятор арматуры для бассейна",
        "intro": [
            "Введите размеры чаши и получите ориентир по площади армирования.",
            "Калькулятор показывает массу арматуры по нормативу 15–20 кг/м².",
            "Это удобно для предварительной оценки конструктивной части.",
        ],
        "form": """    <div class="field"><label>Длина (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Площадь армирования: <b id="area"></b> м²</div>
    <div>Ориентировочная масса арматуры: <b id="mass"></b> кг</div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const D=+document.getElementById("depth").value||0;const area=2*(L*D+W*D)+L*W;document.getElementById("area").innerText=area.toFixed(2);document.getElementById("mass").innerText=Math.round(area*18).toLocaleString();document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что показывает калькулятор?", "Площадь армирования и примерную массу арматуры.",
            "Какой норматив применен?", "15–20 кг на м², усредненный ориентир.",
            "Можно ли считать для любой чаши?", "Да, как предварительную оценку.",
            "Нужен ли точный проект?", "Да, для окончательного подбора.",
            "Где получить помощь?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Расчет площади",
            "02", "Удобно для конструкций",
            "03", "Помогает оценить объем работ",
            "04", "Единый UI",
        ],
    },
    {
        "file": "kalkulyator-zemlyanyh-rabot.html",
        "title": "Калькулятор земляных работ для бассейна",
        "desc": "Рассчитайте объем котлована и объем грунта к вывозу для бассейна.",
        "h1": "Калькулятор земляных работ",
        "intro": [
            "Введите размеры чаши, чтобы получить объем котлована и грунта к вывозу.",
            "Калькулятор учитывает технологический запас по периметру.",
            "Результат помогает планировать подготовку участка.",
        ],
        "form": """    <div class="field"><label>Длина чаши (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина чаши (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Глубина чаши (м)</label><input type="number" id="depth" value="1.5"></div>""",
        "result": """    <div>Объем котлована: <b id="pit"></b> м³</div>
    <div>Объем грунта к вывозу: <b id="soil"></b> м³</div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const D=+document.getElementById("depth").value||0;const pit=(L+1)*(W+1)*D;document.getElementById("pit").innerText=pit.toFixed(2);document.getElementById("soil").innerText=(pit*1.05).toFixed(2);document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что учитывает запас?", "Технологический отступ по периметру.",
            "Зачем считать грунт отдельно?", "Чтобы понимать вывоз и подготовку участка.",
            "Можно ли использовать для предварительной сметы?", "Да.",
            "Когда нужен точный проект?", "Перед началом работ.",
            "Где получить консультацию?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Оценка котлована",
            "02", "Планирование грунта",
            "03", "Помогает подготовить участок",
            "04", "Единый стиль",
        ],
    },
    {
        "file": "kalkulyator-stoimosti-pavilona.html",
        "title": "Калькулятор стоимости павильона",
        "desc": "Рассчитайте площадь павильона и диапазон стоимости для бассейна.",
        "h1": "Калькулятор стоимости павильона",
        "intro": [
            "Введите размеры бассейна и получите площадь павильона и ориентир по стоимости.",
            "Калькулятор использует диапазон базовой ставки за квадратный метр.",
            "Результат помогает сравнить варианты до заказа.",
        ],
        "form": """    <div class="field"><label>Длина бассейна (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина бассейна (м)</label><input type="number" id="width" value="4"></div>""",
        "result": """    <div>Площадь павильона: <b id="area"></b> м²</div>
    <div>Диапазон стоимости: <b id="cost"></b></div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const area=L*W;document.getElementById("area").innerText=area.toFixed(2);document.getElementById("cost").innerText=(area*250).toFixed(0)+"–"+(area*600).toFixed(0)+" USD";document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что показывает расчет?", "Площадь и ориентир стоимости павильона.",
            "Почему есть диапазон?", "Цена зависит от конструкции и материалов.",
            "Можно ли применять для заказа?", "Да, как предварительную оценку.",
            "Как уточнить бюджет?", "Через консультацию инженера.",
            "Где получить консультацию?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Быстрый ориентир",
            "02", "Помогает сравнить варианты",
            "03", "Удобен для заказа",
            "04", "Единый интерфейс",
        ],
    },
    {
        "file": "kalkulyator-osushitelya.html",
        "title": "Калькулятор осушителя воздуха",
        "desc": "Рассчитайте площадь зеркала воды и рекомендуемую производительность осушителя.",
        "h1": "Калькулятор осушителя воздуха",
        "intro": [
            "Введите размеры бассейна и температуру воды, чтобы получить ориентир по осушителю.",
            "Калькулятор показывает площадь зеркала воды и диапазон производительности.",
            "Результат помогает подобрать оборудование для помещений с бассейном.",
        ],
        "form": """    <div class="field"><label>Длина бассейна (м)</label><input type="number" id="length" value="8"></div>
    <div class="field"><label>Ширина бассейна (м)</label><input type="number" id="width" value="4"></div>
    <div class="field"><label>Температура воды (°C)</label><input type="number" id="temp" value="28"></div>""",
        "result": """    <div>Площадь зеркала воды: <b id="area"></b> м²</div>
    <div>Рекомендуемая производительность: <b id="cap"></b></div>""",
        "js": """function calculate(){const L=+document.getElementById("length").value||0;const W=+document.getElementById("width").value||0;const T=+document.getElementById("temp").value||0;const area=L*W;const cap=(area*1.5).toFixed(1)+"–"+(area*2.5).toFixed(1)+" л/час";document.getElementById("area").innerText=area.toFixed(2);document.getElementById("cap").innerText=cap;document.getElementById("result").classList.remove("hidden");}function openLead(){location.href="/kalkulyatori/teh-zadanie.html";}""",
        "faq": [
            "Что показывает осушитель?", "Площадь зеркала воды и производительность.",
            "Почему есть диапазон?", "Потому что на расчет влияет температура и режим эксплуатации.",
            "Подходит ли для помещений?", "Да.",
            "Можно ли уточнить подбор?", "Да, через инженера.",
            "Как получить консультацию?", "Нажмите «Получить консультацию»."
        ],
        "benefits": [
            "01", "Подбор для помещений",
            "02", "Быстрый ориентир",
            "03", "Связан с проектированием",
            "04", "Единый стиль",
        ],
    },
]

page_template = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="keywords" content="калькуляторы для бассейнов, бассейн, расчет бассейна, инженерия бассейна">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="https://alpool.ru/kalkulyatori/{file}">
  <meta property="og:site_name" content="АЛ Пулс">
  <link rel="stylesheet" href="kalkulyatori-ui.css">
</head>
<body>
<div class="container">
  <h1>{h1}</h1>
  <p class="subtitle">{intro0}</p>
  <p>{intro1}</p>
  <p>{intro2}</p>
  <div class="top-meta"><span class="badge">Калькулятор бассейнов</span><span class="badge">Предварительный расчет</span></div>
  <div class="notice"><strong>Что важно:</strong> данные помогают быстро оценить параметры проекта и подготовиться к консультации.</div>
  <form id="calcForm">
{form}
    <button type="button" onclick="calculate()">Рассчитать</button>
  </form>
  <div id="result" class="result hidden">
{result}
    <div class="notice">* расчёт предварительный, итог уточняется инженером</div>
    <button type="button" onclick="openLead()">Получить консультацию</button>
  </div>
  <section class="post cta-section cta-light" aria-labelledby="cta-title">
    <div>
      <p class="section-label">CTA</p>
      <h2 id="cta-title">Нужен точный расчет?</h2>
      <p>Заполните заявку, и мы поможем уточнить параметры и подготовить точный расчет по вашему бассейну.</p>
    </div>
    <ul class="actions special"><li><a href="/kalkulyatori/teh-zadanie.html" class="button large">Получить консультацию</a></li></ul>
  </section>
  <section class="content-section">
    <p class="section-label">FAQ</p>
    <h2>Частые вопросы</h2>
    <dl>
{faq}
    </dl>
  </section>
  <section class="content-section">
    <p class="section-label">Преимущества</p>
    <h2>Почему удобно работать с калькуляторами АЛ Пулс</h2>
    <div class="trust-grid">
{benefits}
    </div>
  </section>
  <section class="content-section">
    <p class="section-label">Калькуляторы</p>
    <h2>Другие расчеты</h2>
    <div class="seo-link-grid">
{links}
    </div>
  </section>
</div>
{contact}
<script>
{js}
</script>
</body>
</html>"""

for p in PAGES:
    html = page_template.format(
        title=p["title"],
        desc=p["desc"],
        file=p["file"],
        h1=p["h1"],
        intro0=p["intro"][0],
        intro1=p["intro"][1],
        intro2=p["intro"][2],
        form=p["form"],
        result=p["result"],
        faq=faq_html(p["faq"]),
        benefits=benefits_html(p["benefits"]),
        links=links_html(p["file"]),
        contact=CONTACT,
        js=p["js"],
    )
    (CALC_DIR / p["file"]).write_text(html, encoding="utf-8")

catalog_links = "\n".join(
    f'    <a href="/kalkulyatori/{p["file"]}">{p["title"]}</a>' for p in PAGES
)
catalog_html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Калькуляторы для бассейнов</title>
  <meta name="description" content="Каталог калькуляторов для бассейнов: объем, фильтрация, теплообменник, тепловой насос, подогрев, химия, плитка, гидроизоляция и другие расчеты.">
  <link rel="stylesheet" href="/kalkulyatori/kalkulyatori-ui.css">
</head>
<body>
<div class="container">
  <h1>Калькуляторы для бассейнов</h1>
  <p class="subtitle">Единый набор инструментов для предварительных инженерных расчетов по бассейнам.</p>
  <div class="notice">Выберите калькулятор и получите ориентир для сметы, проектирования или консультации инженера.</div>
  <div class="seo-link-grid">
{catalog_links}
  </div>
</div>
</body>
</html>"""
(CAT_DIR / "index.html").write_text(catalog_html, encoding="utf-8")

print(f"Generated {len(PAGES)} calculator pages and catalog.")
