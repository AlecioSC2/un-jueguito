import Phaser from 'phaser';
import Hero from '../entities/Hero';

const HERO_SPRITES = {
  fall: {
    animationName: 'falling',
    frameRate: 10,
    repeat: -1,
  },
  run: {
    animationName: 'running',
    frameRate: 10,
    repeat: -1,
  },
  flip: {
    animationName: 'flipping',
    frameRate: 30,
    repeat: 0,
  },
  pivot: {
    animationName: 'pivoting',
  },
  jump: {
    animationName: 'jumping',
    frameRate: 10, //every 10th of a second
    repeat: -1,
  },
  idle: {
    animationName: 'idle',
  },
  die: {
    animationName: 'dead',
  },
};

class Game extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {}

  preload() {
    Object.keys(HERO_SPRITES).forEach((spriteName) => {
      this.load.spritesheet(
        `hero-${spriteName}-sheet`,
        `assets/hero/${spriteName}.png`,
        {
          frameWidth: 32,
          frameHeight: 64,
        }
      );
    });

    this.load.tilemapTiledJSON('level-1', 'assets/tilemaps/level-1.json');
    this.load.spritesheet('world-1-sheet', 'assets/tilesets/world-1.png', {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 2,
    });
    this.load.image('clouds-sheet', 'assets/tilesets/clouds.png');

    this.load.audio('background', 'assets/audio/background.mp3');
    this.load.audio('jump', 'assets/audio/jump.wav');
  }

  create(data) {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.addMap();
    this.addHero();

    const backgroundMusic = this.sound.add('background', { loop: true });
    const jump = this.sound.add('jump');

    backgroundMusic.play();
    //this.input.keyboard.on('keydown-SPACE', () => {
    //  console.log('space');
    //})
    //this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    //console.log('space', this.space);
    //this.space.on('up', () => console.log('release'))

    Object.keys(HERO_SPRITES).forEach((spriteName) => {
      const frames = this.anims.generateFrameNumbers(
        `hero-${spriteName}-sheet`
      );
      this.anims.create({
        key: `hero-${HERO_SPRITES[spriteName].animationName}`,
        frames,
        frameRate: HERO_SPRITES[spriteName].frameRate,
        repeat: HERO_SPRITES[spriteName].repeat,
      });
    });

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    /*
    const platform = this.add.rectangle(220, 240, 260, 10, 0x4bcb7c);
    this.physics.add.existing(platform, true);
    this.physics.add.collider(this.hero, platform);
     */
  }

  addHero() {
    this.hero = new Hero(this, this.spawnCoords.x, this.spawnCoords.y);
    this.cameras.main.startFollow(this.hero);

    console.log(this.children);
    this.children.moveTo(
      this.hero,
      this.children.getIndex(this.map.getLayer('Foreground').tilemapLayer)
    );
    const groundCollider = this.physics.add.collider(
      this.hero,
      this.map.getLayer('Ground').tilemapLayer
    );

    const spikesCollider = this.physics.add.overlap(
      this.hero,
      this.spikeGroup,
      () => {
        this.hero.kill();
      }
    );

    this.hero.on('died', () => {
      groundCollider.destroy();
      spikesCollider.destroy();
      this.hero.body.setCollideWorldBounds(false);
      this.cameras.main.stopFollow();
    });
  }

  addMap() {
    this.map = this.make.tilemap({
      key: 'level-1',
    });
    const groundTiles = this.map.addTilesetImage('world-1', 'world-1-sheet');
    const backgroundTiles = this.map.addTilesetImage('clouds', 'clouds-sheet');
    const backgroundLayer = this.map.createStaticLayer(
      'Background',
      backgroundTiles
    );
    backgroundLayer.setScrollFactor(0.5);
    const groundLayer = this.map.createStaticLayer('Ground', groundTiles);
    groundLayer.setCollision([1, 2, 4], true);

    this.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.physics.world.setBoundsCollision(true, true, false, true);
    this.spikeGroup = this.physics.add.group({
      immovable: true,
      allowGravity: false,
    });
    this.map.getObjectLayer('Objects').objects.forEach((object) => {
      if (object.name === 'Start') {
        this.spawnCoords = { x: object.x, y: object.y };
      }

      if (object.gid === 7) {
        const spike = this.spikeGroup.create(
          object.x,
          object.y,
          'world-1-sheet',
          object.gid - 1
        );
        spike.setOrigin(0, 1);
        spike.setSize(object.width - 10, object.height - 5);
        spike.setOffset(5, 5);
      }
    });

    this.map.createStaticLayer('Foreground', groundTiles);

    //const debugGraphics = this.add.graphics();
    //groundLayer.renderDebug(debugGraphics);
  }

  update(time, delta) {
    const cameraBottom = this.cameras.main.getWorldPoint(
      0,
      this.cameras.main.height
    ).y;
    if (this.hero.isDead() && this.hero.getBounds().top > cameraBottom + 50) {
      this.hero.destroy();
      this.addHero();
    }
  }
}

export default Game;
