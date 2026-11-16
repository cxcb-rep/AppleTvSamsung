(function () {
  "use strict";

  var root = document.getElementById("settings");
  var heading = document.getElementById("settings-title");
  var parentLabel = document.getElementById("settings-parent");
  var back = document.getElementById("settings-back");
  var list = document.getElementById("settings-list");
  var detail = document.getElementById("settings-detail");
  var previewIcon = document.getElementById("settings-symbol");
  var previewTitle = document.getElementById("settings-description-title");
  var previewText = document.getElementById("settings-description");
  var key = "appleTvSamsung.settings";
  var definitions = {
    navigationClicks: { label: "Щелчки навигации", values: [true, false], labels: ["Вкл.", "Выкл."], description: "Звук при перемещении фокуса между плитками и пунктами меню." },
    transitionSounds: { label: "Звуковые эффекты", values: [true, false], labels: ["Вкл.", "Выкл."], description: "Звуки при открытии разделов и возврате." },
    artwork: { label: "Фон Sugar", values: [true, false], labels: ["Вкл.", "Выкл."], description: "Показывает кадр Sugar на главном экране. При выключении используется градиент." },
    theme: { label: "Оформление меню", values: ["dark", "light"], labels: ["Тёмное", "Светлое"], description: "Меняет оформление настроек и списка приложений." },
    homeOnStart: { label: "Экран при запуске", values: [true, false], labels: ["Главный экран", "Все приложения"], description: "Выбирает, какой экран откроется первым." },
    alphabetical: { label: "Сортировка приложений", values: [true, false], labels: ["По алфавиту", "Порядок ТВ"], description: "Меняет порядок плиток в списке приложений." },
    wrapFocus: { label: "Навигация по кругу", values: [false, true], labels: ["Выкл.", "Вкл."], description: "Позволяет перейти с последней плитки на первую и обратно." },
    largeText: { label: "Крупный текст", values: [false, true], labels: ["Выкл.", "Вкл."], description: "Увеличивает текст в настройках и списке приложений." },
    strongFocus: { label: "Контрастная рамка", values: [false, true], labels: ["Выкл.", "Вкл."], description: "Выделяет выбранную кнопку жёлтой рамкой." },
    reduceMotion: { label: "Уменьшение движения", values: [false, true], labels: ["Выкл.", "Вкл."], description: "Отключает анимацию фокуса, прокрутки полки и переходов приложения." }
  };

  function defaults() {
    var result = {};
    Object.keys(definitions).forEach(function (name) { result[name] = definitions[name].values[0]; });
    return result;
  }

  function restore() {
    var result = defaults();
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      Object.keys(definitions).forEach(function (name) {
        if (saved && definitions[name].values.indexOf(saved[name]) !== -1) result[name] = saved[name];
      });
    } catch (error) {
      // The menu remains available when storage is disabled.
    }
    return result;
  }

  var preferences = restore();

  function apply() {
    var html = document.documentElement;
    html.setAttribute("data-menu-theme", preferences.theme);
    html.setAttribute("data-large-text", preferences.largeText);
    html.setAttribute("data-strong-focus", preferences.strongFocus);
    html.setAttribute("data-reduce-motion", preferences.reduceMotion);
    document.dispatchEvent(new Event("apple-settings-change"));
  }

  function save() {
    try { localStorage.setItem(key, JSON.stringify(preferences)); }
    catch (error) { /* Keep the current session's changes. */ }
    apply();
  }

  function option(name) {
    return { label: definitions[name].label, description: definitions[name].description, option: name };
  }

  function info(label, description, value) {
    return { label: label, description: description, value: value };
  }

  function page(label, icon, tone, description, rows) {
    return { label: label, icon: icon, tone: tone, description: description, rows: rows };
  }

  var picture = "На Samsung откройте Настройки → Изображение.";
  var audio = "На Samsung откройте Настройки → Звук.";
  var general = "На Samsung откройте Настройки → Общие.";
  var accessibility = "На Samsung откройте Настройки → Общие → Специальные возможности.";
  var updates = "На Samsung откройте Настройки → Поддержка → Обновление ПО.";
  var airplay = "На поддерживаемых моделях Samsung откройте Настройки → Общие → Настройки Apple AirPlay.";
  var network = "На Samsung откройте Настройки → Общие → Сеть.";
  var accounts = "Учётные записи Apple и подписки управляются в соответствующем приложении Apple.";
  var nativeTv = "Эта функция относится к системному меню телевизора.";
  var privacy = page("Конфиденциальность и безопасность", "◇", "blue", "Разрешения, аналитика и данные приложения.", [
    info("Геолокация и отслеживание", "AppleTvSamsung не запрашивает геолокацию."),
    info("Камера, микрофон и фото", "AppleTvSamsung не запрашивает доступ к камере, микрофону или фотографиям."),
    info("Аналитика и улучшения", "AppleTvSamsung не отправляет данные аналитики."),
    info("Данные приложения", "Параметры AppleTvSamsung хранятся локально на этом устройстве.")
  ]);
  var about = page("Об устройстве", "ⓘ", "blue", "Сведения о приложении и среде запуска.", [
    info("AppleTvSamsung", "Версия приложения, установленная на устройстве.", "0.3.0"),
    info("Платформа", "Этот экран показывает среду, в которой открыт проект.", function () { return window.tizen ? "Samsung Tizen" : "Браузер"; }),
    info("Экран", "Размер экрана, который сообщает веб-движок, в логических пикселях.", function () { return screen.width + " × " + screen.height; }),
    info("Язык устройства", "Языковой код, который сообщает веб-движок.", function () { return navigator.language || "—"; }),
    info("Модель и версия ПО", "На Samsung откройте Настройки → Поддержка → Об этом телевизоре.")
  ]);
  var reset = page("Сброс настроек приложения", "↺", "red", "Возвращает параметры AppleTvSamsung к исходным значениям.", [
    { label: "Сбросить настройки приложения", description: "Будут сброшены звуки, оформление и параметры навигации.", reset: true }
  ]);
  var app = page("AppleTvSamsung", "▣", "blue", "Звук, оформление, управление и данные этого приложения.", [
    option("navigationClicks"), option("transitionSounds"), option("artwork"), option("theme"),
    option("homeOnStart"), option("alphabetical"), option("wrapFocus"), option("largeText"),
    option("strongFocus"), option("reduceMotion"), about, reset
  ]);
  var main = page("Настройки", "⚙", "", "Параметры изображения, звука, управления и приложений.", [
    page("Основные", "⚙", "", "Заставка, оформление, язык, время и конфиденциальность.", [
      about,
      info("Заставка", "На Samsung заставка и автоматическое выключение зависят от модели и режима энергосбережения."),
      option("theme"), option("artwork"),
      info("Сон после", general + " Найдите таймер сна или отключение при бездействии."),
      info("Язык и регион", general + " Выберите системные параметры языка."),
      info("Дата и время", general + " Откройте параметры времени."),
      info("Хранилище", "Доступное место для приложений можно проверить в меню Apps телевизора."),
      info("Ограничения", "Родительский контроль настраивается в системе Samsung или в самом сервисе."),
      privacy
    ]),
    app,
    page("Профили и учётные записи", "♟", "blue", "Профили, подписки и вход в сервисы Apple.", [
      info("Профиль по умолчанию", accounts), info("Добавить профиль", accounts),
      info("Учётная запись Apple", accounts), info("Подписки и покупки", accounts),
      info("Семейный доступ", accounts), info("Единый вход", accounts)
    ]),
    page("Видео и аудио", "▶", "red", "Параметры изображения, звука и звуков интерфейса.", [
      info("Формат видео и HDR", picture), info("Согласование диапазона и частоты кадров", picture),
      info("Цветовой баланс и калибровка", picture), info("Подключение HDMI", "На Samsung проверьте параметры HDMI выбранного источника."),
      info("Выход аудио", audio), info("Формат аудио и Dolby Atmos", audio),
      info("Уменьшение громких звуков", audio), option("navigationClicks"), option("transitionSounds"),
      info("Язык звука и субтитры", "Дорожки и субтитры выбираются в проигрывателе или приложении, которое воспроизводит видео.")
    ]),
    page("Пульты и устройства", "▤", "violet", "Управление с пульта, Bluetooth и внешние устройства.", [
      option("wrapFocus"), info("Кнопки пульта", "Стрелки перемещают фокус. OK открывает пункт. «Назад» возвращает на предыдущий экран."),
      info("Bluetooth", "Сопряжение наушников и других аксессуаров выполняется в системном меню Samsung."),
      info("Пульты и контроллеры", general + " Найдите параметры внешних устройств."),
      info("Управление телевизором и ресивером", "Параметры HDMI-CEC у Samsung называются Anynet+."),
      info("Регулировка громкости", "Кнопки громкости регулируют системный звук Samsung.")
    ]),
    page("Приложения", "▦", "blue", "Параметры списка и отдельных приложений.", [
      option("alphabetical"), app,
      info("Автоматическое обновление", "Автообновление установленных приложений настраивается в Apps телевизора."),
      info("Apple TV, Музыка и Фото", "Параметры каждого сервиса открываются внутри соответствующего приложения.")
    ]),
    page("AirPlay и Apple Home", "△", "green", "Трансляция на телевизор и управление доступом.", [
      info("AirPlay", airplay), info("Код и доступ", airplay),
      info("Субтитры AirPlay", airplay), info("Сопряжённые устройства", airplay),
      info("Дом и комната", "Настройки Apple Home доступны в приложении «Дом» на поддерживаемом устройстве Apple.")
    ]),
    page("Siri и поиск", "✦", "violet", "Голосовой помощник, диктовка и поиск.", [
      info("Siri", "Siri относится к системе Apple TV. Голосовой помощник Samsung настраивается в меню телевизора, если доступен."),
      info("Диктовка и распознавание голоса", nativeTv),
      info("Поиск", "Поиск по каталогу доступен внутри приложения нужного сервиса.")
    ]),
    page("Универсальный доступ", "♿", "blue", "Читаемость, визуальное выделение и системные функции доступности.", [
      option("largeText"), option("strongFocus"), option("reduceMotion"),
      info("VoiceOver и голосовые подсказки", accessibility),
      info("Увеличение, контраст и фильтры", accessibility),
      info("Субтитры и аудиоописание", accessibility),
      info("Управление переключателями и быстрые команды", accessibility)
    ]),
    page("Сеть", "⌁", "blue", "Состояние подключения и параметры Wi-Fi.", [
      info("Состояние подключения", "Это состояние сетевого интерфейса по данным браузера.", function () { return navigator.onLine ? "Подключено" : "Нет сети"; }),
      info("Wi-Fi и Ethernet", network), info("IP, DNS и прокси", network),
      info("Проверка сети", network + " Выберите «Состояние сети».")
    ]),
    page("Система", "◉", "", "Версии, обновление и обслуживание устройства.", [
      about, info("Обновление ПО", updates), info("Перезапуск", nativeTv),
      info("Сброс телевизора", "Системный сброс доступен в настройках Samsung и удаляет системные параметры."),
      reset
    ]),
    page("Выкл. и таймер сна", "⏻", "", "Управление питанием выполняется с пульта Samsung.", [
      info("Выключение", "Нажмите кнопку питания на пульте Samsung."),
      info("Таймер сна", general + " Найдите настройки таймера сна.")
    ])
  ]);

  var stack = [];
  var close;

  function showPreview(item) {
    previewIcon.textContent = item.icon || "ⓘ";
    previewIcon.setAttribute("data-tone", item.tone || "");
    previewTitle.textContent = item.label;
    previewText.textContent = item.description;
  }

  function valueOf(row) {
    if (row.option) {
      var setting = definitions[row.option];
      return setting.labels[setting.values.indexOf(preferences[row.option])];
    }
    return typeof row.value === "function" ? row.value() : row.value || "›";
  }

  function render() {
    var entry = stack[stack.length - 1];
    var current = entry.page;
    var parent = stack[stack.length - 2];
    parentLabel.hidden = !parent;
    parentLabel.textContent = parent ? parent.page.label : "";
    heading.textContent = current.label;
    list.textContent = "";
    list.hidden = !current.rows;
    detail.hidden = !!current.rows;
    detail.textContent = current.rows ? "" : current.description;
    previewTitle.hidden = !current.rows;
    previewText.hidden = !current.rows;
    showPreview(current);
    if (!current.rows) {
      back.focus();
      return;
    }

    current.rows.forEach(function (row, index) {
      var button = document.createElement("button");
      var label = document.createElement("span");
      var value = document.createElement("span");
      button.type = "button";
      button.className = "setting-row";
      label.className = "setting-label";
      if (row.icon) {
        var icon = document.createElement("span");
        icon.className = "setting-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("data-tone", row.tone || "");
        icon.textContent = row.icon;
        label.appendChild(icon);
      }
      label.appendChild(document.createTextNode(row.label));
      value.className = "setting-value";
      value.textContent = valueOf(row);
      if (row.option) {
        button.setAttribute("data-option", row.option);
        if (typeof preferences[row.option] === "boolean") button.setAttribute("aria-pressed", preferences[row.option]);
      }
      button.appendChild(label);
      button.appendChild(value);
      button.onfocus = function () {
        entry.index = index;
        showPreview(row);
      };
      button.onclick = function () {
        if (row.option) {
          var choices = definitions[row.option].values;
          preferences[row.option] = choices[(choices.indexOf(preferences[row.option]) + 1) % choices.length];
          save();
          value.textContent = valueOf(row);
          if (typeof preferences[row.option] === "boolean") button.setAttribute("aria-pressed", preferences[row.option]);
        } else if (row.reset) {
          preferences = defaults();
          save();
          stack.push({page: info("Настройки сброшены", "Восстановлены значения AppleTvSamsung по умолчанию."), index: 0});
          render();
        } else {
          stack.push({page: row, index: 0});
          render();
        }
      };
      list.appendChild(button);
    });
    (list.children[entry.index] || back).focus();
  }

  function goBack() {
    if (stack.length > 1) {
      stack.pop();
      render();
    } else {
      root.hidden = true;
      close();
    }
  }

  back.onclick = goBack;
  window.appleTvSamsungSettings = {
    get: function (name) { return preferences[name]; },
    open: function (onClose) {
      close = onClose;
      stack = [{page: main, index: 0}];
      root.hidden = false;
      render();
    },
    goBack: goBack,
    move: function (direction) {
      var buttons = [back].concat(Array.prototype.slice.call(list.children));
      var index = buttons.indexOf(document.activeElement);
      var next = buttons[index + direction];
      if (next) next.focus();
      return !!next;
    }
  };

  apply();
}());
