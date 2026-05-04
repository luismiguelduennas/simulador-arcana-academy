(function () {
    "use strict";

    const VALORES_EXAMEN = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8, 9, 10, 10, 11, 11, 11, 11, 12];
    const VERDE = "VERDE";
    const ROSA = "ROSA";
    const NARANJA = "NARANJA";

    const CARTAS_BOT = [
        { nombre: "asignatura verde", amuleto: true, acciones: [[VERDE, "alta"]] },
        { nombre: "asignatura rosa", amuleto: true, acciones: [[ROSA, "alta"]] },
        { nombre: "asignatura naranja", amuleto: true, acciones: [[NARANJA, "alta"]] },
        { nombre: "bombilla", amuleto: false, acciones: [[NARANJA, "alta"], [ROSA, "baja"]] },
        { nombre: "correr", amuleto: true, acciones: [[NARANJA, "alta"], [ROSA, "baja"]] },
        { nombre: "cerebro", amuleto: true, acciones: [[VERDE, "alta"], [NARANJA, "baja"]] },
        { nombre: "amuleto", amuleto: false, acciones: [[VERDE, "alta"], [NARANJA, "baja"]] },
        { nombre: "mejora", amuleto: true, acciones: [[ROSA, "alta"], [VERDE, "baja"]] },
        { nombre: "mascota", amuleto: false, acciones: [[ROSA, "alta"], [VERDE, "baja"]] }
    ];

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function toNumber(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeConfig(config) {
        const puntosAmuletos = {};
        const puntosObjetivos = {};

        for (let i = 1; i <= 8; i++) {
            puntosAmuletos[i] = toNumber(config.puntosAmuletos && config.puntosAmuletos[i], i);
        }

        const defaultObjectives = { 1: 6, 2: 12, 3: 20, 4: 30 };
        for (let i = 1; i <= 4; i++) {
            puntosObjetivos[i] = toNumber(config.puntosObjetivos && config.puntosObjetivos[i], defaultObjectives[i]);
        }

        return {
            numSimulaciones: Math.max(1, Math.floor(toNumber(config.numSimulaciones, 50000))),
            puntosAmuletos,
            puntosObjetivos,
            cartasAltas: Math.max(0, Math.floor(toNumber(config.cartasAltas, 3))),
            cartasBajas: Math.max(0, Math.floor(toNumber(config.cartasBajas, 0)))
        };
    }

    function simularPartida() {
        const mazos = {
            [VERDE]: shuffleArray([...VALORES_EXAMEN]),
            [ROSA]: shuffleArray([...VALORES_EXAMEN]),
            [NARANJA]: shuffleArray([...VALORES_EXAMEN])
        };

        const mercado = {
            [VERDE]: [mazos[VERDE].pop(), mazos[VERDE].pop(), mazos[VERDE].pop()],
            [ROSA]: [mazos[ROSA].pop(), mazos[ROSA].pop(), mazos[ROSA].pop()],
            [NARANJA]: [mazos[NARANJA].pop(), mazos[NARANJA].pop(), mazos[NARANJA].pop()]
        };

        let amuletos = 0;
        const cartasObtenidas = { [VERDE]: [], [ROSA]: [], [NARANJA]: [] };

        for (let ronda = 0; ronda < 2; ronda++) {
            const mazoBot = shuffleArray(CARTAS_BOT.map((carta) => ({
                nombre: carta.nombre,
                amuleto: carta.amuleto,
                acciones: carta.acciones.map((accion) => [...accion])
            })));

            for (const carta of mazoBot.slice(0, 4)) {
                if (carta.amuleto) amuletos++;

                for (const [color, tipoSeleccion] of carta.acciones) {
                    const mercadoColor = mercado[color];
                    const valorElegido = tipoSeleccion === "alta"
                        ? Math.max(...mercadoColor)
                        : Math.min(...mercadoColor);
                    const indiceElegido = mercadoColor.indexOf(valorElegido);

                    cartasObtenidas[color].push(mercadoColor.splice(indiceElegido, 1)[0]);

                    if (mazos[color].length > 0) {
                        mercadoColor.push(mazos[color].pop());
                    }
                }
            }
        }

        return {
            amuletos,
            cartas: {
                [VERDE]: cartasObtenidas[VERDE],
                [ROSA]: cartasObtenidas[ROSA],
                [NARANJA]: cartasObtenidas[NARANJA]
            }
        };
    }

    function objetivosPorAmuletos(numAmuletos) {
        if (numAmuletos <= 2) return 0;
        if (numAmuletos <= 4) return 1;
        if (numAmuletos === 5) return 2;
        if (numAmuletos <= 7) return 3;
        return 4;
    }

    function calcularPuntosAmuletos(numAmuletos, config) {
        const objetivos = objetivosPorAmuletos(numAmuletos);
        return {
            objetivos,
            puntosAmuletos: config.puntosAmuletos[numAmuletos] || 0,
            puntosObjetivos: objetivos === 0 ? 0 : config.puntosObjetivos[objetivos] || 0
        };
    }

    function calcularPuntosExamen(cartas, numAltas, numBajas) {
        if (!cartas.length) return 0;

        const ordenadas = [...cartas].sort((a, b) => a - b);
        if (numAltas + numBajas >= ordenadas.length) {
            return sum(ordenadas);
        }

        const seleccionadas = [
            ...ordenadas.slice(0, numBajas),
            ...ordenadas.slice(numAltas > 0 ? -numAltas : ordenadas.length)
        ];

        return sum(seleccionadas);
    }

    function sum(values) {
        return values.reduce((total, value) => total + value, 0);
    }

    function mean(values) {
        return values.length ? sum(values) / values.length : 0;
    }

    function min(values) {
        return values.length ? Math.min(...values) : 0;
    }

    function max(values) {
        return values.length ? Math.max(...values) : 0;
    }

    function standardDeviation(values) {
        if (!values.length) return 0;
        const avg = mean(values);
        const variance = mean(values.map((value) => (value - avg) ** 2));
        return Math.sqrt(variance);
    }

    function percentile(sortedValues, percent) {
        if (!sortedValues.length) return 0;
        const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percent));
        return sortedValues[index];
    }

    function frequency(values, keys) {
        const result = {};
        for (const key of keys) result[key] = 0;
        for (const value of values) result[value] = (result[value] || 0) + 1;
        return result;
    }

    function runSimulations(rawConfig) {
        const config = normalizeConfig(rawConfig);
        const totals = [];
        const amuletos = [];
        const puntosAmuletos = [];
        const puntosObjetivos = [];
        const puntosVerde = [];
        const puntosRosa = [];
        const puntosNaranja = [];
        const puntosExamenes = [];

        for (let i = 0; i < config.numSimulaciones; i++) {
            const partida = simularPartida();
            const puntosMeta = calcularPuntosAmuletos(partida.amuletos, config);
            const verde = calcularPuntosExamen(partida.cartas[VERDE], config.cartasAltas, config.cartasBajas);
            const rosa = calcularPuntosExamen(partida.cartas[ROSA], config.cartasAltas, config.cartasBajas);
            const naranja = calcularPuntosExamen(partida.cartas[NARANJA], config.cartasAltas, config.cartasBajas);
            const examenes = verde + rosa + naranja;
            const total = puntosMeta.puntosAmuletos + puntosMeta.puntosObjetivos + examenes;

            amuletos.push(partida.amuletos);
            puntosAmuletos.push(puntosMeta.puntosAmuletos);
            puntosObjetivos.push(puntosMeta.puntosObjetivos);
            puntosVerde.push(verde);
            puntosRosa.push(rosa);
            puntosNaranja.push(naranja);
            puntosExamenes.push(examenes);
            totals.push(total);
        }

        const sortedTotals = [...totals].sort((a, b) => a - b);
        const p10 = percentile(sortedTotals, 0.10);
        const p90 = percentile(sortedTotals, 0.90);
        const totalFrequency = frequency(totals, []);
        const histogramLabels = Object.keys(totalFrequency).map(Number).sort((a, b) => a - b);
        const histogramValues = histogramLabels.map((label) => totalFrequency[label]);

        let accumulated = 0;
        const cdfValues = histogramLabels.map((label) => {
            accumulated += totalFrequency[label];
            return (accumulated / config.numSimulaciones) * 100;
        });

        const amuletKeys = [2, 3, 4, 5, 6, 7, 8];
        const amuletFrequency = frequency(amuletos, amuletKeys);

        return {
            config,
            summary: {
                p10,
                p90,
                min: min(totals),
                max: max(totals),
                mean: mean(totals),
                stdDev: standardDeviation(totals)
            },
            ranges: {
                puntosAmuletos: [min(puntosAmuletos), max(puntosAmuletos)],
                puntosObjetivos: [min(puntosObjetivos), max(puntosObjetivos)],
                verde: [min(puntosVerde), max(puntosVerde)],
                rosa: [min(puntosRosa), max(puntosRosa)],
                naranja: [min(puntosNaranja), max(puntosNaranja)],
                examenes: [min(puntosExamenes), max(puntosExamenes)]
            },
            averages: {
                amuletos: mean(amuletos),
                puntosAmuletos: mean(puntosAmuletos),
                puntosObjetivos: mean(puntosObjetivos),
                verde: mean(puntosVerde),
                rosa: mean(puntosRosa),
                naranja: mean(puntosNaranja),
                examenes: mean(puntosExamenes),
                total: mean(totals)
            },
            histogram: {
                labels: histogramLabels,
                values: histogramValues,
                p10,
                p90
            },
            cdf: {
                labels: histogramLabels,
                values: cdfValues
            },
            amulets: {
                labels: amuletKeys.map((key) => `${key} Amuletos`),
                values: amuletKeys.map((key) => amuletFrequency[key] || 0),
                percentages: amuletKeys.map((key) => ((amuletFrequency[key] || 0) / config.numSimulaciones) * 100)
            }
        };
    }

    window.BotSimulation = {
        normalizeConfig,
        simularPartida,
        runSimulations,
        calcularPuntosExamen,
        calcularPuntosAmuletos,
        objetivosPorAmuletos
    };
}());
