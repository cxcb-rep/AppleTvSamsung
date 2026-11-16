(function () {
  "use strict";

  var platform = window.tizen && window.tizen.application;
  var home = document.getElementById("home");
  var gallery = document.getElementById("gallery");
  var artwork = document.getElementById("artwork");
  var notice = document.getElementById("notice");
  var appList = document.getElementById("applications");
  var galleryStatus = document.getElementById("gallery-status");
  var allApps = document.getElementById("all-apps");
  var back = document.getElementById("back");
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".tile"));
  var names = {
    tv: /^apple\s*tv(?:\+)?$/i,
    arcade: /^(?:apple\s+)?arcade$/i,
    photos: /^(?:photos|gallery|фото|галерея)$/i,
    facetime: /^facetime$/i,
    music: /^apple\s*music$/i,
    fitness: /^(?:apple\s+)?fitness\+?$/i
  };
  var lastTile = tiles[0];
  var noticeTimeout;
  var soundFiles = window.appleTvSamsungSoundFiles || {};
  var sounds = {};
  Object.keys(soundFiles).forEach(function (name) {
    var player = new Audio(soundFiles[name]);
    player.preload = "auto";
    sounds[name] = player;
  });

  function playSound(name) {
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
    home.classList.add("has-artwork");
  }

  artwork.addEventListener("load", showArtwork);
  if (artwork.complete && artwork.naturalWidth) showArtwork();

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
    tile.addEventListener("focus", function () { lastTile = tile; });
    tile.addEventListener("click", function () {
      playSound("open");
      var pattern = names[tile.getAttribute("data-app")];
      readApps(function (apps) {
        if (!gallery.hidden) return;
        var match = apps && apps.find(function (app) { return pattern.test(app.name.trim()); });
        if (match) launch(match);
        else feedback(platform ? "На телевизоре нет подходящего приложения." : "Запуск приложений доступен в версии для Samsung TV.");
      });
    });
  });

  function showGallery() {
    playSound("open");
    notice.hidden = true;
    home.hidden = true;
    gallery.hidden = false;
    appList.textContent = "";
    galleryStatus.textContent = "Читаю список приложений…";
    back.focus();
    readApps(function (apps) {
      if (gallery.hidden) return;
      if (!apps || !apps.length) {
        galleryStatus.textContent = platform ? "Список приложений недоступен." : "Список появляется при запуске на Samsung TV.";
        return;
      }
      galleryStatus.textContent = "";
      apps.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (app) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = app.name;
        button.addEventListener("click", function () {
          playSound("open");
          launch(app);
        });
        appList.appendChild(button);
      });
      if (document.activeElement === back) appList.firstElementChild.focus();
    });
  }

  function showHome() {
    playSound("back");
    gallery.hidden = true;
    home.hidden = false;
    lastTile.focus();
  }

  allApps.addEventListener("click", showGallery);
  back.addEventListener("click", showHome);

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
      if (!gallery.hidden) showHome();
      else if (!notice.hidden) notice.hidden = true;
      else if (platform) platform.getCurrentApplication().exit();
    } else if (key === 13 && event.target.tagName === "BUTTON") {
      event.preventDefault();
      if (!event.repeat) event.target.click();
    } else if (key >= 37 && key <= 40) {
      event.preventDefault();
      if (!gallery.hidden) {
        var previous = document.activeElement;
        moveInGallery(key);
        if (document.activeElement !== previous) playSound("focus");
        return;
      }
      var index = tiles.indexOf(document.activeElement);
      if (key === 40 && index !== -1) showGallery();
      else if (key === 38 && index === -1) lastTile.focus();
      else if (key === 37 && index > 0) {
        tiles[index - 1].focus();
        playSound("focus");
      } else if (key === 39 && index >= 0 && index < tiles.length - 1) {
        tiles[index + 1].focus();
        playSound("focus");
      }
    }
  });

  lastTile.focus();
}());
