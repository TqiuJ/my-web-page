(function () {
  "use strict";

  var STORAGE_KEY = "todo.v1";

  var form = document.getElementById("add-form");
  var input = document.getElementById("task-input");
  var list = document.getElementById("task-list");
  var empty = document.getElementById("empty");
  var stats = document.getElementById("stats");
  var today = document.getElementById("today");
  var hint = document.getElementById("form-hint");

  var tasks = [];
  var composing = false;
  var hintTimer = null;

  function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(16).slice(2, 6);
  }

  function normalize(raw) {
    return {
      id: String(raw.id || makeId()),
      text: String(raw.text || "").trim(),
      done: Boolean(raw.done),
      createdAt: Number(raw.createdAt) || Date.now()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .filter(function (item) {
          return item && typeof item.text === "string";
        })
        .map(normalize);
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      // 隐私模式或空间不足时静默失败，页面仍可继续用
    }
  }

  function renderToday() {
    var now = new Date();
    var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    today.textContent =
      now.getFullYear() +
      " 年 " +
      (now.getMonth() + 1) +
      " 月 " +
      now.getDate() +
      " 日 · 星期" +
      weekdays[now.getDay()];
  }

  function renderItem(task) {
    var item = document.createElement("li");
    item.className = "task" + (task.done ? " done" : "");
    item.dataset.id = task.id;

    var checkWrap = document.createElement("label");
    checkWrap.className = "task-check-wrap";

    var check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.done;
    check.setAttribute("aria-label", (task.done ? "取消完成：" : "完成：") + task.text);
    check.addEventListener("change", function () {
      toggle(task.id);
    });

    checkWrap.appendChild(check);

    var text = document.createElement("span");
    text.className = "task-text";
    // 只用 textContent，任务里的 < > & 会原样显示，不会被当成标签
    text.textContent = task.text;

    var del = document.createElement("button");
    del.type = "button";
    del.className = "task-delete";
    del.textContent = "删除";
    del.setAttribute("aria-label", "删除：" + task.text);
    del.addEventListener("click", function () {
      remove(task.id);
    });

    item.appendChild(checkWrap);
    item.appendChild(text);
    item.appendChild(del);
    return item;
  }

  function render() {
    list.textContent = "";
    for (var i = 0; i < tasks.length; i++) {
      list.appendChild(renderItem(tasks[i]));
    }

    empty.hidden = tasks.length !== 0;

    var left = 0;
    for (var j = 0; j < tasks.length; j++) {
      if (!tasks[j].done) left += 1;
    }
    stats.textContent = "还剩 " + left + " 项";
  }

  function addTask(value) {
    var text = String(value).trim();
    if (!text) return false;

    tasks.unshift({
      id: makeId(),
      text: text,
      done: false,
      createdAt: Date.now()
    });
    save();
    render();
    return true;
  }

  function findTask(id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) return tasks[i];
    }
    return null;
  }

  function toggle(id) {
    var task = findTask(id);
    if (!task) return;
    task.done = !task.done;
    save();
    render();
  }

  function remove(id) {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });
    save();
    render();
  }

  function showInputHint() {
    hint.hidden = false;
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hint.hidden = true;
    }, 2000);
  }

  function submit() {
    if (composing) return;
    if (addTask(input.value)) {
      input.value = "";
      hint.hidden = true;
    } else {
      showInputHint();
    }
    input.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    submit();
  });

  input.addEventListener("compositionstart", function () {
    composing = true;
  });

  input.addEventListener("compositionend", function () {
    composing = false;
  });

  input.addEventListener("input", function () {
    if (!hint.hidden) hint.hidden = true;
  });

  // 中文输入法组字期间按回车，不要提交
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.isComposing || composing)) {
      event.preventDefault();
    }
  });

  renderToday();
  tasks = load();
  render();

  // 数据保存限制提示：file:// 打开或 localStorage 不可用时，明确告诉用户
  (function () {
    var protocol = location.protocol;
    var storageWorks = true;
    try {
      localStorage.setItem("__todo_probe__", "1");
      localStorage.removeItem("__todo_probe__");
    } catch (err) {
      storageWorks = false;
    }

    if (protocol === "file:" || !storageWorks) {
      var msg = !storageWorks
        ? "当前浏览器无法保存数据，任务在刷新后可能丢失（可能是隐私模式或浏览器限制）。"
        : "现在是用 file:// 打开的：数据只存在这台电脑、这个浏览器里，换成部署后的 http 链接打开不会看到这些任务。建议用正式链接。";

      var app = document.querySelector(".app");
      var bar = document.createElement("p");
      bar.style.cssText =
        "margin:0 0 16px;padding:10px 14px;border-radius:10px;" +
        "background:#fdf3d8;color:#8a6d1a;font-size:13px;line-height:1.5;";
      bar.textContent = msg;
      app.insertBefore(bar, app.firstChild);
    }
  })();
})();
