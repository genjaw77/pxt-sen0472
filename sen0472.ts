//% color="#8A2BE2" icon="\uf0c2"
//% block="SEN0472 O3"
namespace SEN0472 {

    // Adresse I2C par défaut du SEN0472
    let adresseI2C = 0x74

    // Commandes du protocole DFRobot
    const CMD_GAS = 0x86
    const CMD_TEMP = 0x87

    /**
     * Envoie une demande au capteur et renvoie la réponse (9 octets).
     * Renvoie un buffer vide si la réponse est invalide.
     */
    function demander(commande: number): Buffer {
        let t = pins.createBuffer(10)
        t.setNumber(NumberFormat.UInt8LE, 0, 0x00)
        t.setNumber(NumberFormat.UInt8LE, 1, 0xFF)
        t.setNumber(NumberFormat.UInt8LE, 2, 0x01)
        t.setNumber(NumberFormat.UInt8LE, 3, commande)
        let somme = 0x01 + commande
        t.setNumber(NumberFormat.UInt8LE, 9, ((~somme) + 1) & 0xFF)

        pins.i2cWriteBuffer(adresseI2C, t, false)
        basic.pause(100)
        let r = pins.i2cReadBuffer(adresseI2C, 9, false)

        if (r.length != 9) {
            return pins.createBuffer(0)
        }
        if (r.getNumber(NumberFormat.UInt8LE, 0) != 0xFF) {
            return pins.createBuffer(0)
        }
        if (r.getNumber(NumberFormat.UInt8LE, 1) != commande) {
            return pins.createBuffer(0)
        }
        let s = 0
        for (let i = 1; i < 8; i++) {
            s += r.getNumber(NumberFormat.UInt8LE, i)
        }
        if ((((~s) + 1) & 0xFF) != r.getNumber(NumberFormat.UInt8LE, 8)) {
            return pins.createBuffer(0)
        }
        return r
    }

    /**
     * Attend que le capteur soit prêt.
     */
    //% block="SEN0472 initialiser"
    //% weight=100
    export function initialiser(): void {
        basic.pause(1000)
    }

    /**
     * Vrai si le capteur répond correctement.
     */
    //% block="SEN0472 est connecté"
    //% weight=95
    export function estConnecte(): boolean {
        return demander(CMD_GAS).length == 9
    }

    /**
     * Concentration d'ozone en ppm (résolution 0,1 ppm).
     * Renvoie -1 en cas d'erreur de lecture.
     */
    //% block="SEN0472 lire O3 (ppm)"
    //% weight=90
    export function lireO3(): number {
        let r = demander(CMD_GAS)
        if (r.length == 0) {
            return -1
        }
        let brut = r.getNumber(NumberFormat.UInt8LE, 2) * 256 + r.getNumber(NumberFormat.UInt8LE, 3)
        let decimales = r.getNumber(NumberFormat.UInt8LE, 5)
        if (decimales == 1) {
            return brut / 10
        }
        if (decimales == 2) {
            return brut / 100
        }
        return brut
    }

    /**
     * Température de la carte en °C.
     * Renvoie -999 en cas d'erreur de lecture.
     */
    //% block="SEN0472 température (°C)"
    //% weight=80
    export function temperature(): number {
        let r = demander(CMD_TEMP)
        if (r.length == 0) {
            return -999
        }
        let adc = r.getNumber(NumberFormat.UInt8LE, 2) * 256 + r.getNumber(NumberFormat.UInt8LE, 3)
        let tension = 3 * adc / 1024
        if (tension <= 0 || tension >= 3) {
            return -999
        }
        let rth = tension * 10000 / (3 - tension)
        return 1 / (1 / (273.15 + 25) + 1 / 3380.13 * Math.log(rth / 10000)) - 273.15
    }

    /**
     * Change l'adresse I2C utilisée (0x74 = 116 par défaut).
     */
    //% block="SEN0472 utiliser adresse I2C $adresse"
    //% adresse.min=1 adresse.max=127 adresse.defl=116
    //% weight=70
    export function utiliserAdresse(adresse: number): void {
        adresseI2C = adresse
    }

    /**
     * Adresse I2C actuellement utilisée.
     */
    //% block="SEN0472 adresse I2C"
    //% weight=60
    export function adresse(): number {
        return adresseI2C
    }
}
