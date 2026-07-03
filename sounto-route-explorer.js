(async () => {
  const token = localStorage.getItem("suunto_access_token") || sessionStorage.getItem("suunto_access_token");
  if (!token) return alert("Brak suunto_access_token");

  async function api(endpoint, method = "GET", body = null, as = "json") {
    const res = await fetch("/api/suunto/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, endpoint, method, body, headers: null })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
    }

    if (as === "text") return await res.text();
    if (as === "raw") return res;
    return await res.json();
  }

  const valueOf = (r, key) => key.split(".").reduce((o, k) => o?.[k], r);
  const fmt = (v, key) => {
    if (v == null) return "";
    if (["created", "modified"].includes(key)) return new Date(v).toISOString().slice(0, 10);
    if (key === "totalDistance") return (v / 1000).toFixed(2);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };
  const safe = s => (s || "route").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
  const download = (name, content, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  async function allRoutes() {
    const out = [], size = 100;
    for (let page = 0; ; page++) {
      const batch = await api(`/v2/route?page=${page}&size=${size}`);
      console.log(`page ${page}: ${batch.length}`);
      out.push(...batch);
      if (batch.length < size) break;
    }
    return out;
  }

  let routes = await allRoutes();
  window.suuntoRoutes = routes;
  window.suuntoApi = api;

  const columns = [
    ["created", "Created"],
    ["description", "Name"],
    ["totalDistance", "km"],
    ["modified", "Modified"],
    ["visibility", "Visibility"],
    ["watchEnabled", "Watch"],
    ["turnWaypointsEnabled", "Turns"],
    ["averageSpeed", "Avg speed"],
    ["id", "ID"],
    ["startPoint.latitude", "Start lat"],
    ["startPoint.longitude", "Start lon"],
    ["endPoint.latitude", "End lat"],
    ["endPoint.longitude", "End lon"],
    ["centerPoint.latitude", "Center lat"],
    ["centerPoint.longitude", "Center lon"],
    ["activityIds", "Activities"]
  ];

  let visible = ["created", "description", "totalDistance", "modified", "watchEnabled"];
  let order = [...visible];
  let sortKey = "created";
  let sortDir = -1;
  let selectedId = null;
  let currentJson = null;
  let currentGpx = null;
  let currentBaseName = "route";
  let layoutMode = "right";

  function setActiveButton(btn, active) {
    btn.style.background = active ? "#dbeafe" : "";
    btn.style.borderColor = active ? "#2563eb" : "";
    btn.style.fontWeight = active ? "bold" : "";
  }

  const root = document.createElement("div");
  root.style.cssText = `
    position:fixed; inset:24px; z-index:999999; background:white; color:#111;
    border:1px solid #999; box-shadow:0 8px 40px rgba(0,0,0,.35);
    font:13px Arial,sans-serif; display:flex; flex-direction:column;
    user-select:text;
  `;

  root.innerHTML = `
    <div style="padding:10px; border-bottom:1px solid #ddd; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <b>Suunto Routes</b><span id="sr-count">${routes.length} routes</span>
      <button id="sr-filters">Filters</button>
      <button id="sr-cols">Columns</button>
      <button id="sr-export-all">Download all JSON</button>
      <button id="sr-layout-toggle" style="margin-left:auto;">Layout: right</button>
      <button id="sr-close">Close</button>
    </div>

    <div id="sr-filter-panel" style="display:none; padding:10px; border-bottom:1px solid #bbb; background:#fff7ed;">
      <div style="font-weight:bold; margin-bottom:6px;">Filters</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
        <label>Name<br><input id="f-name" style="padding:5px; width:220px;"></label>
        <label>Created from<br><input id="f-created-from" type="date" style="padding:5px;"></label>
        <label>Created to<br><input id="f-created-to" type="date" style="padding:5px;"></label>
        <label>Distance km from<br><input id="f-km-from" type="number" step="0.1" style="padding:5px; width:110px;"></label>
        <label>Distance km to<br><input id="f-km-to" type="number" step="0.1" style="padding:5px; width:110px;"></label>
        <button id="f-clear">Clear filters</button>
      </div>
    </div>

    <div id="sr-col-panel" style="display:none; padding:10px; border-bottom:1px solid #bbb; background:#eef4ff;">
      <div style="font-weight:bold; margin-bottom:6px;">Columns</div>
      <div style="margin-bottom:6px; color:#555;">Drag columns to reorder. Check/uncheck to show/hide.</div>
      <div id="sr-col-list" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
    </div>
    
    <div id="sr-main" style="flex:1; min-height:0; display:flex;">
      <div id="sr-list" style="flex:0 0 55%; min-width:260px; overflow:auto;">
        <table style="border-collapse:collapse; width:100%;">
          <thead><tr id="sr-head" style="position:sticky; top:0; background:#eee;"></tr></thead>
          <tbody id="sr-body"></tbody>
        </table>
      </div>

      <div id="sr-splitter" style="flex:0 0 6px; cursor:col-resize; background:#ddd;"></div>

      <div id="sr-details" style="flex:1; min-width:260px; display:flex; flex-direction:column; min-height:0;">
        <div style="padding:8px; border-bottom:1px solid #ddd; display:flex; gap:8px; align-items:center;">
          <b id="sr-title">Details</b>
          <span id="sr-meta" style="color:#666;"></span>
        </div>

        <div id="sr-detail-panes" style="flex:1; min-height:0; display:flex; flex-direction:column;">
          <div class="sr-pane" style="flex:1; min-height:0; display:flex; flex-direction:column; border-bottom:1px solid #ddd;">
            <div style="padding:6px; border-bottom:1px solid #ddd; display:flex; align-items:center; gap:8px;">
              <b>JSON</b>
              <button id="sr-json-download" disabled style="margin-left:auto;">Download JSON</button>
            </div>
            <pre id="sr-json-preview" style="margin:0; padding:10px; flex:1; overflow:auto; white-space:pre-wrap; word-break:break-word; background:#fafafa;">Select a route.</pre>
          </div>

          <div class="sr-pane" style="flex:1; min-height:0; display:flex; flex-direction:column;">
            <div style="padding:6px; border-bottom:1px solid #ddd; display:flex; align-items:center; gap:8px;">
              <b>GPX</b>
              <button id="sr-gpx-download" disabled style="margin-left:auto;">Download GPX</button>
            </div>
            <pre id="sr-gpx-preview" style="margin:0; padding:10px; flex:1; overflow:auto; white-space:pre-wrap; word-break:break-word; background:#fafafa;">Select a route.</pre>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const $ = s => root.querySelector(s);
  const main = $("#sr-main"), list = $("#sr-list"), splitter = $("#sr-splitter");
  const detailPanes = $("#sr-detail-panes");
  const head = $("#sr-head"), body = $("#sr-body");
  const title = $("#sr-title"), meta = $("#sr-meta");
  const jsonPreview = $("#sr-json-preview"), gpxPreview = $("#sr-gpx-preview");
  const jsonDownload = $("#sr-json-download"), gpxDownload = $("#sr-gpx-download");

  function sortedFiltered() {
    const name = $("#f-name")?.value.trim().toLowerCase() || "";
    const createdFrom = $("#f-created-from")?.value || "";
    const createdTo = $("#f-created-to")?.value || "";
    const kmFrom = $("#f-km-from")?.value;
    const kmTo = $("#f-km-to")?.value;
  
    return routes
      .filter(r => {
        const routeName = (r.description || "").toLowerCase();
        const createdDate = new Date(r.created).toISOString().slice(0, 10);
        const km = (r.totalDistance || 0) / 1000;
  
        if (name && !routeName.includes(name)) return false;
        if (createdFrom && createdDate < createdFrom) return false;
        if (createdTo && createdDate > createdTo) return false;
        if (kmFrom !== "" && km < Number(kmFrom)) return false;
        if (kmTo !== "" && km > Number(kmTo)) return false;
  
        return true;
      })
      .sort((a, b) => {
        const av = valueOf(a, sortKey), bv = valueOf(b, sortKey);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av > bv ? 1 : av < bv ? -1 : 0) * sortDir;
      });
  }
  
  function renderTable() {
    head.innerHTML = "";
    [...order].forEach(key => {
      const th = document.createElement("th");
      th.style.cssText = "text-align:left; padding:6px; border-bottom:1px solid #ccc; white-space:nowrap; cursor:pointer;";
      th.textContent = columns.find(c => c[0] === key)?.[1] || key;
      if (key === sortKey) th.textContent += sortDir === 1 ? " ▲" : " ▼";
      th.onclick = () => {
        sortDir = sortKey === key ? -sortDir : 1;
        sortKey = key;
        renderTable();
      };
      head.appendChild(th);
    });

    body.innerHTML = "";
    sortedFiltered().forEach(r => {
      const tr = document.createElement("tr");
      tr.dataset.id = r.id;
      tr.style.cssText = `
        border-bottom:1px solid #eee;
        cursor:pointer;
        background:${r.id === selectedId ? "#dbeafe" : "white"};
      `;

      order.forEach(key => {
        const td = document.createElement("td");
        td.style.cssText = "padding:6px; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
        td.textContent = fmt(valueOf(r, key), key);
        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }

  async function selectRoute(id) {
    selectedId = id;
    renderTable();

    const route = routes.find(r => r.id === id);
    currentBaseName = safe(route?.description || id);

    title.textContent = route?.description || id;
    meta.textContent = "loading...";
    jsonPreview.textContent = "Loading JSON...";
    gpxPreview.textContent = "Loading GPX...";
    jsonDownload.disabled = true;
    gpxDownload.disabled = true;
    currentJson = null;
    currentGpx = null;

    const [jsonResult, gpxResult] = await Promise.allSettled([
      api(`/v2/route/${id}`, "GET", null, "json"),
      api(`/v2/route/${id}/export`, "GET", null, "text")
    ]);

    if (jsonResult.status === "fulfilled") {
      currentJson = JSON.stringify(jsonResult.value, null, 2);
      jsonPreview.textContent = currentJson;
      jsonDownload.disabled = false;
    } else {
      jsonPreview.textContent = String(jsonResult.reason?.stack || jsonResult.reason);
    }

    if (gpxResult.status === "fulfilled") {
      currentGpx = gpxResult.value;
      gpxPreview.textContent = currentGpx;
      gpxDownload.disabled = false;
    } else {
      gpxPreview.textContent = String(gpxResult.reason?.stack || gpxResult.reason);
    }

    meta.textContent = "loaded";
  }

  function renderColPanel() {
    const panel = $("#sr-col-list");
    panel.innerHTML = "";

    columns.forEach(([key, label]) => {
      const item = document.createElement("label");
      item.draggable = true;
      item.dataset.key = key;
      item.style.cssText = "padding:5px 8px; background:white; border:1px solid #ccc; cursor:grab;";
      item.innerHTML = `<input type="checkbox" ${visible.includes(key) ? "checked" : ""}> ${label}`;
      panel.appendChild(item);
    });

    panel.onchange = () => {
      visible = [...panel.querySelectorAll("label")]
        .filter(l => l.querySelector("input").checked)
        .map(l => l.dataset.key);
      order = [...visible];
      renderTable();
    };

    let dragged = null;
    panel.ondragstart = e => dragged = e.target.closest("label");
    panel.ondragover = e => e.preventDefault();
    panel.ondrop = e => {
      e.preventDefault();
      const target = e.target.closest("label");
      if (!dragged || !target || dragged === target) return;
      panel.insertBefore(dragged, target);
      order = [...panel.querySelectorAll("label")]
        .filter(l => l.querySelector("input").checked)
        .map(l => l.dataset.key);
      visible = [...order];
      renderTable();
    };
  }

  body.onclick = e => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) selectRoute(tr.dataset.id);
  };

  function setLayout(mode) {
    const bottom = mode === "bottom";
    main.style.flexDirection = bottom ? "column" : "row";
    splitter.style.cursor = bottom ? "row-resize" : "col-resize";
    detailPanes.style.flexDirection = bottom ? "row" : "column";

    [...detailPanes.children].forEach((pane, idx) => {
      pane.style.borderBottom = bottom ? "0" : (idx === 0 ? "1px solid #ddd" : "0");
      pane.style.borderRight = bottom ? (idx === 0 ? "1px solid #ddd" : "0") : "0";
    });
  }

  $("#sr-cols").onclick = () => {
    const p = $("#sr-col-panel");
    const shown = p.style.display === "none";
    p.style.display = shown ? "block" : "none";
    setActiveButton($("#sr-cols"), shown);
  };
  $("#sr-export-all").onclick = () =>
    download(`suunto-routes-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(routes, null, 2), "application/json");
  $("#sr-close").onclick = () => root.remove();
  jsonDownload.onclick = () => currentJson && download(`${currentBaseName}.json`, currentJson, "application/json");
  gpxDownload.onclick = () => currentGpx && download(`${currentBaseName}.gpx`, currentGpx, "application/gpx+xml");
  $("#sr-layout-toggle").onclick = () => {
    layoutMode = layoutMode === "right" ? "bottom" : "right";
    $("#sr-layout-toggle").textContent = layoutMode === "right" ? "Layout: right" : "Layout: bottom";
    setLayout(layoutMode);
  };

  $("#sr-filters").onclick = () => {
    const p = $("#sr-filter-panel");
    const shown = p.style.display === "none";
    p.style.display = shown ? "block" : "none";
    setActiveButton($("#sr-filters"), shown);
  };
  
  ["#f-name", "#f-created-from", "#f-created-to", "#f-km-from", "#f-km-to"].forEach(sel => {
    $(sel).addEventListener("input", renderTable);
  });
  
  $("#f-clear").onclick = () => {
    ["#f-name", "#f-created-from", "#f-created-to", "#f-km-from", "#f-km-to"].forEach(sel => {
      $(sel).value = "";
    });
    renderTable();
  };
  
  let dragging = false;
  splitter.onmousedown = e => {
    dragging = true;
    e.preventDefault();
    document.body.style.userSelect = "none";
  };
  document.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    const rect = main.getBoundingClientRect();
    if (main.style.flexDirection === "column") {
      const pct = Math.max(20, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100));
      list.style.flex = `0 0 ${pct}%`;
    } else {
      const pct = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
      list.style.flex = `0 0 ${pct}%`;
    }
  });

  renderColPanel();
  setLayout("right");
  renderTable();
})();