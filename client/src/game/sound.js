let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function tone(freq, type, duration, volume = 0.3, delay = 0) {
  const c = getCtx()
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration)
}

function noise(duration, volume = 0.3) {
  const c = getCtx()
  const bufferSize = c.sampleRate * duration
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const source = c.createBufferSource()
  source.buffer = buffer

  const gain = c.createGain()
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

  source.connect(gain)
  gain.connect(c.destination)
  source.start()
}

export const Sounds = {
  shoot()    { tone(880, 'square', 0.04, 0.15); tone(550, 'square', 0.04, 0.1, 0.02) },
  hit()      { noise(0.08, 0.25) },
  death()    { [440, 330, 220, 110].forEach((f, i) => tone(f, 'sawtooth', 0.15, 0.3, i * 0.1)) },
  pickup()   { [440, 660, 880].forEach((f, i) => tone(f, 'sine', 0.1, 0.2, i * 0.07)) },
  respawn()  { [220, 330, 440, 660].forEach((f, i) => tone(f, 'sine', 0.12, 0.2, i * 0.08)) },
  start()    { [440, 550, 660, 880].forEach((f, i) => tone(f, 'square', 0.2, 0.3, i * 0.12)) },
  win()      { [523, 659, 784, 1047].forEach((f, i) => tone(f, 'square', 0.25, 0.4, i * 0.16)) },
  lose()     { [392, 330, 262, 196].forEach((f, i) => tone(f, 'sawtooth', 0.25, 0.35, i * 0.16)) },
  click()    { tone(440, 'square', 0.03, 0.08) }
}