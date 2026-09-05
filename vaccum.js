/*
============================================================
 SANDBOXELS VACUUM CHAMBER V3
============================================================

 Adds:

  • Vacuum Pump
  • Vacuum
  • Vacuum Gauge
  • Automatic sealed-chamber detection
  • Pump ON/OFF
  • Simulated pressure
  • Vacuum percentage
  • Hover information
  • Vacuum loss when chamber is opened

============================================================
*/


runAfterLoad(function () {

    /*
    ============================================================
    SETTINGS
    ============================================================
    */

    // How many chamber cells are evacuated per pump cycle.
    const PUMP_RATE = 15;

    // Pump interval.
    const PUMP_INTERVAL = 2;

    // Maximum chamber size the scanner will process.
    const MAX_CHAMBER_SIZE = 12000;

    // How much pressure is restored when a chamber is opened.
    const OPEN_PRESSURE = 1.0;


    /*
    ============================================================
    HELPER FUNCTIONS
    ============================================================
    */

    function isGas(pixel) {

        if (!pixel) return false;

        if (!elements[pixel.element]) return false;

        return elements[pixel.element].state === "gas";
    }


    function isVacuum(pixel) {

        return pixel &&
               pixel.element === "vacuum";
    }


    /*
    A chamber consists of:

      empty space
      gases
      vacuum pixels

    Solid materials stop the chamber scan.
    */

    function isChamberSpace(x, y) {

        if (
            x < 0 ||
            y < 0 ||
            x >= width ||
            y >= height
        ) {
            return false;
        }


        const pixel = getPixel(x, y);


        // Empty space
        if (!pixel) {
            return true;
        }


        // Gas
        if (isGas(pixel)) {
            return true;
        }


        // Existing vacuum
        if (isVacuum(pixel)) {
            return true;
        }


        return false;
    }


    /*
    ============================================================
    FIND CHAMBER
    ============================================================
    */

    function findChamber(pump) {

        const queue = [];
        const visited = new Set();
        const chamber = [];

        let escaped = false;


        const startPositions = [

            [pump.x + 1, pump.y],
            [pump.x - 1, pump.y],
            [pump.x, pump.y + 1],
            [pump.x, pump.y - 1]

        ];


        for (const p of startPositions) {

            if (isChamberSpace(p[0], p[1])) {

                queue.push(p);

            }

        }


        while (queue.length > 0) {

            const current = queue.shift();

            const x = current[0];
            const y = current[1];

            const key = x + "," + y;


            if (visited.has(key)) {
                continue;
            }


            visited.add(key);


            /*
            Safety limit.
            */

            if (visited.size > MAX_CHAMBER_SIZE) {

                escaped = true;
                break;

            }


            /*
            If the chamber reaches the canvas border,
            it is considered open.
            */

            if (
                x <= 0 ||
                y <= 0 ||
                x >= width - 1 ||
                y >= height - 1
            ) {

                escaped = true;

            }


            chamber.push([x, y]);


            const neighbors = [

                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]

            ];


            for (const n of neighbors) {

                const nx = n[0];
                const ny = n[1];

                const nkey = nx + "," + ny;


                if (
                    !visited.has(nkey) &&
                    isChamberSpace(nx, ny)
                ) {

                    queue.push([nx, ny]);

                }

            }

        }


        return {

            sealed: !escaped,

            pixels: chamber

        };

    }


    /*
    ============================================================
    CALCULATE PRESSURE
    ============================================================
    */

    function calculatePressure(chamber) {

        let vacuumCount = 0;
        let gasCount = 0;
        let emptyCount = 0;


        for (const p of chamber) {

            const pixel = getPixel(p[0], p[1]);


            if (!pixel) {

                emptyCount++;

                continue;

            }


            if (isVacuum(pixel)) {

                vacuumCount++;

                continue;

            }


            if (isGas(pixel)) {

                gasCount++;

            }

        }


        const total =
            vacuumCount +
            gasCount +
            emptyCount;


        if (total <= 0) {

            return 0;

        }


        /*
        Gas = atmospheric pressure.
        Vacuum = no pressure.

        Empty cells are considered ambient air until
        they are converted into vacuum.
        */

        const pressureCells =
            gasCount + emptyCount;


        return Math.max(
            0,
            Math.min(
                1,
                pressureCells / total
            )
        );

    }


    /*
    ============================================================
    CONVERT EMPTY/GAS INTO VACUUM
    ============================================================
    */

    function evacuateChamber(pump, chamber) {

        let converted = 0;


        /*
        Randomize the chamber so the evacuation
        looks more natural.
        */

        const shuffled = chamber.slice();

        shuffled.sort(function () {

            return Math.random() - 0.5;

        });


        for (const p of shuffled) {

            if (converted >= PUMP_RATE) {
                break;
            }


            const x = p[0];
            const y = p[1];

            const pixel = getPixel(x, y);


            /*
            Don't touch the pump.
            */

            if (
                x === pump.x &&
                y === pump.y
            ) {

                continue;

            }


            /*
            Already vacuum.
            */

            if (isVacuum(pixel)) {

                continue;

            }


            /*
            Gas or empty space can be evacuated.
            */

            if (
                !pixel ||
                isGas(pixel)
            ) {

                const newPixel =
                    tryCreate(
                        "vacuum",
                        x,
                        y,
                        true
                    );


                if (newPixel) {

                    newPixel.pressure = 0;

                    newPixel.chamberPressure = 1;

                    converted++;

                }

            }

        }

    }


    /*
    ============================================================
    UPDATE VACUUM PIXELS
    ============================================================
    */

    function updateVacuumPressure(chamber, pressure) {

        for (const p of chamber) {

            const pixel =
                getPixel(p[0], p[1]);


            if (
                pixel &&
                pixel.element === "vacuum"
            ) {

                pixel.chamberPressure = pressure;

            }

        }

    }


    /*
    ============================================================
    RELEASE VACUUM
    ============================================================
    */

    function releaseVacuum(chamber) {

        for (const p of chamber) {

            const x = p[0];
            const y = p[1];

            const pixel =
                getPixel(x, y);


            if (
                pixel &&
                pixel.element === "vacuum"
            ) {

                /*
                Delete the vacuum marker.

                This allows normal Sandboxels gases
                to enter the area again.
                */

                tryDelete(x, y);

            }

        }

    }


    /*
    ============================================================
    PRESSURE TEXT
    ============================================================
    */

    function pressureText(pressure) {

        if (pressure <= 0.001) {

            return "0.001 atm";

        }


        return pressure.toFixed(3) + " atm";

    }


    function vacuumPercent(pressure) {

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (1 - pressure) * 100
                )
            )
        );

    }


    /*
    ============================================================
    VACUUM
    ============================================================
    */

    elements.vacuum = {

        name: "Vacuum",

        /*
        Transparent / almost invisible.

        The canvas background in your version is black,
        so the vacuum is practically invisible.
        */

        color: "#00000000",

        behavior: behaviors.WALL,

        category: "special",

        state: "solid",

        density: 0,

        hardness: 1,

        noMix: true,

        insulate: true,


        desc:
            "Evacuated space with simulated vacuum pressure.",


        /*
        IMPORTANT:

        This is what appears in Sandboxels' normal
        bottom-right element information when
        hovering over the vacuum.
        */

        hoverStat: function (pixel) {

            const pressure =
                pixel.chamberPressure !== undefined
                    ? pixel.chamberPressure
                    : 0;


            const vacuum =
                vacuumPercent(pressure);


            return (
                "Vacuum | Pressure: " +
                pressureText(pressure) +
                " | Vacuum: " +
                vacuum +
                "%"
            );

        },


        tick: function (pixel) {

            /*
            Vacuum remains stationary.
            */

        }

    };


    /*
    ============================================================
    VACUUM PUMP
    ============================================================
    */

    elements.vacuum_pump = {

        name: "Vacuum Pump",

        color: [

            "#303030",
            "#505050",
            "#707070",
            "#202020"

        ],

        behavior: behaviors.WALL,

        category: "machines",

        state: "solid",

        density: 7800,

        hardness: 1,

        noMix: true,


        desc:
            "Pumps air and gases out of a sealed chamber. " +
            "Click the pump to turn it on or off.",


        /*
        ========================================================
        CLICK = ON/OFF
        ========================================================
        */

        onClicked: function (pixel) {

            if (pixel.active === undefined) {

                pixel.active = true;

            }
            else {

                pixel.active = !pixel.active;

            }


            /*
            Force a visible update.
            */

            pixel.lastPumpResult = "";

        },


        /*
        ========================================================
        HOVER INFORMATION
        ========================================================
        */

        hoverStat: function (pixel) {

            const result =
                pixel.lastPumpResult || "";


            if (pixel.active) {

                if (result === "open") {

                    return (
                        "Vacuum Pump | ON | " +
                        "CHAMBER OPEN"
                    );

                }


                return (
                    "Vacuum Pump | ON | " +
                    "Pumping..."
                );

            }


            return "Vacuum Pump | OFF";

        },


        /*
        ========================================================
        PUMP TICK
        ========================================================
        */

        tick: function (pixel) {


            /*
            Default state.
            */

            if (pixel.active === undefined) {

                pixel.active = true;

            }


            /*
            Pump OFF
            */

            if (!pixel.active) {

                pixel.color = "#303030";

                return;

            }


            /*
            Only pump every few ticks.
            */

            if (
                pixelTicks %
                PUMP_INTERVAL !== 0
            ) {

                return;

            }


            /*
            Find chamber.
            */

            const result =
                findChamber(pixel);


            /*
            ----------------------------------------------------
            OPEN CHAMBER
            ----------------------------------------------------
            */

            if (!result.sealed) {

                pixel.lastPumpResult =
                    "open";


                pixel.color =
                    "#803030";


                /*
                Any existing vacuum disappears when
                the chamber is open.

                This represents the chamber filling
                with outside air.
                */

                releaseVacuum(
                    result.pixels
                );


                return;

            }


            /*
            ----------------------------------------------------
            SEALED CHAMBER
            ----------------------------------------------------
            */

            pixel.lastPumpResult =
                "sealed";


            pixel.color =
                "#303080";


            /*
            Remove gas / convert empty space into vacuum.
            */

            evacuateChamber(
                pixel,
                result.pixels
            );


            /*
            Calculate current pressure.
            */

            const pressure =
                calculatePressure(
                    result.pixels
                );


            /*
            Store pressure on pump.
            */

            pixel.chamberPressure =
                pressure;


            /*
            Update vacuum hover information.
            */

            updateVacuumPressure(
                result.pixels,
                pressure
            );


            /*
            Change pump color according to pressure.
            */

            if (pressure > 0.75) {

                pixel.color =
                    "#803030";

            }

            else if (pressure > 0.40) {

                pixel.color =
                    "#807030";

            }

            else if (pressure > 0.10) {

                pixel.color =
                    "#307080";

            }

            else {

                pixel.color =
                    "#303080";

            }

        }

    };


    /*
    ============================================================
    VACUUM GAUGE
    ============================================================
    */

    elements.vacuum_gauge = {

        name: "Vacuum Gauge",

        color: [

            "#333333",
            "#555555",
            "#777777"

        ],

        behavior: behaviors.WALL,

        category: "machines",

        state: "solid",

        density: 7800,

        hardness: 1,

        noMix: true,


        desc:
            "Shows the pressure inside the chamber.",


        hoverStat: function (pixel) {

            const pressure =
                pixel.chamberPressure !== undefined
                    ? pixel.chamberPressure
                    : 1;


            return (
                "Vacuum Gauge | Pressure: " +
                pressureText(pressure) +
                " | Vacuum: " +
                vacuumPercent(pressure) +
                "%"
            );

        },


        tick: function (pixel) {

            /*
            Don't update every frame.
            */

            if (pixelTicks % 10 !== 0) {
                return;
            }


            const result =
                findChamber(pixel);


            /*
            Open chamber.
            */

            if (!result.sealed) {

                pixel.color =
                    "#803030";

                pixel.chamberPressure =
                    OPEN_PRESSURE;

                return;

            }


            /*
            Closed chamber.
            */

            const pressure =
                calculatePressure(
                    result.pixels
                );


            pixel.chamberPressure =
                pressure;


            /*
            Gauge color.
            */

            if (pressure > 0.75) {

                pixel.color =
                    "#803030";

            }

            else if (pressure > 0.40) {

                pixel.color =
                    "#807030";

            }

            else if (pressure > 0.10) {

                pixel.color =
                    "#307080";

            }

            else {

                pixel.color =
                    "#303080";

            }

        }

    };


    /*
    ============================================================
    LOAD MESSAGE
    ============================================================
    */

    console.log(
        "%c[Vacuum Chamber V3] Loaded",
        "color:#5080ff;font-weight:bold"
    );

});