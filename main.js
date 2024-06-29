import './style.css'
import Phaser from 'phaser'
import WebFont from 'webfontloader'

const sizes = {
  width: 960,
  height: 540,
}

class GameScene extends Phaser.Scene{
  constructor(){
    super("scene-game")
    this.start = false
    this.startButton
    this.introText
    this.tutorialText
    this.countDownText
    this.countDownTime = 3
    this.countDownStart = 0
    this.scrollSpeed = .25
    this.scoreText
    this.score = 0
    this.scoreLastIncrement = 0
    this.scoreBuffer = 100
    this.playerHPUI
    this.player
    this.cursors
    this.keys
    this.playerHP = 3
    this.playerHPIcons
    this.playerLastHit = 0
    this.playerIFrames = 1000
    this.playerSpeed = 500
    this.playerLasers
    this.playerLaserSpeed = 12
    this.playerLaserCooldown = 300
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
    this.load.image("playerLaserParticle", "/assets/Lasers/laserBlue08.png")
    this.load.image("bigMeteor1", "/assets/Meteors/meteorBrown_big1.png")
    this.load.image("bigMeteor2", "/assets/Meteors/meteorBrown_big2.png")
    this.load.image("bigMeteor3", "/assets/Meteors/meteorBrown_big3.png")
    this.load.image("bigMeteor4", "/assets/Meteors/meteorBrown_big4.png")
    this.load.image("playerHPIcon", "/assets/UI/playerLife1_orange.png")

    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE')

    this.boundsCollisionCategory = 1;
    this.playerCollisionCategory = this.matter.world.nextCategory();
    this.playerLaserCollisionCategory = this.matter.world.nextCategory();
    this.enemyCollisionCategory = this.matter.world.nextCategory();
  }

