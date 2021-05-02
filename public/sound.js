class Sounds {
    static init() {
        soundFormats("wav");

        Sounds.initialized = true;
        Sounds.effects = [];
        Sounds.volumes = [];

        Sounds.effects[Sounds.CLICK] = 
            loadSound("res/click.wav");
        Sounds.volumes[Sounds.CLICK] = 1;

        Sounds.effects[Sounds.PIECE_SLIDE] = 
            loadSound("res/piece_slide.wav");
        Sounds.volumes[Sounds.PIECE_SLIDE] = 1;

        Sounds.effects[Sounds.PIECE_ATTACK] = 
            loadSound("res/piece_attack.wav");
        Sounds.volumes[Sounds.PIECE_ATTACK] = 1;

        Sounds.effects[Sounds.WIN] = 
            loadSound("res/win.wav");
        Sounds.volumes[Sounds.WIN] = 1;

        Sounds.effects[Sounds.LOSS] = 
            loadSound("res/loss.wav");
        Sounds.volumes[Sounds.LOSS] = 1;
    }

    static get CLICK() {
        return 0;
    }
    static get PIECE_SLIDE() {
        return 1;
    }
    static get PIECE_ATTACK() {
        return 2;
    }
    static get WIN() {
        return 3;
    }
    static get LOSS() {
        return 4;
    }

    static play(sound) {
        if (Sounds.initialized) {
            Sounds.effects[sound].setVolume(Sounds.volumes[sound]);
            Sounds.effects[sound].play();
        }
    }
    static playLoop(sound) {
        if (Sounds.initialized) {
            Sounds.effects[sound].setVolume(Sounds.volumes[sound]);
            Sounds.effects[sound].loop();
        }
    }
    static isPlaying(sound) {
        if (Sounds.initialized) {
            return Sounds.effects[sound].isPlaying();
        }
    }
    static stop(sound) {
        if (Sounds.initialized) {
            Sounds.effects[sound].stop();
        }
    }
    static stopAll() {
        if (Sounds.initialized) {
            for (let i = 0; i < Sounds.effects.length; i++) {
                if (Sounds.effects[i].isPlaying()) {
                    Sounds.stop(i);
                }
            }
        }
    }
}