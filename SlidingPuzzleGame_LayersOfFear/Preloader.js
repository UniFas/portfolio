export default class Preloader extends Phaser.Scene
{
    constructor ()
    {
        super('Preloader');
    }

    preload ()
    {
        this.load.setPath('assets');
        this.load.image('background', 'background.png');
        this.load.image('logo', 'logo.png');
        this.load.image('box', 'Box_outside.png');
        this.load.image('box-inside', 'Box_inside.png');
        this.load.image('pic1', 'LayersOfFear_1.png');
        this.load.image('pic2', 'LayersOfFear_2.png');
        this.load.image('pic3', 'LayersOfFear_3.png');

        this.load.audio('move','Audio_Whoosh.mp3');
        this.load.audio('win', 'Audio_Victory.mp3');
    }

    create ()
    {
        this.scene.start('MainMenu');
    }
}