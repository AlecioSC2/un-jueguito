import Phaser from 'phaser';
import StateMachine from 'javascript-state-machine';

class Hero extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hero-run-sheet', 0);
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.anims.play('hero-run');
    this.setOrigin(0.5, 1);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(12, 40);
    this.body.setOffset(12, 23);
    this.body.setMaxVelocity(250, 400);
    this.body.setDragX(1000);
    this.keys = scene.cursorKeys;
    this.input = {};
    this.setupMovement();
    this.setupAnimations();
  }

  setupAnimations() {
    this.animationState = new StateMachine({
      init: 'idle',
      transitions: [
        { name: 'idle', from: ['falling', 'running', 'pivoting'], to: 'idle' },
        { name: 'run', from: ['falling', 'idle', 'pivoting'], to: 'running' },
        { name: 'pivot', from: ['falling', 'running'], to: 'pivoting' },
        { name: 'jump', from: ['running', 'idle', 'pivoting'], to: 'jumping' },
        { name: 'flip', from: ['jumping', 'falling'], to: 'flipping' },
        {
          name: 'fall',
          from: ['idle', 'running', 'pivoting', 'jumping', 'flipping'],
          to: 'falling',
        },
        { name: 'die', from: '*', to: 'dead' },
      ],
      methods: {
        onEnterState: (lifecycle) => {
          console.log('hero-' + lifecycle.to);
          this.anims.play('hero-' + lifecycle.to);
          console.log(lifecycle.to);
        },
      },
    });

    this.animationPredicates = {
      idle: () => {
        return this.body.onFloor() && this.body.velocity.x === 0;
      },
      run: () => {
        return (
          this.body.onFloor() &&
          Math.sign(this.body.velocity.x) === (this.flipX ? -1 : 1)
        );
      },
      pivot: () => {
        return (
          this.body.onFloor() &&
          Math.sign(this.body.velocity.x) === (this.flipX ? 1 : -1)
        );
      },
      jump: () => {
        return this.body.velocity.y < 0;
      },
      flip: () => {
        return this.body.velocity.y < 0 && this.moveState.is('flipping');
      },
      fall: () => {
        return this.body.velocity.y > 0;
      },
    };
  }

  setupMovement() {
    this.moveState = new StateMachine({
      init: 'standing',
      transitions: [
        {
          name: 'jump',
          from: 'standing',
          to: 'jumping',
        },
        {
          name: 'flip',
          from: 'jumping',
          to: 'flipping',
        },
        {
          name: 'fall',
          from: 'standing',
          to: 'falling',
        },
        {
          name: 'touchdown',
          from: ['jumping', 'flipping', 'falling'],
          to: 'standing',
        },
        {
          name: 'die',
          from: ['jumping', 'flipping', 'falling', 'standing'],
          to: 'dead',
        },
      ],
      methods: {
        onJump: () => {
          this.scene.sound.play('jump');
          this.body.setVelocityY(-400);
        },
        onFlip: () => {
          this.body.setVelocityY(-300);
        },
        onDie: () => {
          this.body.setVelocity(0, -500);
          this.body.setAcceleration(0);
        },
      },
    });

    this.movePredicates = {
      jump: () => {
        return this.input.didPressJump;
      },
      flip: () => {
        return this.input.didPressJump;
      },
      fall: () => {
        return !this.body.onFloor();
      },
      touchdown: () => {
        return this.body.onFloor();
      },
    };
  }

  kill() {
    if (this.moveState.can('die')) {
      this.moveState.die();
      this.animationState.die();
      this.emit('died');
    }
  }

  isDead() {
    return this.moveState.is('dead');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    this.input.didPressJump =
      !this.isDead() && Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (!this.isDead() && this.keys.left.isDown) {
      this.body.setAccelerationX(-1000);
      this.setFlipX(true);
      this.body.offset.x = 8;
    } else if (!this.isDead() && this.keys.right.isDown) {
      this.body.setAccelerationX(1000);
      this.setFlipX(false);
      this.body.offset.x = 12;
    } else {
      this.body.setAccelerationX(0);
    }

    if (this.moveState.is('jumping') || this.moveState.is('flipping')) {
      if (!this.keys.space.isDown && this.body.velocity.y < -150) {
        this.body.setVelocityY(-160);
      }
    }

    const validMoveStateTransition = this.moveState
      .transitions()
      .find(
        (transition) =>
          this.movePredicates[transition] && this.movePredicates[transition]()
      );
    if (validMoveStateTransition) this.moveState[validMoveStateTransition]();

    const validAnimationTransition = this.animationState
      .transitions()
      .find(
        (transition) =>
          this.animationPredicates[transition] &&
          this.animationPredicates[transition]()
      );
    if (validAnimationTransition)
      this.animationState[validAnimationTransition]();
  }
}

export default Hero;
