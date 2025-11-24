// Keys are Item IDs from inventory.json
export const recipes = {
    7: { // Pistol Clip
        output: 1,
        inputs: [
            { name: "Stahl", quantity: 5, craftable: true },
            { name: "S-Pulver", quantity: 25 }
        ]
    },
    6: { // Stahl
        output: 2,
        inputs: [
            { name: "Eisen", quantity: 4 },
            { name: "Kohle", quantity: 2 }
        ]
    },
    17: { // Platine
        output: 2,
        inputs: [
            { name: "E-Schrott", quantity: 8 }
        ]
    },
    14: { // Weißwein Kiste
        output: 1,
        inputs: [{ name: "Weintrauben Grün", quantity: 3 }]
    },
    13: { // Rotwein Kiste
        output: 1,
        inputs: [{ name: "Weintrauben Rot", quantity: 6 }]
    },
    16: { // Tabak
        output: 2,
        inputs: [{ name: "Tabak Blatt", quantity: 6 }]
    },
    10: { // Weste
        output: 1,
        inputs: [{ name: "Aramidfaser", quantity: 15 }]
    }
};
