// Game config variables (change these to tweak the game)
const CONFIG = {
  SMALL_MAP: { cols: 30, rows: 30, tileSize: 32 },
  LARGE_MAP: { cols: 50, rows: 50, tileSize: 32 },
  OBSTACLE_DENSITY: 0.15,     // 15% of tiles are obstacles
  AMMO_PACK_COUNT: 8,         // ammo packs on map
  AMMO_SMALL: 30,             // small ammo pack value
  AMMO_LARGE: 50,             // large ammo pack value
  BULLET_SPEED: 1000,          // pixels per second
  BULLET_DAMAGE: 25,          // damage per bullet (5 hits to kill)
  PLAYER_SPEED: 200,          // pixels per second
  FIRE_RATE: 5,               // bullets per second
  STARTING_AMMO: 60,
  RESPAWN_DELAY: 1500,        // 3 seconds in ms
}

function generateMap(type) {
  const { cols, rows, tileSize } = type === 'SMALL' 
    ? CONFIG.SMALL_MAP 
    : CONFIG.LARGE_MAP

  const width = cols * tileSize
  const height = rows * tileSize

  // Create empty grid
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0))

  // Add border walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        grid[r][c] = 1 // wall
      }
    }
  }

  // Randomly place obstacles (not on borders)
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      if (Math.random() < CONFIG.OBSTACLE_DENSITY) {
        grid[r][c] = 1
      }
    }
  }

  // Generate spawn points (corners, away from walls)
  const spawnPoints = [
    { x: 2 * tileSize, y: 2 * tileSize },
    { x: (cols - 3) * tileSize, y: 2 * tileSize },
    { x: 2 * tileSize, y: (rows - 3) * tileSize },
    { x: (cols - 3) * tileSize, y: (rows - 3) * tileSize },
    { x: Math.floor(cols / 2) * tileSize, y: 2 * tileSize },
    { x: Math.floor(cols / 2) * tileSize, y: (rows - 3) * tileSize },
    { x: 2 * tileSize, y: Math.floor(rows / 2) * tileSize },
    { x: (cols - 3) * tileSize, y: Math.floor(rows / 2) * tileSize },
  ]

  // Clear spawn points (make sure they're walkable)
  spawnPoints.forEach(({ x, y }) => {
    const r = Math.floor(y / tileSize)
    const c = Math.floor(x / tileSize)
    grid[r][c] = 0
    grid[r + 1][c] = 0
    grid[r][c + 1] = 0
  })

  // Place ammo pickups on empty tiles
  const ammo_pickups = []
  let placed = 0
  while (placed < CONFIG.AMMO_PACK_COUNT) {
    const r = Math.floor(Math.random() * (rows - 2)) + 1
    const c = Math.floor(Math.random() * (cols - 2)) + 1
    if (grid[r][c] === 0) {
      ammo_pickups.push({
        id: `ammo_${placed}`,
        x: c * tileSize,
        y: r * tileSize,
        amount: Math.random() > 0.5 ? CONFIG.AMMO_SMALL : CONFIG.AMMO_LARGE,
        active: true
      })
      placed++
    }
  }

  return { grid, width, height, tileSize, spawnPoints, ammo_pickups, cols, rows }
}

module.exports = { generateMap, CONFIG }