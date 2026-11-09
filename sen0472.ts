
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
     * Calcul du checksum
     */
    function checksum(data: number[]): number {
        let somme = 0

        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        return ((~somme) + 1) & 0xFF
    }

    /**
     * Construction d'une trame
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
     * Envoi d'une commande I2C
     */
    function envoyerCommande(
        commande: number,
        parametre: number = 0
    ): void {

        let trame = construireTrame(commande, parametre)
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
     * Lecture de la réponse
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
     * Lecture de la trame ozone
     */
    function lireTrameGaz(): Buffer {

        envoyerCommande(CMD_GAS)

        basic.pause(100)

        return lireReponse()
    }

    /**
     * Vérification de la trame
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
     * INITIALISATION
     */
    //% block="SEN0472 initialiser"
    //% weight=100
    export function initialiser(): void {

        envoyerCommande(
            CMD_MODE,
            MODE_PASSIF
        )

        basic.pause(100)
    }

    /**
     * VERIFICATION CONNEXION
     */
    //% block="SEN0472 est connecté"
    //% weight=95
    export function estConnecte(): boolean {

        let data = lireTrameGaz()

        return trameValide(data) &&
            data[1] == CMD_GAS &&
            data[4] == 0x2A
    }

    /**
     * LECTURE DES 9 OCTETS
     */
    //% block="SEN0472 lire trame O3"
    //% blockHidden=true
    export function lireTrameO3(): string {

        let data = lireTrameGaz()
        let texte = ""

        for (let i = 0; i < 9; i++) {

            texte += data[i]

            if (i < 8) {
                texte += ","
            }
        }

        return texte
    }

    /**
     * CALCUL OZONE DEPUIS LA TRAME
     */
    //% block="SEN0472 calculer O3 depuis trame $texte"
    //% weight=88
    export function lireO3DepuisTrame(
        texte: string
    ): number {

        let valeurs = texte.split(",")

        if (valeurs.length != 9) {
            return -1
        }

        let d0 = parseInt(valeurs[0])
        let d1 = parseInt(valeurs[1])
        let d2 = parseInt(valeurs[2])
        let d3 = parseInt(valeurs[3])
        let d4 = parseInt(valeurs[4])
        let d5 = parseInt(valeurs[5])
        let d6 = parseInt(valeurs[6])
        let d7 = parseInt(valeurs[7])
        let d8 = parseInt(valeurs[8])

        let data = pins.createBuffer(9)

        data[0] = d0
        data[1] = d1
        data[2] = d2
        data[3] = d3
        data[4] = d4
        data[5] = d5
        data[6] = d6
        data[7] = d7
        data[8] = d8

        if (!trameValide(data) ||
            d1 != CMD_GAS ||
            d4 != 0x2A) {
            return -1
        }

        let valeur = d2 * 256 + d3

        if (d5 == 0) {
            return valeur
        }

        if (d5 == 1) {
            return valeur / 10
        }

        if (d5 == 2) {
            return valeur / 100
        }

        return -1
    }

    /**
     * LECTURE OZONE BRUT
     */
    //% block="SEN0472 lire O3 brut (ppm)"
    //% weight=90
    export function lireO3Brut(): number {

        let texte = lireTrameO3()

        return lireO3DepuisTrame(texte)
    }

    /**
     * LECTURE OZONE
     */
    //% block="SEN0472 lire O3 (ppm)"
    //% weight=85
    export function lireO3(): number {

        return lireO3Brut()
    }

    /**
     * TEMPERATURE
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

        let adc = data[2] * 256 + data[3]

        let tension = 3 * adc / 1024

        if (tension <= 0 || tension >= 3) {
            return -1
        }

        let resistance =
            tension * 10000 / (3 - tension)

        let temp =
            1 / (
                1 / 298.15 +
                1 / 3380.13 *
                Math.log(resistance / 10000)
            ) - 273.15

        return Math.round(temp * 100) / 100
    }

    /**
     * DIAGNOSTIC DES DONNEES
     */
    //% block="SEN0472 diagnostic données brutes"
    //% weight=70
    export function diagnostic(): void {

        let data = lireTrameGaz()

        for (let i = 0; i < 9; i++) {

            basic.showString("D" + i)

            basic.showNumber(data[i])

            basic.pause(1000)
        }

        basic.clearScreen()
    }

    /**
     * MODIFIER ADRESSE I2C
     */
    //% block="SEN0472 utiliser adresse I2C $adresse"
    //% adresse.min=1 adresse.max=127 adresse.defl=116
    //% weight=60
    export function utiliserAdresse(
        adresse: number
    ): void {

        adresseI2C = adresse
    }

    /**
     * LIRE ADRESSE I2C
     */
    //% block="SEN0472 adresse I2C"
    //% weight=50
    export function adresse(): number {

        return adresseI2C
    }
}
