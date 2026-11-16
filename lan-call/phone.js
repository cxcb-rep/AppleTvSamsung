(function () {
  "use strict";

  var code = location.hash.slice(1);
  var preview = document.getElementById("preview");
  var status = document.getElementById("status");
  var start = document.getElementById("start");
  var stop = document.getElementById("stop");
  var canvas = document.createElement("canvas");
  var drawing = canvas.getContext("2d", {alpha: false});
  var SocketBufferLimit = 64 * 1024;
  var socket, stream, clock, audio, microphone, encoder, silent, timeout;
  var session = 0;

  function end(message) {
    session += 1;
    clearInterval(clock);
    clearTimeout(timeout);
    if (encoder) encoder.onaudioprocess = null;
    [microphone, encoder, silent].forEach(function (node) { if (node) node.disconnect(); });
    microphone = encoder = silent = null;
    if (audio) audio.close().catch(function () {});
    audio = null;
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    stream = null;
    preview.srcObject = null;
    preview.hidden = true;
    if (socket) {
      socket.onopen = socket.onclose = socket.onerror = null;
      socket.close();
    }
    socket = null;
    start.hidden = true;
    stop.hidden = true;
    status.textContent = message;
  }

  function capture(active) {
    var encoding = false;
    clock = setInterval(function () {
      if (!preview.videoWidth || encoding || socket.readyState !== WebSocket.OPEN ||
          socket.bufferedAmount >= SocketBufferLimit) return;
      var scale = Math.min(480 / preview.videoWidth, 360 / preview.videoHeight, 1);
      var width = Math.max(1, Math.round(preview.videoWidth * scale));
      var height = Math.max(1, Math.round(preview.videoHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawing.drawImage(preview, 0, 0, width, height);
      encoding = true;
      canvas.toBlob(function (file) {
        encoding = false;
        if (file && file.size < SocketBufferLimit && active === session &&
            socket.readyState === WebSocket.OPEN && socket.bufferedAmount < SocketBufferLimit) {
          socket.send(new Blob([new Uint8Array([1]), file]));
        }
      }, "image/jpeg", .62);
    }, 90);

    microphone = audio.createMediaStreamSource(stream);
    encoder = audio.createScriptProcessor(2048, 1, 1);
    silent = audio.createGain();
    silent.gain.value = 0;
    microphone.connect(encoder);
    encoder.connect(silent);
    silent.connect(audio.destination);
    encoder.onaudioprocess = function (event) {
      if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount >= SocketBufferLimit) return;
      var buffer = event.inputBuffer;
      var samples = buffer.getChannelData(0);
      var ratio = buffer.sampleRate / 16000;
      var count = Math.floor(samples.length / ratio);
      var packet = new DataView(new ArrayBuffer(count * 2 + 1));
      packet.setUint8(0, 2);
      for (var i = 0; i < count; i += 1) {
        var from = Math.floor(i * ratio);
        var to = Math.max(from + 1, Math.floor((i + 1) * ratio));
        var sum = 0;
        for (var j = from; j < to; j += 1) sum += samples[j];
        var value = Math.max(-1, Math.min(1, sum / (to - from)));
        packet.setInt16(i * 2 + 1, value * 32767, true);
      }
      socket.send(packet.buffer);
    };
  }

  start.addEventListener("click", async function () {
    var active = ++session;
    start.disabled = true;
    status.textContent = "Ожидание разрешения…";
    try {
      var Audio = window.AudioContext || window.webkitAudioContext;
      audio = new Audio();
      await audio.resume();
      var media = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: "user", width: {ideal: 480}, height: {ideal: 360}, frameRate: {ideal: 12, max: 15}},
        audio: {echoCancellation: true}
      });
      if (active !== session) {
        media.getTracks().forEach(function (track) { track.stop(); });
        return;
      }
      stream = media;
      preview.srcObject = stream;
      preview.hidden = false;
      await preview.play();
      if (active !== session) return;
      socket = new WebSocket("wss://" + location.host + "/sender?code=" + encodeURIComponent(code));
      timeout = setTimeout(function () { end("Не удалось подключиться. Откройте новый QR-код на телевизоре."); }, 8000);
      socket.onopen = function () {
        clearTimeout(timeout);
        status.textContent = "Камера и микрофон передаются на телевизор.";
        start.hidden = true;
        stop.hidden = false;
        capture(active);
      };
      socket.onerror = socket.onclose = function () {
        end("Связь завершена. Для нового подключения отсканируйте QR-код на телевизоре.");
      };
    } catch (error) {
      if (active !== session) return;
      end(error.name === "NotAllowedError" ?
        "Разрешите доступ к камере и микрофону в браузере." :
        "Камера или микрофон недоступны. Проверьте разрешения и повторите.");
      start.hidden = false;
      start.disabled = false;
    }
  });

  stop.addEventListener("click", function () { end("Передача завершена."); });
  window.addEventListener("pagehide", function () { end("Передача завершена."); });
  if (!/^[A-Za-z0-9_-]{24}$/.test(code) || !navigator.mediaDevices) {
    end("Откройте QR-код с телевизора и проверьте доверие к сертификату.");
  }
}());
