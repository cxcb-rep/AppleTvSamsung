"use strict";

var code = location.hash.slice(1);
if (/^[A-Za-z0-9_-]{24}$/.test(code)) {
  var join = document.getElementById("join");
  join.href = document.querySelector('meta[name="call-origin"]').content + "/phone#" + code;
  join.hidden = false;
}
