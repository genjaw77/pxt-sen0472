
//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"

namespace SEN0472 {

    // Adresse I2C du capteur
    let adresseI2C = 0x74

    // Commandes du capteur
    const CMD_MODE = 0x78
    const CMD_GAZ = 0x86
    const CMD_TEMP = 0x87

    // Mode passif
    const MODE_PASSIF = 0x04

    // Registre
    const REGISTRE = 0x00

    let connecte = false
    let derniereTrame: Buffer = pins.createBuffer(9)

    // Vérification de la communication I2C
    function lireTrame(commande: number): Buffer {
        let requete = pins.createBuffer(4)

        requete[0] = 0xFF
        requete[1] = commande
        requete[2] = REGISTRE
        requete[3] = 0x00

        pins.i2cWriteBuffer(adresseI2C, requete, false)
        basic.pause(100)

        return pins.i2cReadBuffer(adresseI2C, 9, false)
    }

    // Vérification de la trame
    function trameValide(data: Buffer): boolean {
        if (data.length < 9) {
            return false
        }

        if (data[0] != 0xFF) {
            return false
        }

        return true
    }

    // Initialisation du capteur
    //% block="initialiser SEN0472"
    export function initialiser(): void {

        let mode = pins.createBuffer(4)

        mode[0] = 0xFF
        mode[1] = CMD_MODE
        mode[2] = REGISTRE
        mode[3] = MODE_PASSIF

        pins.i2cWriteBuffer(adresseI2C, mode, false)
        basic.pause(300)

        let test = lireTrame(CMD_GAZ)

        connecte = trameValide(test)

        if (connecte) {
            derniereTrame = test
        }
    }

    // Vérifier la connexion
    //% block="SEN0472 connecté"
    export function estConnecte(): boolean {
        let test = lireTrame(CMD_GAZ)
        connecte = trameValide(test)

        if (connecte) {
            derniereTrame = test
        }

        return connecte
    }

    // Lire les octets bruts
    //% block="SEN0472 lire O3 brut"
    export function lireO3Brut(): number {

        let data = lireTrame(CMD_GAZ)

        if (!trameValide(data)) {
            return -1
        }

        derniereTrame = data

        return data[4] * 256 + data[5]
    }

    // Lire la concentration d'ozone
    //% block="SEN0472 lire O3"
    export function lireO3(): number {

        let brut = lireO3Brut()

        if (brut < 0) {
            return -1
        }

        return brut / 100
    }

    // Lire la température
    //% block="SEN0472 température"
    export function temperature(): number {

        let data = lireTrame(CMD_TEMP)

        if (!trameValide(data)) {
            return -1
        }

        return data[4] * 256 + data[5]
    }

    // Diagnostic des 9 octets
    //% block="SEN0472 diagnostic"
    export function diagnostic(): void {

        let data = lireTrame(CMD_GAZ)

        for (let i = 0; i < 9; i++) {
            serial.writeValue("OCTET " + i, data[i])
        }
    }

    // Modifier l'adresse I2C
    //% block="SEN0472 utiliser adresse %adresse"
    export function utiliserAdresse(adresse: number): void {
        adresseI2C = adresse
    }

    // Obtenir l'adresse I2C
    //% block="SEN0472 adresse"
    export function adresse(): number {
        return adresseI2C
    }
}
