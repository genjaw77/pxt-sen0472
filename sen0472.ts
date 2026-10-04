//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"

namespace SEN0472 {

    // Adresse I2C par défaut du SEN0472
    let adresseI2C = 0x74

    // Commandes du protocole DFRobot
    const CMD_MODE = 0x78
    const CMD_GAS = 0x86
    const CMD_TEMP = 0x87
    const CMD_ALL = 0x88

    // Mode passif : le micro:bit demande les données
    const MODE_PASSIF = 0x04

    /**
     * Calcule le checksum du protocole DFRobot.
     */
    function checksum(data: number[]): number {
        let somme = 0

        // Le checksum porte sur les octets 1 à 7
        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        return ((~somme) + 1) & 0xFF
    }

    /**
     * Construit une trame DFRobot de 9 octets.
     */
    function construireTrame(commande: number, parametre: number = 0): number[] {
        let trame = [
            0xFF,
            0x01,
            commande,
            parametre,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00
        ]

        trame[8] = checksum(trame)

        return trame
    }

    /**
     * Envoie une commande au SEN0472.
     */
    function envoyerCommande(commande: number, parametre: number = 0): void {

        let trame = construireTrame(commande, parametre)

        let buffer = pins.createBuffer(9)

        for (let i = 0; i < 9; i++) {
            buffer.setNumber(
                NumberFormat.UInt8BE,
                i,
                trame[i]
            )
        }

        pins.i2cWriteBuffer(
            adresseI2C,
            buffer,
            false
        )
    }

    /**
     * Lit 9 octets provenant du SEN0472.
     */
    function lireReponse(): Buffer {

        return pins.i2cReadBuffer(
            adresseI2C,
            9,
            false
        )
    }

    /**
     * Initialise le SEN0472.
     */
    //% block="SEN0472 initialiser"
    //% weight=100
    export function initialiser(): void {

        // Le mode passif est recommandé :
        // le micro:bit demande les données.
        envoyerCommande(CMD_MODE, MODE_PASSIF)

        basic.pause(100)
    }

    /**
     * Vérifie si le SEN0472 répond.
     */
    //% block="SEN0472 est connecté"
    //% weight=95
    export function estConnecte(): boolean {

        pins.i2cWriteNumber(
            adresseI2C,
            CMD_GAS,
            NumberFormat.UInt8BE,
            true
        )

        basic.pause(20)

        let data = pins.i2cReadBuffer(
            adresseI2C,
            9,
            false
        )

        return data.length == 9
    }

    /**
     * Lit la concentration d'ozone en ppm.
     *
     * Le SEN0472 utilise 0,1 ppm comme résolution.
     */
    //% block="SEN0472 lire O3 (ppm)"
    //% weight=90
    export function lireO3(): number {

        // Demande de lecture de concentration
        pins.i2cWriteNumber(
            adresseI2C,
            CMD_GAS,
            NumberFormat.UInt8BE,
            true
        )

        basic.pause(20)

        let data = pins.i2cReadBuffer(
            adresseI2C,
            9,
            false
        )

        if (data.length < 9) {
            return 0
        }

        // Vérification du checksum
        let somme = 0

        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        let verification = ((~somme) + 1) & 0xFF

        if (verification != data[8]) {
            return 0
        }

        // Octets 2 et 3 :
        // concentration haute + concentration basse
        let valeur = data[2] * 256 + data[3]

        // Octet 5 = nombre de décimales
        let decimales = data[5]

        if (decimales == 1) {
            return valeur / 10
        }

        if (decimales == 2) {
            return valeur / 100
        }

        return valeur
    }

    /**
     * Lit la température de la carte en °C.
     */
    //% block="SEN0472 température (°C)"
    //% weight=80
    export function temperature(): number {

        pins.i2cWriteNumber(
            adresseI2C,
            CMD_TEMP,
            NumberFormat.UInt8BE,
            true
        )

        basic.pause(20)

        let data = pins.i2cReadBuffer(
            adresseI2C,
            9,
            false
        )

        if (data.length < 9) {
            return 0
        }

        let somme = 0

        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        let verification = ((~somme) + 1) & 0xFF

        if (verification != data[8]) {
            return 0
        }

        let adc = data[2] * 256 + data[3]

        let tension = 3 * adc / 1024

        if (tension >= 3) {
            return 0
        }

        let resistance = tension * 10000 / (3 - tension)

        // Formule utilisée par DFRobot
        let temperature =
            1 /
            (
                1 / (273.15 + 25) +
                1 / 3380.13 * Math.log(resistance / 10000)
            ) - 273.15

        return temperature
    }

    /**
     * Modifie l'adresse I2C utilisée par l'extension.
     *
     * Cette fonction ne modifie PAS l'adresse du capteur.
     * Elle indique simplement à l'extension quelle adresse utiliser.
     */
    //% block="SEN0472 utiliser adresse I2C $adresse"
    //% adresse.min=1 adresse.max=127 adresse.defl=116
    //% weight=70
    export function utiliserAdresse(adresse: number): void {

        adresseI2C = adresse
    }

    /**
     * Renvoie l'adresse I2C actuellement utilisée.
     */
    //% block="SEN0472 adresse I2C"
    //% weight=60
    export function adresse(): number {

        return adresseI2C
    }
}
