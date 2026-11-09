
//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"

namespace SEN0472 {

    // Adresse I2C par défaut
    let adresseI2C = 0x74

    // Commandes DFRobot
    const CMD_MODE = 0x78
    const CMD_GAS = 0x86
    const CMD_TEMP = 0x87

    // Mode passif
    const MODE_PASSIF = 0x04

    // Registre I2C
    const REGISTRE = 0x00

    /**
     * Calcule le checksum DFRobot
     */
    function checksum(data: number[]): number {

        let somme = 0

        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        return ((~somme) + 1) & 0xFF
    }

    /**
     * Construit une trame de 9 octets
     */
    function construireTrame(
        commande: number,
        parametre: number = 0
    ): number[] {

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
     * Envoie une commande I2C
     */
    function envoyerCommande(
        commande: number,
        parametre: number = 0
    ): void {

        let trame = construireTrame(
            commande,
            parametre
        )

        let buffer = pins.createBuffer(10)

        buffer[0] = REGISTRE

        for (let i = 0; i < 9; i++) {
            buffer[i + 1] = trame[i]
        }

        pins.i2cWriteBuffer(
            adresseI2C,
            buffer,
            false
        )
    }

    /**
     * Lit la réponse du capteur
     */
    function lireReponse(): Buffer {

        pins.i2cWriteNumber(
            adresseI2C,
            REGISTRE,
            NumberFormat.UInt8BE,
            false
        )

        basic.pause(10)

        return pins.i2cReadBuffer(
            adresseI2C,
            9,
            false
        )
    }

    /**
     * Vérifie la validité d'une trame
     */
    function trameValide(data: Buffer): boolean {

        if (data.length != 9) {
            return false
        }

        let somme = 0

        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        let verification =
            ((~somme) + 1) & 0xFF

        return data[0] == 0xFF &&
            verification == data[8]
    }

    /**
     * Initialise le capteur
     */
    //% block="SEN0472 initialiser"
    //% weight=100
    export function initialiser(): void {

        envoyerCommande(
            CMD_MODE,
            MODE_PASSIF
        )

        basic.pause(100)

        let reponse = lireReponse()
    }

    /**
     * Vérifie la connexion
     */
    //% block="SEN0472 est connecté"
    //% weight=95
    export function estConnecte(): boolean {

        envoyerCommande(CMD_GAS)

        basic.pause(10)

        let data = lireReponse()

        return trameValide(data) &&
            data[1] == CMD_GAS &&
            data[4] == 0x2A
    }

    /**
     * Lit la concentration d'ozone en ppm
     */
    //% block="SEN0472 lire O3 (ppm)"
    //% weight=90
    export function lireO3(): number {

        envoyerCommande(CMD_GAS)

        basic.pause(100)

        let data = lireReponse()

        if (!trameValide(data)) {
            return -1
        }

        if (data[1] != CMD_GAS ||
            data[4] != 0x2A) {
            return -1
        }

        let valeur =
            data[2] * 256 + data[3]

        let decimales = data[5]

        if (decimales == 1) {
            return valeur / 10
        }

        if (decimales == 2) {
            return valeur / 100
        }

        if (decimales == 0) {
            return valeur
        }

        return -1
    }

    /**
     * DIAGNOSTIC : affiche les 9 octets reçus
     * Les valeurs défilent sur la matrice LED.
     */
    //% block="SEN0472 diagnostic données brutes"
    //% weight=85
    export function diagnostic(): void {

        envoyerCommande(CMD_GAS)

        basic.pause(100)

        let data = lireReponse()

        for (let i = 0; i < 9; i++) {

            basic.showNumber(data[i])

            basic.pause(500)
        }

        basic.clearScreen()
    }

    /**
     * Lit la température en °C
     */
    //% block="SEN0472 température (°C)"
    //% weight=80
    export function temperature(): number {

        envoyerCommande(CMD_TEMP)

        basic.pause(100)

        let data = lireReponse()

        if (!trameValide(data) ||
            data[1] != CMD_TEMP) {
            return -1
        }

        let adc =
            data[2] * 256 + data[3]

        let tension = 3 * adc / 1024

        if (tension <= 0 || tension >= 3) {
            return -1
        }

        let resistance =
            tension * 10000 / (3 - tension)

        let temperature =
            1 / (
                1 / (273.15 + 25) +
                1 / 3380.13 *
                Math.log(resistance / 10000)
            ) - 273.15

        return temperature
    }

    /**
     * Modifie l'adresse I2C
     */
    //% block="SEN0472 utiliser adresse I2C $adresse"
    //% adresse.min=1 adresse.max=127 adresse.defl=116
    //% weight=70
    export function utiliserAdresse(
        adresse: number
    ): void {

        adresseI2C = adresse
    }

    /**
     * Renvoie l'adresse I2C
     */
    //% block="SEN0472 adresse I2C"
    //% weight=60
    export function adresse(): number {

        return adresseI2C
    }
}
