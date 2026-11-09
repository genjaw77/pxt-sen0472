
//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"

namespace SEN0472 {

    let adresseI2C = 0x74

    const CMD_MODE = 0x78
    const CMD_GAS = 0x86
    const CMD_TEMP = 0x87
    const MODE_PASSIF = 0x04
    const REGISTRE = 0x00

    function checksum(data: number[]): number {
        let somme = 0
        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }
        return ((~somme) + 1) & 0xFF
    }

    function construireTrame(
        commande: number,
        parametre: number = 0
    ): number[] {
        let trame = [
            0xFF, 0x01, commande, parametre,
            0x00, 0x00, 0x00, 0x00, 0x00
        ]
        trame[8] = checksum(trame)
        return trame
    }

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

        pins.i2cWriteBuffer(adresseI2C, buffer, false)
    }

    function lireReponse(): Buffer {
        pins.i2cWriteNumber(
            adresseI2C,
            REGISTRE,
            NumberFormat.UInt8BE,
            false
        )
        basic.pause(10)
        return pins.i2cReadBuffer(adresseI2C, 9, false)
    }

    function lireTrameGaz(): Buffer {
        envoyerCommande(CMD_GAS)
        basic.pause(100)
        return lireReponse()
    }

    function trameValide(data: Buffer): boolean {
        if (data.length != 9) {
            return false
        }

        let somme = 0
        for (let i = 1; i < 8; i++) {
            somme += data[i]
        }

        let verification = ((~somme) + 1) & 0xFF

        return data[0] == 0xFF &&
            verification == data[8]
    }

    // INITIALISATION
    //% block="SEN0472 initialiser"
    //% weight=100
    export function initialiser(): void {
        envoyerCommande(CMD_MODE, MODE_PASSIF)
        basic.pause(100)
    }

    // CONNEXION
    //% block="SEN0472 est connecté"
    //% weight=95
    export function estConnecte(): boolean {
        let data = lireTrameGaz()
        return trameValide(data) &&
            data[1] == CMD_GAS &&
            data[4] == 0x2A
    }

    // NOUVEAU : LECTURE DES 9 OCTETS
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

    // NOUVEAU : CALCUL DE LA MESURE DEPUIS LA TRAME
    //% block="SEN0472 calculer O3 depuis trame $texte"
    //% weight=88
    export function lireO3DepuisTrame(texte: string): number {
        let valeurs = texte.split(",")

        if (valeurs.length != 9) {
            return -1
        }

        let data = pins.createBuffer(9)

        for (let i = 0; i < 9; i++) {
            data[i] = Number(valeurs[i])
        }

        if (!trameValide(data) ||
            data[1] != CMD_GAS ||
            data[4] != 0x2A) {
            return -1
        }

        let valeur = data[2] * 256 + data[3]
        let decimales = data[5]

        if (decimales == 0) return valeur
        if (decimales == 1) return valeur / 10
        if (decimales == 2) return valeur / 100

        return -1
    }

    // LECTURE OZONE BRUT
    //% block="SEN0472 lire O3 brut (ppm)"
    //% weight=90
    export function lireO3Brut(): number {
        return lireO3DepuisTrame(lireTrameO3())
    }

    // LECTURE OZONE
    //% block="SEN0472 lire O3 (ppm)"
    //% weight=85
    export function lireO3(): number {
        return lireO3Brut()
    }

    // TEMPERATURE
    //% block="SEN0472 température (°C)"
    //% weight=80
    export function temperature(): number {
        envoyerCommande(CMD_TEMP)
        basic.pause(100)

        let data = lireReponse()

        if (!trameValide(data) || data[1] != CMD_TEMP) {
            return -1
        }

        let adc = data[2] * 256 + data[3]
        let tension = 3 * adc / 1024

        if (tension <= 0 || tension >= 3) {
            return -1
        }

        let resistance = tension * 10000 / (3 - tension)

        let temp = 1 / (
            1 / 298.15 +
            1 / 3380.13 * Math.log(resistance / 10000)
        ) - 273.15

        return Math.round(temp * 100) / 100
    }

    // DIAGNOSTIC
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

    // ADRESSE I2C
    //% block="SEN0472 utiliser adresse I2C $adresse"
    //% adresse.min=1 adresse.max=127 adresse.defl=116
    //% weight=60
    export function utiliserAdresse(adresse: number): void {
        adresseI2C = adresse
    }

    //% block="SEN0472 adresse I2C"
    //% weight=50
    export function adresse(): number {
        return adresseI2C
    }
}
