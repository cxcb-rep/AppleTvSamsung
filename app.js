(function () {
  "use strict";

  var platform = window.tizen && window.tizen.application;
  var home = document.getElementById("home");
  var gallery = document.getElementById("gallery");
  var settingsScreen = document.getElementById("settings");
  var callScreen = document.getElementById("lan-call");
  var lanCall = window.appleTvSamsungLanCall;
  var settings = window.appleTvSamsungSettings;
  var artwork = document.getElementById("artwork");
  var clock = document.getElementById("home-clock");
  var preview = document.getElementById("hero-preview");
  var previewLabel = document.getElementById("hero-preview-label");
  var notice = document.getElementById("notice");
  var appList = document.getElementById("applications");
  var galleryStatus = document.getElementById("gallery-status");
  var allApps = document.getElementById("all-apps");
  var homeSettings = document.getElementById("home-settings");
  var gallerySettings = document.getElementById("gallery-settings");
  var back = document.getElementById("back");
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".tile"));
  var topRow = tiles.filter(function (tile) { return tile.parentNode.classList.contains("favorites"); });
  var bottomRow = tiles.filter(function (tile) { return tile.parentNode.classList.contains("utilities"); });
  var names = {
    tv: /^apple\s*tv(?:\+)?$/i,
    arcade: /^(?:apple\s+)?arcade$/i,
    photos: /^(?:photos|gallery|фото|галерея)$/i,
    music: /^apple\s*music$/i,
    fitness: /^(?:apple\s+)?fitness\+?$/i,
    localVideo: /^(?:my\s+video|мо[её]\s+видео)$/i,
    youtube: /^youtube$/i,
    netflix: /^netflix$/i,
    browser: /^(?:internet|web browser|browser|интернет|браузер)$/i
  };
  var lastTile = tiles[0];
  var noticeTimeout;
  var galleryRequest = 0;
  var galleryApps;
  var soundFiles = window.appleTvSamsungSoundFiles || {};
  var sounds = {};
  Object.keys(soundFiles).forEach(function (name) {
    var player = new Audio(soundFiles[name]);
    player.preload = "auto";
    sounds[name] = player;
  });

  function playSound(name) {
    if (!settings.get(name === "focus" ? "navigationClicks" : "transitionSounds")) return;
    var player = sounds[name];
    if (!player) return;
    try {
      player.currentTime = 0;
      var playback = player.play();
      if (playback) playback.catch(function () {});
    } catch (error) {
      // Audio playback should never block navigation.
    }
  }

  function showArtwork() {
    home.classList.toggle("has-artwork", settings.get("artwork") && !!artwork.naturalWidth);
  }

  artwork.addEventListener("load", showArtwork);
  document.addEventListener("apple-settings-change", showArtwork);
  showArtwork();

  var timeFormat = new Intl.DateTimeFormat("ru-RU", {hour: "2-digit", minute: "2-digit"});
  function updateClock() {
    var now = new Date();
    clock.textContent = timeFormat.format(now);
    clock.dateTime = now.toISOString();
  }
  updateClock();
  window.setInterval(updateClock, 10000);

  function setActiveTile(tile) {
    lastTile = tile;
    home.classList.toggle("apps-scrolled", bottomRow.indexOf(tile) !== -1);
  }

  function focusTile(tile) {
    setActiveTile(tile);
    tile.focus({preventScroll: true});
  }

  function togglePreview() {
    var active = home.classList.toggle("previewing");
    preview.setAttribute("aria-expanded", active);
    previewLabel.textContent = active ? "Вернуться к приложениям" : "На весь экран";
    playSound(active ? "open" : "back");
    if (active) preview.focus({preventScroll: true});
    else focusTile(lastTile);
  }
  preview.addEventListener("click", togglePreview);

  function feedback(message) {
    if (!gallery.hidden) {
      galleryStatus.textContent = message;
      return;
    }
    clearTimeout(noticeTimeout);
    notice.textContent = message;
    notice.hidden = false;
    noticeTimeout = setTimeout(function () { notice.hidden = true; }, 4500);
  }

  function readApps(done) {
    if (!platform || typeof platform.getAppsInfo !== "function") {
      done(null);
      return;
    }
    function unavailable() { done(null); }
    try {
      var currentId = platform.getCurrentApplication().appInfo.id;
      platform.getAppsInfo(function (apps) {
        done(apps.filter(function (app) {
          return app.id !== currentId && app.name && app.show !== false;
        }));
      }, unavailable);
    } catch (error) {
      unavailable();
    }
  }

  function launch(app) {
    function unavailable() { feedback("Телевизор не разрешил открыть «" + app.name + "»."); }
    try {
      if (typeof platform.launch === "function") {
        platform.launch(app.id, undefined, unavailable);
      } else {
        var control = new window.tizen.ApplicationControl("http://tizen.org/appcontrol/operation/default");
        platform.launchAppControl(control, app.id, undefined, unavailable);
      }
    } catch (error) {
      unavailable();
    }
  }

  tiles.forEach(function (tile) {
    tile.addEventListener("focus", function () { setActiveTile(tile); });
    var pattern = names[tile.getAttribute("data-app")];
    if (!pattern) return;
    tile.addEventListener("click", function () {
      playSound("open");
      readApps(function (apps) {
        if (home.hidden) return;
        var match = apps && apps.find(function (app) { return pattern.test(app.name.trim()); });
        if (match) launch(match);
        else feedback(platform ? "На телевизоре нет подходящего приложения." : "Запуск приложений доступен в версии для Samsung TV.");
      });
    });
  });

  function showGallery(playOpeningSound) {
    if (playOpeningSound !== false) playSound("open");
    notice.hidden = true;
    home.hidden = true;
    gallery.hidden = false;
    appList.textContent = "";
    galleryApps = null;
    galleryStatus.textContent = "Читаю список приложений…";
    back.focus();
    var request = ++galleryRequest;
    readApps(function (apps) {
      if (request !== galleryRequest || (gallery.hidden && settingsScreen.hidden)) return;
      if (!apps || !apps.length) {
        galleryStatus.textContent = platform ? "Список приложений недоступен." : "Список появляется при запуске на Samsung TV.";
        if (document.activeElement === back) gallerySettings.focus();
        return;
      }
      galleryStatus.textContent = "";
      galleryApps = apps;
      renderGallery();
      if (document.activeElement === back) appList.firstElementChild.focus();
    });
  }

  function renderGallery() {
    appList.textContent = "";
    var apps = galleryApps.slice();
    if (settings.get("alphabetical")) apps.sort(function (a, b) { return a.name.localeCompare(b.name); });
    apps.forEach(function (app) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = app.name;
      button.addEventListener("click", function () {
        playSound("open");
        launch(app);
      });
      appList.appendChild(button);
    });
  }

  function showHome() {
    playSound("back");
    gallery.hidden = true;
    home.hidden = false;
    focusTile(lastTile);
  }

  allApps.addEventListener("click", showGallery);
  back.addEventListener("click", showHome);
  document.querySelector('[data-app="facetime"]').addEventListener("click", function (event) {
    var origin = event.currentTarget;
    playSound("open");
    notice.hidden = true;
    home.hidden = true;
    lanCall.open(function () {
      playSound("back");
      home.hidden = false;
      focusTile(origin);
    });
  });

  function showSettings(event) {
    var origin = event.currentTarget;
    var previousScreen = gallery.hidden ? home : gallery;
    playSound("open");
    previousScreen.hidden = true;
    settings.open(function () {
      previousScreen.hidden = false;
      if (previousScreen === gallery && galleryApps) renderGallery();
      origin.focus({preventScroll: true});
    });
  }

  homeSettings.addEventListener("click", showSettings);
  gallerySettings.addEventListener("click", showSettings);
  settingsScreen.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (button) playSound(button.id === "settings-back" ? "back" : "open");
  }, true);

  function moveOnShelf(key) {
    if (home.classList.contains("previewing")) {
      if (key === 40) togglePreview();
      return;
    }
    var current = document.activeElement;
    var isBottom = bottomRow.indexOf(current) !== -1;
    var row = isBottom ? bottomRow : topRow;
    var index = row.indexOf(current);
    if (index < 0) return;
    var next;
    if (key === 38 || key === 40) {
      if (key === 38 && !isBottom) {
        togglePreview();
        return;
      }
      if (key === 40 && isBottom) return;
      next = (isBottom ? topRow : bottomRow)[index];
    } else {
      var column = index + (key === 37 ? -1 : 1);
      if (settings.get("wrapFocus")) column = (column + row.length) % row.length;
      next = row[column];
    }
    if (!next) return;
    focusTile(next);
    playSound("focus");
  }

  function moveInGallery(key) {
    var buttons = Array.prototype.slice.call(gallery.querySelectorAll("button"));
    var current = document.activeElement;
    var source = current.getBoundingClientRect();
    var horizontal = key === 37 || key === 39;
    var sign = key === 37 || key === 38 ? -1 : 1;
    var best = null;
    var shortest = Infinity;
    buttons.forEach(function (button) {
      if (button === current) return;
      var box = button.getBoundingClientRect();
      var dx = box.left + box.width / 2 - (source.left + source.width / 2);
      var dy = box.top + box.height / 2 - (source.top + source.height / 2);
      var distance = (horizontal ? dx : dy) * sign;
      if (distance < 2) return;
      var score = distance + Math.abs(horizontal ? dy : dx) * 4;
      if (score < shortest) {
        best = button;
        shortest = score;
      }
    });
    if (best) best.focus();
  }

  document.addEventListener("keydown", function (event) {
    var key = event.keyCode;
    if (key === 10009 || key === 27) {
      event.preventDefault();
      if (!settingsScreen.hidden) {
        playSound("back");
        settings.goBack();
      } else if (!callScreen.hidden) lanCall.close();
      else if (!gallery.hidden) showHome();
      else if (home.classList.contains("previewing")) togglePreview();
      else if (!notice.hidden) notice.hidden = true;
      else if (platform) platform.getCurrentApplication().exit();
    } else if (key === 13 && event.target.tagName === "BUTTON") {
      event.preventDefault();
      if (!event.repeat) event.target.click();
    } else if (key >= 37 && key <= 40) {
      event.preventDefault();
      if (!callScreen.hidden) {
        lanCall.move(key);
        return;
      }
      if (!settingsScreen.hidden) {
        if (key === 37 && !event.repeat) document.getElementById("settings-back").click();
        else if (key === 39 && !event.repeat && document.activeElement.classList.contains("setting-row")) {
          document.activeElement.click();
        } else if ((key === 38 || key === 40) && settings.move(key === 38 ? -1 : 1)) {
          playSound("focus");
        }
        return;
      }
      if (!gallery.hidden) {
        var previous = document.activeElement;
        moveInGallery(key);
        if (document.activeElement !== previous) playSound("focus");
        return;
      }
      moveOnShelf(key);
    }
  });

  if (settings.get("homeOnStart")) focusTile(lastTile);
  else showGallery(false);
}());
