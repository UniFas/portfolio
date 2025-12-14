import Game from './Game.js';
import MainMenu from './MainMenu.js';
import Preloader from './Preloader.js';
import ShinePostFX from './ShinePostFX.js';
import WipePostFX from './WipePostFX.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
        scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER
    },
    backgroundColor: '#002157',
    parent: 'game-frame',
    scene: [ Preloader, MainMenu, Game ],
    pipeline: { ShinePostFX, WipePostFX }
};

let game = new Phaser.Game(config);