import './style.css'
import Phaser from 'phaser'

const sizes = {
  width: 960,
  height: 540,
}

class GameScene extends Phaser.Scene{
  constructor(){
    super("scene-game")
    this.player
    this.cursors
    this.keys
    this.playerSpeed = 500
    this.playerLasers
    this.playerLaserSpeed = 20
    this.playerLaserCooldown = 250
    this.playerLaserLastFired = 0 // Timestamp of the last fired laser
    this.meteors
    this.meteorCooldown = 2500
    this.meteorLastSpawned = 0
  }

  preload ()
  {
    this.load.image("bg", "/assets/Backgrounds/purple.png")
    this.load.image("player", "/assets/playerShip1_orange.png")
    this.load.image("playerLaser", "/assets/Lasers/laserBlue01.png")
    this.load.image("bigMeteor1", "/assets/Meteors/meteorBrown_big1.png")
    this.load.image("bigMeteor2", "/assets/Meteors/meteorBrown_big2.png")
    this.load.image("bigMeteor3", "/assets/Meteors/meteorBrown_big3.png")
    this.load.image("bigMeteor4", "/assets/Meteors/meteorBrown_big4.png")

    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE')

    this.boundsCollisionCategory = this.matter.world.nextCategory();
    this.playerCollisionCategory = this.matter.world.nextCategory();
    this.playerLaserCollisionCategory = this.matter.world.nextCategory();
    this.enemyCollisionCategory = this.matter.world.nextCategory();
  }

  create ()
  {

    this.bg = this.add.tileSprite(0,0,sizes.width,sizes.height,"bg").setOrigin(0,0)

    // Create a Matter.js collision category for world bounds

    this.player = this.matter.add.image(sizes.width-(sizes.width-100),(sizes.height/2)-40, "player")
    this.player.angle = 90
    this.player.setFixedRotation() // Prevent rotation when colliding
    this.player.setCollisionCategory(this.playerCollisionCategory) // Set player to collide with world bounds
    

    this.playerLasers = this.add.group();
    this.meteors = this.add.group();

    // Create world bounds
    const { width, height } = sizes
    const thickness = 64 // Thickness of the bounds
    this.matter.world.setBounds(0, 0, width, height, thickness, true, true, true, true, { collisionFilter: { category: this.boundsCollisionCategory } })

    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;


        // Check if collision involves playerLaser and meteor
        if ((bodyA.collisionFilter.category === this.playerLaserCollisionCategory && bodyB.collisionFilter.category === this.enemyCollisionCategory) ||
          (bodyA.collisionFilter.category === this.enemyCollisionCategory && bodyB.collisionFilter.category === this.playerLaserCollisionCategory)) {
        
          const laser = bodyA.collisionFilter.category === this.playerLaserCollisionCategory ? bodyA : bodyB;
          const meteor = bodyA.collisionFilter.category === this.enemyCollisionCategory ? bodyA : bodyB;

          this.damageEntity(meteor.gameObject, laser.gameObject);
          laser.gameObject.destroy()
      }
      });
    });
  }

  update (time, delta)
  {
    this.playerLasers.getChildren().forEach(laser => {
      // Check if laser is outside the world bounds
      if (this.isOutsideWorldBoundsRight(laser)) {
        laser.destroy(); // Remove the laser 
      }
    });

    this.meteors.getChildren().forEach(meteor => {
      if (this.isOutsideWorldBoundsLeft(meteor)) {
        meteor.destroy();
      }
    });

    const scrollSpeed = 1;
    
    this.bg.tilePositionX += scrollSpeed;

    const {left, right, up, down} = this.cursors
    const { W, A, S, D, SPACE } = this.keys
    const speed = this.playerSpeed * (delta / 1000);

    const cam = this.cameras.main

    if(right.isDown)
    {
      cam.scrollX+=10
    } else if(left.isDown) {
      cam.scrollX-=10
    }

    if (left.isDown || A.isDown)
    {
      this.player.setVelocityX(-speed) 
    } 
    else if (right.isDown || D.isDown)
    {
      this.player.setVelocityX(speed)
    } else {
      this.player.setVelocityX(0)
    }

    if (up.isDown || W.isDown)
    {
      this.player.setVelocityY(-speed)
    } 
    else if (down.isDown || S.isDown)
    {
      this.player.setVelocityY(speed)
    } else {
      this.player.setVelocityY(0)
    }

    if (SPACE.isDown) {
      this.fireLaser(time);
    }

    this.createMeteor(time)
  }

  isOutsideWorldBoundsLeft(object) {
    const { width, height } = sizes;
    const boundsX = width; // Half of the game width
    const boundsY = height; // Half of the game height

    // Determine if object is outside bounds
    return (
      object.x < -boundsX || object.y < -boundsY || object.y > boundsY
    );
  }

  isOutsideWorldBoundsRight(object) {
    const { width, height } = sizes;
    const boundsX = width; // Half of the game width
    const boundsY = height; // Half of the game height

    // Determine if object is outside bounds
    return (
      object.x > boundsX || object.y < -boundsY || object.y > boundsY
    );
  }

  fireLaser(time) {
    // Check if the cooldown period has elapsed
    if (time > this.playerLaserLastFired + this.playerLaserCooldown) {
      this.spawnLaser();
      this.playerLaserLastFired = time; // Update the last fired time
    }
  }

  createMeteor(time) {
    if (time > this.meteorLastSpawned + this.meteorCooldown) {
      this.spawnMeteor();
      this.meteorLastSpawned = time; // Update the last fired time
    }
  }

  spawnLaser() {
    const laser = this.matter.add.image(this.player.x, this.player.y, 'playerLaser');
    laser.angle = 90;
    laser.setVelocityX(this.playerLaserSpeed)
    laser.setFriction(0);
    laser.setFrictionAir(0);
    laser.setCollisionCategory(this.playerLaserCollisionCategory)
    laser.setCollidesWith([this.enemyCollisionCategory])

    laser.dmg = 1

    this.playerLasers.add(laser)
  }

  spawnMeteor(level=1) {
    const meteors = ['bigMeteor1', 'bigMeteor2', 'bigMeteor3', 'bigMeteor4']
    const spawnMeteor = Phaser.Math.RND.pick(meteors); // Use Phaser's random method
    const speed = Phaser.Math.Between(3, 5) * level;
    const angle = Phaser.Math.Between(0, 360);
    const spawnY = Phaser.Math.Between(0, sizes.height); // Ensure spawnY is within game height
    //const spawnY = 250

    const meteor = this.matter.add.image(sizes.width+50 , spawnY, spawnMeteor)
    meteor.angle = angle
    meteor.setVelocityX(-speed)
    meteor.setFriction(0);
    meteor.setFrictionAir(0);
    meteor.setCollisionCategory(this.enemyCollisionCategory)
    meteor.setCollidesWith([this.enemyCollisionCategory, this.playerCollisionCategory, this.playerLaserCollisionCategory, this.boundsCollisionCategory])

    meteor.hp = 3

    this.meteors.add(meteor)
  }

  damageEntity(entity, attack) {
    entity.hp -= attack.dmg;

    if(entity.hp <= 0) {
      entity.destroy();
    }
  }
}

var config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: gameCanvas,
  physics: {
    default: 'matter',
    matter:{
      gravity: {y: 0},
      debug: true
    }
  },
  scene: [GameScene]
};

var game = new Phaser.Game(config);