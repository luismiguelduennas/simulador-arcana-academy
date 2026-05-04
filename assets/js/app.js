(function () {
    "use strict";

    const form = document.getElementById("configForm");
    const fileInput = document.getElementById("configFile");
    const statusMessage = document.getElementById("statusMessage");

    const kpis = {
        range: document.getElementById("kpiRange"),
        mean: document.getElementById("kpiMean"),
        min: document.getElementById("kpiMin"),
        max: document.getElementById("kpiMax"),
        stdDev: document.getElementById("kpiStdDev")
    };

    function readConfig() {
        const puntosAmuletos = {};
        const puntosObjetivos = {};

        document.querySelectorAll("[data-amulet]").forEach((input) => {
            puntosAmuletos[input.dataset.amulet] = Number(input.value);
        });

        document.querySelectorAll("[data-objective]").forEach((input) => {
            puntosObjetivos[input.dataset.objective] = Number(input.value);
        });

        return window.BotSimulation.normalizeConfig({
            numSimulaciones: document.getElementById("numSimulaciones").value,
            puntosAmuletos,
            puntosObjetivos,
            cartasAltas: document.getElementById("cartasAltas").value,
            cartasBajas: document.getElementById("cartasBajas").value
        });
    }

    function applyConfig(config) {
        const normalized = window.BotSimulation.normalizeConfig(config);

        document.getElementById("numSimulaciones").value = normalized.numSimulaciones;
        document.getElementById("cartasAltas").value = normalized.cartasAltas;
        document.getElementById("cartasBajas").value = normalized.cartasBajas;

        document.querySelectorAll("[data-amulet]").forEach((input) => {
            input.value = normalized.puntosAmuletos[input.dataset.amulet];
        });

        document.querySelectorAll("[data-objective]").forEach((input) => {
            input.value = normalized.puntosObjetivos[input.dataset.objective];
        });

        return normalized;
    }

    function formatNumber(value, decimals = 0) {
        return new Intl.NumberFormat("es-ES", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    function setBusy(isBusy) {
        document.body.classList.toggle("is-running", isBusy);
        form.querySelectorAll("button, input, select").forEach((control) => {
            control.disabled = isBusy;
        });
        document.querySelectorAll(".toolbar button").forEach((button) => {
            button.disabled = isBusy;
        });
    }

    function renderSummary(result, elapsedMs) {
        const { summary, ranges, averages, config } = result;

        kpis.range.textContent = `${summary.p10} - ${summary.p90}`;
        kpis.mean.textContent = formatNumber(summary.mean, 2);
        kpis.min.textContent = formatNumber(summary.min);
        kpis.max.textContent = formatNumber(summary.max);
        kpis.stdDev.textContent = formatNumber(summary.stdDev, 2);

        document.getElementById("percentileInsight").innerHTML =
            `<strong>El rango de puntuación realista (80% central) está entre ${summary.p10} y ${summary.p90} puntos habitualmente.</strong><br>` +
            `Se han descartado el 10% de partidas de peor suerte y el 10% de mejor suerte.`;

        statusMessage.innerHTML = [
            `<strong>${formatNumber(config.numSimulaciones)} partidas simuladas en ${formatNumber(elapsedMs)} ms.</strong>`,
            `Media amuletos: ${formatNumber(averages.amuletos, 2)} | Exámenes medios: ${formatNumber(averages.examenes, 2)} | Total medio: ${formatNumber(averages.total, 2)}`,
            `Rangos: Amuletos ${ranges.puntosAmuletos.join(" - ")}, Objetivos ${ranges.puntosObjetivos.join(" - ")}, Verde ${ranges.verde.join(" - ")}, Rosa ${ranges.rosa.join(" - ")}, Naranja ${ranges.naranja.join(" - ")}`
        ].join("<br>");
    }

    function runSimulation() {
        setBusy(true);
        statusMessage.textContent = "Ejecutando simulación...";

        window.setTimeout(() => {
            try {
                const startedAt = performance.now();
                const result = window.BotSimulation.runSimulations(readConfig());
                const elapsedMs = Math.round(performance.now() - startedAt);

                renderSummary(result, elapsedMs);
                window.BotCharts.renderAll(result);
            } catch (error) {
                console.error(error);
                statusMessage.textContent = "No se ha podido ejecutar la simulación. Revisa los parámetros e inténtalo de nuevo.";
            } finally {
                setBusy(false);
                if (window.lucide) window.lucide.createIcons();
            }
        }, 30);
    }

    function saveConfig() {
        const config = readConfig();
        const payload = JSON.stringify(config, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `configuracion-bot-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function loadConfig(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            try {
                const config = JSON.parse(reader.result);
                applyConfig(config);
                runSimulation();
            } catch (error) {
                console.error(error);
                statusMessage.textContent = "El archivo de configuración no es un JSON válido.";
            } finally {
                fileInput.value = "";
            }
        });
        reader.readAsText(file);
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        runSimulation();
    });

    document.getElementById("newSimulation").addEventListener("click", runSimulation);
    document.getElementById("saveConfig").addEventListener("click", saveConfig);
    document.getElementById("loadConfig").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (event) => loadConfig(event.target.files[0]));

    window.addEventListener("DOMContentLoaded", () => {
        if (window.lucide) window.lucide.createIcons();
        applyConfig(readConfig());
        runSimulation();
    });
}());
