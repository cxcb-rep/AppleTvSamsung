(function () {
  "use strict";

  var root = document.getElementById("lan-call");
  var status = document.getElementById("call-status");
  var qr = document.getElementById("call-qr");
  var canvas = document.getElementById("call-video");
  var drawing = canvas.getContext("2d", {alpha: false});
  var closeButton = document.getElementById("call-back");
  var retry = document.getElementById("call-retry");
  var config = window.appleTvSamsungCall;
  var socket, context, pairing, onClose, deadline;
  var nextAudio = 0;
  var session = 0;
  var decoding = false;

  function clean() {
    session += 1;
    clearTimeout(deadline);
    if (pairing) pairing.abort();
    pairing = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN) socket.send("end");
      socket.close();
    }
    socket = null;
    if (context) context.close().catch(function () {});
    context = null;
    nextAudio = 0;
    decoding = false;
    qr.hidden = canvas.hidden = true;
    qr.removeAttribute("src");
  }

  function fail(message) {
    clean();
    status.textContent = message;
    retry.hidden = false;
    retry.focus();
  }

  function video(bytes, active) {
    if (decoding) return;
    decoding = true;
    var url = URL.createObjectURL(new Blob([new Uint8Array(bytes, 1)], {type: "image/jpeg"}));
    var image = new Image();
    image.onload = image.onerror = function () {
      URL.revokeObjectURL(url);
      if (session !== active) return;
      decoding = false;
      if (!image.naturalWidth) return;
      if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
      drawing.drawImage(image, 0, 0);
      canvas.hidden = false;
    };
    image.src = url;
  }

  function audio(bytes) {
    if (!context || context.state !== "running") return;
    var now = context.currentTime;
    if (nextAudio > now + .24) return;
    var body = new DataView(bytes, 1);
    var buffer = context.createBuffer(1, body.byteLength / 2, 16000);
    var output = buffer.getChannelData(0);
    for (var i = 0; i < output.length; i += 1) output[i] = body.getInt16(i * 2, true) / 32768;
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    if (nextAudio <= now) nextAudio = now + .06;
    source.start(nextAudio);
    nextAudio += buffer.duration;
  }

  function prepare() {
    clean();
    closeButton.focus();
    retry.hidden = true;
    if (!config) {
      fail("Для подключения запустите локальный сервер и установите конфигурацию телевизора.");
      return;
    }
    var active = session;
    var Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      context = new Audio();
      context.resume().catch(function () {});
    }
    var connected = false;
    status.textContent = "Подключение к компьютеру…";
    pairing = new XMLHttpRequest();
    pairing.open("POST", config.origin + "/room");
    pairing.setRequestHeader("Authorization", "Bearer " + config.key);
    pairing.timeout = 5000;
    pairing.onerror = pairing.ontimeout = function () {
      fail("Компьютер недоступен. Проверьте, что сервер запущен и оба устройства в одной сети.");
    };
    pairing.onload = function () {
      if (session !== active) return;
      if (pairing.status !== 200) {
        fail("Сервер не подтвердил подключение. Проверьте конфигурацию телевизора.");
        return;
      }
      var room = JSON.parse(pairing.responseText);
      socket = new WebSocket(config.origin.replace(/^http:/, "ws:") + "/receiver?key=" + encodeURIComponent(room.receiver));
      socket.binaryType = "arraybuffer";
      deadline = setTimeout(function () { fail("Сервер не подтвердил соединение. Попробуйте снова."); }, 5000);
      socket.onopen = function () {
        clearTimeout(deadline);
        status.textContent = "Отсканируйте QR-код камерой телефона. При первом подключении установите сертификат.";
        qr.src = room.qr;
        qr.hidden = false;
      };
      socket.onmessage = function (event) {
        if (event.data === "connected") {
          connected = true;
          qr.hidden = true;
          status.textContent = "Камера телефона подключена";
        } else if (event.data instanceof ArrayBuffer && event.data.byteLength > 2) {
          var kind = new Uint8Array(event.data, 0, 1)[0];
          if (kind === 1) video(event.data, active);
          if (kind === 2) audio(event.data);
        }
      };
      socket.onclose = socket.onerror = function () {
        fail(connected ? "Телефон отключился." : "Соединение закрыто. Получите новый QR-код.");
      };
    };
    pairing.send();
  }

  function close() {
    clean();
    root.hidden = true;
    if (onClose) onClose();
    onClose = null;
  }

  closeButton.addEventListener("click", close);
  retry.addEventListener("click", prepare);
  window.addEventListener("pagehide", clean);
  window.appleTvSamsungLanCall = {
    open: function (callback) {
      onClose = callback;
      root.hidden = false;
      prepare();
    },
    close: close,
    move: function (key) {
      if (key === 38) closeButton.focus();
      if (key === 40 && !retry.hidden) retry.focus();
    }
  };
}());