  create ()
  {

    this.bg = this.add.tileSprite(0,0,sizes.width,sizes.height,"bg").setOrigin(0,0)

    this.spawnIntroText();
    this.spawnTutorialText();
    this.spawnCountDownText();
    this.spawnScoreText();
    

    // Create a Matter.js collision category for world bounds
    this.spawnPlayer();

    this.playerLasers = this.add.group();
    this.meteors = this.add.group();

    // Create world bounds
    const { width, height } = sizes
    const thickness = 64 // Thickness of the bounds
    this.matter.world.setBounds(0, 0, width, height, thickness, true, true, true, true)

    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

      // Check if collision involves player and enemy
        if ((bodyA.collisionFilter.category === this.playerCollisionCategory && bodyB.collisionFilter.category === this.enemyCollisionCategory) ||
          (bodyA.collisionFilter.category === this.enemyCollisionCategory && bodyB.collisionFilter.category === this.playerCollisionCategory)) {
        
          const player = bodyA.collisionFilter.category === this.playerCollisionCategory ? bodyA : bodyB;
          const enemy = bodyA.collisionFilter.category === this.enemyCollisionCategory ? bodyA : bodyB;
          
          
          const time = this.time.now // get current time

          if (time > this.playerLastHit + this.playerIFrames) {
            this.reducePlayerHP()
            this.playerLastHit = time
          }

        }
        
        // Check if collision involves playerLaser and enemy
        if ((bodyA.collisionFilter.category === this.playerLaserCollisionCategory && bodyB.collisionFilter.category === this.enemyCollisionCategory) ||
          (bodyA.collisionFilter.category === this.enemyCollisionCategory && bodyB.collisionFilter.category === this.playerLaserCollisionCategory)) {
        
          const laser = bodyA.collisionFilter.category === this.playerLaserCollisionCategory ? bodyA : bodyB;
          const enemy = bodyA.collisionFilter.category === this.enemyCollisionCategory ? bodyA : bodyB;

          this.damageEntity(enemy.gameObject, laser.gameObject);
          let laserParticle = laser.gameObject.laserParticle
          laserParticle.visible = true
          this.time.addEvent({
              delay: 100, // Delay in milliseconds (1000 ms = 1 second)
              callback: function() {laserParticle.destroy()},
              callbackScope: this,
              loop: laserParticle
          });
          laser.gameObject.destroy()
      }
      });
    });

    WebFont.load({
      google: {
        families: ["Press Start 2P"]
      },
      active: () => {
        this.introText.setFontFamily('"Press Start 2P"')
        this.tutorialText.setFontFamily('"Press Start 2P"')
        this.countDownText.setFontFamily('"Press Start 2P"')
        this.scoreText.setFontFamily('"Press Start 2P"')
      }
    })
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

    this.playerLasers.getChildren().forEach(laser => {
      if (laser.laserParticle) {
          laser.laserParticle.x = laser.x+20;
          laser.laserParticle.y = laser.y;
      }
    });

    this.bg.tilePositionX += this.scrollSpeed;

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

    if (this.start) {
      this.gameStart(time)
    } else if(this.countDownText && (SPACE.isDown && this.countDownText.visible == false)) {
      this.introText.destroy()
      this.tutorialText.destroy()
      this.countDownText.visible = true
      this.countDown = this.time.delayedCall()
      this.time.addEvent({
          delay: 1000, // Delay in milliseconds (1000 ms = 1 second)
          callback: this.countDownNow,
          callbackScope: this,
          loop: this.countDownText
      });
    }

    if(this.countDownText && (this.countDownText.visible && this.countDownTime >= -1)) {
      if(this.countDownTime == 0) {
        this.countDownText.x = sizes.width/2 - 50
        this.countDownText.setText('GO!')
      } else if(this.countDownTime == -1) {
        this.countDownText.destroy()
        this.createPlayerHP();
        this.scoreText.visible = true
        this.start = true
      } else {
        this.countDownText.setText(`${this.countDownTime}`)
      }
    }
  }

  gameStart(time) {
    // level 1
    this.accelerateScroll(2)
    this.generatePoints(time)
    this.createMeteor(time)
  }

  accelerateScroll(limit) {
    if(this.scrollSpeed <= limit) {
      this.scrollSpeed += 0.01
    }
  }

  generatePoints(time) {
    if (time > this.scoreLastIncrement + this.scoreBuffer) {
      this.score += Math.floor(this.scrollSpeed)
      this.scoreText.setText(this.score.toString().padStart(6,'0'))
      this.scoreLastIncrement = time
    }
    
  }

  countDownNow() {
    this.countDownTime -= 1
  }

  spawnScoreText() {
    const scoreText = this.add.text(sizes.width - 200, 30, "000000", {
      font: "25px"
    })
    scoreText.visible = false
    this.scoreText = scoreText
  }

  spawnIntroText() {
    const introText = this.add.text(sizes.width/2 - 240, 30, "Welcome to Space War", {
      font: "25px"
    })
    this.introText = introText
  }

  spawnTutorialText() {
    const tutorialText = this.add.text(sizes.width/2 - 400, sizes.height - 50, "Use WASD to move and SPACE to fire", {
      font: "25px"
    })
    this.tutorialText = tutorialText
  }

  spawnCountDownText() {
    const countDownText = this.add.text(sizes.width/2 - 25, sizes.height/2 - 50, "3", {
      font: "64px"
    })
    countDownText.visible = false
    this.countDownText = countDownText
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

  createPlayerHP() {
    const widthDiff = 50
    const playerHPArray = Array.from({ length: this.playerHP }, (_, x) => x);

    const playerHPIcons = playerHPArray.map((x) => {
      return this.add.image(20 + widthDiff * (x+1), 40,"playerHPIcon")
    })

    this.playerHPIcons = playerHPIcons
  }

  reducePlayerHP() {
    if(this.playerHPIcons === undefined || this.playerHPIcons.length === 0) {
      this.gameOver()
    }

    let lastIndex = this.playerHPIcons.length - 1

    this.playerHPIcons[lastIndex].destroy()
    this.playerHPIcons.pop()
  }

  spawnPlayer() {
    const player = this.matter.add.image(sizes.width-(sizes.width-100),(sizes.height/2)-40, "player")
    player.angle = 90
    player.setFixedRotation() // Prevent rotation when colliding
    player.setFriction(0);
    player.setFrictionAir(0);
    player.setCollisionCategory(this.playerCollisionCategory)
    player.setCollidesWith([this.enemyCollisionCategory, this.boundsCollisionCategory])

    this.player = player
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

    laser.laserParticle = this.add.image(laser.x+20, laser.y, 'playerLaserParticle');
    laser.laserParticle.visible = false
    

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
    meteor.setCollidesWith([this.enemyCollisionCategory, this.playerCollisionCategory, this.playerLaserCollisionCategory])

    meteor.hp = 3
    meteor.points = 64

    this.meteors.add(meteor)
  }

  damageEntity(entity, attack) {
    entity.hp -= attack.dmg;

    if(entity.hp <= 0) {
      this.destroyEntity(entity)
    }
  }

  damagePlayer() {
    this.playerHP -= 1

    if(this.playerHP <= 0) {
      this.gameOver()
    }
  }

  destroyEntity(entity) {
    this.score += entity.points
    entity.destroy()
  }

  gameOver() {
    console.log('YOU DIEEDD!!!!!')
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
      debug: false
    }
  },
  scene: [GameScene]
};

var game = new Phaser.Game(config);