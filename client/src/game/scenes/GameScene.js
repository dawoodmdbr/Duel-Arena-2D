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
        if (!this.localPos) {
            const me = this.serverPlayers.find((p) => p.id === this.myId);
            if (!me) return;
            this.localPos = {x: me.x, y: me.y};
        }

        const speed = 3;
        let dirX = 0,
            dirY = 0;

        if (this.wasd.left.isDown) dirX = -1;
        if (this.wasd.right.isDown) dirX = 1;
        if (this.wasd.up.isDown) dirY = -1;
        if (this.wasd.down.isDown) dirY = 1;

        if (dirX !== 0 || dirY !== 0) {
            const newX = this.localPos.x + dirX * speed;
            const newY = this.localPos.y + dirY * speed;

            // Check collision before moving
            if (this.isWalkable(newX, newY)) {
                this.localPos.x = newX;
                this.localPos.y = newY;
                this.socket.emit("player_move", {dirX, dirY});
            }

            this.cameras.main.centerOn(this.localPos.x, this.localPos.y);
        }
    }

    isWalkable(x, y) {
        const {grid, tileSize} = this.mapData;
        const radius = 12; // your player radius

        // Check 4 corners of player hitbox
        const corners = [
            {px: x - radius, py: y - radius},
            {px: x + radius, py: y - radius},
            {px: x - radius, py: y + radius},
            {px: x + radius, py: y + radius},
        ];

        for (const corner of corners) {
            const col = Math.floor(corner.px / tileSize);
            const row = Math.floor(corner.py / tileSize);

            // Out of bounds
            if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
                return false;
            }
            // Hit a wall (grid[r][c] === 1)
            if (grid[row][col] === 1) {
                return false;
            }
        }
        return true;
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

            this.playerGraphics.fillStyle(color, alpha);
            this.playerGraphics.fillCircle(player.x, player.y, 12);
            this.playerGraphics.lineStyle(2, 0xffffff, 0.4 * alpha);
            this.playerGraphics.strokeCircle(player.x, player.y, 12);

            // Initials label
            if (!this.playerLabels[player.id]) {
                const initials = player.username
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2);

                this.playerLabels[player.id] = this.add
                    .text(player.x, player.y - 20, initials, {fontSize: "10px", color: "#ffffff", fontStyle: "bold"})
                    .setOrigin(0.5);
            } else {
                this.playerLabels[player.id].setPosition(player.x, player.y - 20);
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
