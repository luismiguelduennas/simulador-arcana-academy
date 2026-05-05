(function () {
    "use strict";

    const chartState = {
        histogram: null,
        cdf: null,
        amulets: null
    };

    const gridColor = "rgba(148, 163, 184, 0.15)";
    const tickColor = "#d7e2f1";

    const topLabelsPlugin = {
        id: "topLabels",
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            const dataset = data.datasets[0];

            ctx.save();
            chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                const percentage = dataset.percentages[index];
                if (!percentage) return;

                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = "#f8fbff";
                ctx.font = "700 13px Inter, system-ui, sans-serif";
                ctx.fillText(`${percentage.toFixed(1)}%`, datapoint.x, datapoint.y - 7);
            });
            ctx.restore();
        }
    };

    function baseScales(xTitle, yTitle, yOptions) {
        return {
            x: {
                title: { display: true, text: xTitle, color: tickColor },
                grid: { color: "rgba(148, 163, 184, 0.08)" },
                ticks: { color: tickColor, maxRotation: 0, autoSkip: true }
            },
            y: {
                title: { display: true, text: yTitle, color: tickColor },
                grid: { color: gridColor },
                ticks: { color: tickColor },
                ...yOptions
            }
        };
    }

    function commonOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 350 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0b1220",
                    borderColor: "rgba(148, 163, 184, 0.3)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#d7e2f1",
                    displayColors: false
                }
            }
        };
    }

    function destroyChart(name) {
        if (chartState[name]) {
            chartState[name].destroy();
            chartState[name] = null;
        }
    }

    function renderHistogram(canvas, data, totalRuns) {
        destroyChart("histogram");

        const colors = data.labels.map((points) => {
            if (points >= data.p10 && points <= data.p90) return "rgba(90, 143, 255, 0.9)";
            return "rgba(173, 183, 197, 0.55)";
        });

        chartState.histogram = new Chart(canvas, {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: colors,
                    borderRadius: 3,
                    maxBarThickness: 18
                }]
            },
            options: {
                ...commonOptions(),
                plugins: {
                    ...commonOptions().plugins,
                    tooltip: {
                        ...commonOptions().plugins.tooltip,
                        callbacks: {
                            title: (items) => `${items[0].label} puntos`,
                            label: (context) => `${context.raw} partidas (${((context.raw / totalRuns) * 100).toFixed(2)}%)`
                        }
                    }
                },
                scales: baseScales("Puntuación Total", "Frecuencia")
            }
        });
    }

    function renderCdf(canvas, data) {
        destroyChart("cdf");

        chartState.cdf = new Chart(canvas, {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    borderColor: "#ff6262",
                    backgroundColor: "rgba(255, 98, 98, 0.22)",
                    fill: true,
                    tension: 0.25,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#ff6262",
                    pointBorderWidth: 0
                }]
            },
            options: {
                ...commonOptions(),
                plugins: {
                    ...commonOptions().plugins,
                    tooltip: {
                        ...commonOptions().plugins.tooltip,
                        callbacks: {
                            title: (items) => `${items[0].label} puntos del jugador`,
                            label: (context) => `Victorias: ${context.raw.toFixed(2)}%`
                        }
                    }
                },
                scales: baseScales("Puntuación lograda por el jugador", "Probabilidad de Ganar (%)", {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: tickColor,
                        callback: (value) => `${value}%`
                    }
                })
            }
        });
    }

    function renderAmulets(canvas, data, totalRuns) {
        destroyChart("amulets");

        chartState.amulets = new Chart(canvas, {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    percentages: data.percentages,
                    backgroundColor: "rgba(93, 204, 101, 0.92)",
                    borderRadius: 3,
                    maxBarThickness: 96
                }]
            },
            plugins: [topLabelsPlugin],
            options: {
                ...commonOptions(),
                layout: { padding: { top: 26 } },
                plugins: {
                    ...commonOptions().plugins,
                    tooltip: {
                        ...commonOptions().plugins.tooltip,
                        callbacks: {
                            label: (context) => `${context.raw} partidas (${((context.raw / totalRuns) * 100).toFixed(2)}%)`
                        }
                    }
                },
                scales: baseScales("Cantidad de Amuletos Recogidos", "Frecuencia (%)", {
                    ticks: {
                        color: tickColor,
                        callback: (value) => `${((value / totalRuns) * 100).toFixed(0)}%`
                    }
                })
            }
        });
    }

    function renderAll(result) {
        renderHistogram(document.getElementById("histogramChart"), result.histogram, result.config.numSimulaciones);
        renderCdf(document.getElementById("cdfChart"), result.cdf);
        renderAmulets(document.getElementById("amuletChart"), result.amulets, result.config.numSimulaciones);
    }

    window.BotCharts = {
        renderAll,
        destroyChart
    };
}());
