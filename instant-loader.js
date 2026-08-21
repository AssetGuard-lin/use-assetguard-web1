(function () {
    "use strict";

    const LOADER_ID = "ag-instant-loader";
    const STYLE_ID = "ag-instant-loader-style";

    const styles = `
        #${LOADER_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: grid;
            place-items: center;
            background: #f3f6fa;
            opacity: 1;
            transition: opacity 180ms ease;
        }
        #${LOADER_ID}.is-hidden {
            opacity: 0;
            pointer-events: none;
        }
        #${LOADER_ID} .ag-loader-card {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 170px;
            padding: 14px 18px;
            border: 1px solid #e4e9f0;
            border-radius: 16px;
            background: rgba(255, 255, 255, .96);
            box-shadow: 0 12px 32px rgba(15, 23, 42, .12);
            color: #172033;
            font: 800 12px/1.2 "Segoe UI", Roboto, system-ui, sans-serif;
        }
        #${LOADER_ID} .ag-loader-bubbles {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        #${LOADER_ID} .ag-loader-bubbles i {
            width: 7px;
            height: 7px;
            display: block;
            border-radius: 50%;
            background: #2563eb;
            animation: ag-loader-bounce 700ms ease-in-out infinite;
        }
        #${LOADER_ID} .ag-loader-bubbles i:nth-child(2) { animation-delay: 110ms; }
        #${LOADER_ID} .ag-loader-bubbles i:nth-child(3) { animation-delay: 220ms; }
        @keyframes ag-loader-bounce {
            0%, 100% { transform: translateY(0); opacity: .45; }
            50% { transform: translateY(-5px); opacity: 1; }
        }
    `;

    const markup = `
        <div id="${LOADER_ID}" role="status" aria-live="polite">
            <div class="ag-loader-card">
                <span class="ag-loader-bubbles" aria-hidden="true"><i></i><i></i><i></i></span>
                <span>Loading securely…</span>
            </div>
        </div>
    `;

    function install() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement("style");
            style.id = STYLE_ID;
            style.textContent = styles;
            (document.head || document.documentElement).appendChild(style);
        }

        if (!document.getElementById(LOADER_ID)) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = markup.trim();
            (document.body || document.documentElement).appendChild(wrapper.firstElementChild);
        }
    }

    function hide() {
        const loader = document.getElementById(LOADER_ID);
        if (!loader) return;
        loader.classList.add("is-hidden");
        window.setTimeout(() => loader.remove(), 220);
    }

    function show() {
        install();
        document.getElementById(LOADER_ID)?.classList.remove("is-hidden");
    }

    function bindDashboardFrame() {
        const frame = document.getElementById("main-frame");
        if (!frame || frame.dataset.instantLoaderBound === "true") return;

        frame.dataset.instantLoaderBound = "true";
        frame.addEventListener("load", hide);

        // dashboard.html changes this iframe's src for every module, including
        // modules added later. Show the loader for each of those transitions.
        new MutationObserver((records) => {
            if (records.some((record) => record.type === "attributes" && record.attributeName === "src")) {
                show();
            }
        }).observe(frame, { attributes: true, attributeFilter: ["src"] });
    }

    function start() {
        install();
        bindDashboardFrame();
    }

    window.AGInstantLoader = { install: start, show, hide, bindDashboardFrame };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();