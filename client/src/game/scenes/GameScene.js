import Phaser from "phaser";

const COLORS = {
    FLOOR: 0x2d2d4e,
    WALL: 0x4a4a8a,
    SELF_TEAM: 0x4488ff, // blue — you + your team
    ENEMY: 0xff4444, // red — enemies
    BULLET: 0xffff00,
    AMMO: 0xffdd00,
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({key: "GameScene"});
        this.socket = null;
        this.mapData = null;
        this.gameMode = null;
        this.myId = null;
        this.serverPlayers = [];
        this.serverBullets = [];
        this.serverAmmo = [];
        this.playerLabels = {};
        this.ammoPickups = {};
        this.playerGraphics = null;
        this.bulletGraphics = null;
        this.lastShot = 0;
        this.localPos = null;
        this.FIRE_INTERVAL = 1000 / 6; // 6 BPS
    }

    init(sceneData) {
        if (sceneData && sceneData.socket) {
            this.pendingData = sceneData;
        }
    }

    create() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        if (this.pendingData) {
            this.initGame(this.pendingData.matchData, this.pendingData.socket);
        }
    }

    initGame(data, socket) {
        this.socket = socket;
        this.mapData = data.mapData;
        this.gameMode = data.game_mode;
        this.myId = socket.id;

        this.drawMap();
        this.drawAmmoPickups();
    }

    drawMap() {
        const {grid, tileSize, width, height} = this.mapData;
        const graphics = this.add.graphics();

        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const x = c * tileSize;
                const y = r * tileSize;
                graphics.fillStyle(grid[r][c] === 1 ? COLORS.WALL : COLORS.FLOOR);
                graphics.fillRect(x, y, tileSize, tileSize);
            }
        }

        this.cameras.main.setBounds(0, 0, width, height);
    }

    drawAmmoPickups() {
        this.mapData.ammo_pickups.forEach((pickup) => {
            const gfx = this.add.graphics();
            gfx.fillStyle(COLORS.AMMO);
            gfx.fillRect(-8, -8, 16, 16);

            const label = this.add
                .text(0, -20, `+${pickup.amount}`, {
                    fontSize: "10px",
                    color: "#ffdd00",
                })
                .setOrigin(0.5);

            const container = this.add.container(pickup.x, pickup.y, [gfx, label]);
            this.ammoPickups[pickup.id] = container;
        });
    }

    updateState(data) {
        this.serverPlayers = data.players;
        this.serverBullets = data.bullets;
        this.serverAmmo = data.ammo_pickups;

        // Correct local position if too far from server
        const me = data.players.find((p) => p.id === this.myId);
        if (me && this.localPos) {
            const dist = Math.hypot(me.x - this.localPos.x, me.y - this.localPos.y);
            if (dist > 64) this.localPos = {x: me.x, y: me.y};
        }

        // Show/hide ammo pickups
        data.ammo_pickups.forEach((pickup) => {
            if (this.ammoPickups[pickup.id]) {
                this.ammoPickups[pickup.id].setVisible(pickup.active);
                if (pickup.active) {
                    this.ammoPickups[pickup.id].setPosition(pickup.x, pickup.y);
                }
            }
        });
    }

    update(time) {
        if (!this.socket || !this.mapData) return;

        this.handleMovement();
        this.handleShooting(time);
        this.renderPlayers();
        this.renderBullets();
        this.checkAmmoPickup();
    }

    handleMovement() {
        const me = this.serverPlayers.find((p) => p.id === this.myId);
        if (!me || !me.alive) return;

        // Initialize local position from server
        if (!this.localPos) this.localPos = {x: me.x, y: me.y};

        const speed = 3;
        let x = this.localPos.x;
        let y = this.localPos.y;
        let moved = false;

        if (this.wasd.left.isDown) {
            x -= speed;
            moved = true;
        }
        if (this.wasd.right.isDown) {
            x += speed;
            moved = true;
        }
        if (this.wasd.up.isDown) {
            y -= speed;
            moved = true;
        }
        if (this.wasd.down.isDown) {
            y += speed;
            moved = true;
        }

        if (moved) {
            this.localPos = {x, y};
            this.socket.emit("player_move", {x, y});
            this.cameras.main.centerOn(x, y);
        } else {
            this.cameras.main.centerOn(this.localPos.x, this.localPos.y);
        }
    }

    handleShooting(time) {
        if (time - this.lastShot < this.FIRE_INTERVAL) return;

        let dirX = 0,
            dirY = 0;
        if (this.cursors.left.isDown) dirX = -1;
        if (this.cursors.right.isDown) dirX = 1;
        if (this.cursors.up.isDown) dirY = -1;
        if (this.cursors.down.isDown) dirY = 1;
        if (dirX === 0 && dirY === 0) return;

        // Normalize diagonal direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        this.socket.emit("player_shoot", {dirX: dirX / len, dirY: dirY / len});
        this.lastShot = time;
    }

    renderPlayers() {
        if (this.playerGraphics) this.playerGraphics.destroy();
        this.playerGraphics = this.add.graphics();

        this.serverPlayers.forEach((player) => {
            if (!player.alive) return;

            let color;
            if (this.gameMode === "FFA") {
                color = player.id === this.myId ? COLORS.SELF_TEAM : COLORS.ENEMY;
            } else {
                const me = this.serverPlayers.find((p) => p.id === this.myId);
                color = player.team === me?.team ? COLORS.SELF_TEAM : COLORS.ENEMY;
            }

            // Player circle
            const alpha = player.invincible ? (Math.floor(Date.now() / 150) % 2 === 0 ? 0.3 : 1) : 1;
            const renderX = player.id === this.myId && this.localPos ? this.localPos.x : player.x;
            const renderY = player.id === this.myId && this.localPos ? this.localPos.y : player.y;

            this.playerGraphics.fillStyle(color, alpha);
            this.playerGraphics.fillCircle(renderX, renderY, 12);
            this.playerGraphics.lineStyle(2, 0xffffff, 0.4 * alpha);
            this.playerGraphics.strokeCircle(renderX, renderY, 12);

            if (!this.playerLabels[player.id]) {
                const initials = player.username
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2);
                this.playerLabels[player.id] = this.add
                    .text(renderX, renderY - 20, initials, {fontSize: "10px", color: "#ffffff", fontStyle: "bold"})
                    .setOrigin(0.5);
            } else {
                this.playerLabels[player.id].setPosition(renderX, renderY - 20);
            }
        });
    }

    renderBullets() {
        if (this.bulletGraphics) this.bulletGraphics.destroy();
        this.bulletGraphics = this.add.graphics();
        this.bulletGraphics.fillStyle(COLORS.BULLET);
        this.serverBullets.forEach((b) => {
            this.bulletGraphics.fillCircle(b.x, b.y, 4);
        });
    }

    checkAmmoPickup() {
        const me = this.serverPlayers.find((p) => p.id === this.myId);
        if (!me || !me.alive) return;

        this.serverAmmo.forEach((pickup) => {
            if (!pickup.active) return;
            const dist = Math.hypot(pickup.x - me.x, pickup.y - me.y);
            if (dist < 20) {
                this.socket.emit("pickup_ammo", {ammo_id: pickup.id});
            }
        });
    }
}
