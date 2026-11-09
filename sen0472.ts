
//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"

namespace SEN0472 {

    // Adresse I2C du capteur
    let adresseI2C = 0x74

    // Commandes DFRobot
    const CMD_MODE = 0x78
    const CMD_GAS = 0x86
    const CMD_TEMP = 0x87

    // Mode passif
    const MODE_PASSIF = 0x04
    const REGISTRE = 0x00

    // Calcul du checksum
    function checksum(data: number[]): number {
        let somme = 0
        for (let i = 1; i <= 7; i++) {
            somme += data[i]
        }
        return ((~somme) + 1) & 0xFF
    }

    // Construction de la trame
    function construireTrame(commande: number, parametre: number): number[] {
        let data = [
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
        data[8] = checksum(data)
        return data
    }

    // Envoi d'une commande
    function envoyerCommande(commande: number, parametre: number) {
        let data = construireTrame(commande, parametre)
        let buffer = pins.createBuffer(10)
        buffer[0] = REGISTRE

        for (let i = 0; i < 9; i++) {
            buffer[i + 1] = data[i]
        }

        pins.i2cWriteBuffer(adresseI2C, buffer, false)
    }

    // Lecture de la réponse
    function lireReponse(): number[] {
        pins.i2cWriteNumber(adresseI2C, REGISTRE, NumberFormat.UInt8BE, false)
        basic.pause(10)

        let buffer = pins.i2cReadBuffer(adresseI2C, 9, false)
        let data: number[] = []

        for (let i = 0; i < 9; i++) {
            data.push(buffer[i])
        }

        return data
    }

    // Vérification de la trame
    function trameValide(data: number[]): boolean {
        if (data.length != 9) {
            return false
        }

        if (data[0] != 0xFF) {
            return false
        }

        return checksum(data) == data[8]
    }

    //% block="initialiser le capteur SEN0472"
    export function initialiser() {
        envoyerCommande(CMD_MODE, MODE_PASSIF)
        basic.pause(100)
    }

    //% block="capteur SEN0472 connecté"
    export function estConnecte(): boolean {
        envoyerCommande(CMD_GAS, 0x00)
        basic.pause(100)

        let data = lireReponse()

        return data[0] == 0xFF &&
            data[1] == CMD_GAS &&
            data[4] == 0x2A
    }

    //% block="lire ozone brut (ppm) SEN0472"
    export function lireO3Brut(): number {
        envoyerCommande(CMD_GAS, 0x00)
        basic.pause(100)

        let data = lireReponse()

        if (!trameValide(data)) {
            return -1
        }

        let valeur = data[2] * 256 + data[3]
        let decimal = data[5]

        if (decimal == 0) {
            return valeur
        } else if (decimal == 1) {
            return valeur / 10
        } else if (decimal == 2) {
            return valeur / 100
        }

        return -1
    }

    //% block="lire ozone SEN0472"
    export function lireO3(): number {
        return lireO3Brut()
    }

    //% block="lire température SEN0472"
    export function temperature(): number {
        envoyerCommande(CMD_TEMP, 0x00)
        basic.pause(100)

        let data = lireReponse()

        if (!trameValide(data)) {
            return -1
        }

        let valeur = data[2] * 256 + data[3]
        return valeur / 100
    }

    //% block="diagnostic SEN0472"
    export function diagnostic() {
        envoyerCommande(CMD_GAS, 0x00)
        basic.pause(100)

        let data = lireReponse()

        for (let i = 0; i < 9; i++) {
            basic.showString("D" + i)
            basic.showNumber(data[i])
            basic.pause(200)
        }
    }

    //% block="utiliser adresse I2C $adresse"
    export function utiliserAdresse(adresse: number) {
        adresseI2C = adresse
    }

    //% block="adresse I2C SEN0472"
    export function adresse(): number {
        return adresseI2C
    }
}
