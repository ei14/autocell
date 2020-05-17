class Trans {
	constructor() {
		this.loc = {x: 0, y: 0}
		this.vel = {x: 0, y: 0}
		this.fric = 0

		this.zoom = 0
		this.zvel = 0

		this.stationary = true
	}

	update() {
		if(this.vel.x != 0 || this.vel.y != 0) {
			let mag = Math.hypot(this.vel.x, this.vel.y)
			if(mag <= this.fric) {
				this.vel = {x: 0, y: 0}
			} else {
				let dir = {x: this.vel.x/mag, y: this.vel.y/mag}
				this.vel = {
					x: dir.x * (mag - this.fric),
					y: dir.y * (mag - this.fric),
				}
			}
		}
		this.loc.x += this.vel.x
		this.loc.y += this.vel.y

		if(this.zvel != 0) {
			if(Math.abs(this.zvel) <= this.fric) {
				this.zvel = 0
			} else {
				if(this.zvel < 0) this.zvel += this.fric
				else this.zvel -= this.fric
			}
		}
		this.zoom += 0.01*this.zvel

		this.stationary = this.vel.x == 0 &&  this.vel.y == 0 && this.zvel == 0
	}

	mapx(x) {
		return Math.exp(this.zoom)*x - this.loc.x
	}
	mapy(y) {
		return Math.exp(this.zoom)*y - this.loc.y
	}
	mapz(z) {
		return Math.exp(this.zoom)*z
	}
}

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d', {
	alpha: false,
	desynchronized: true,
})
const updateCanvasSize = () => {
	if(window.screen.width < window.screen.height) {
		canvas.width = window.screen.width
		canvas.height = 0.875 * window.screen.height
	} else {
		canvas.width = 0.875 * window.screen.width
		canvas.height = window.screen.height
	}
	ctx.fillStyle = '#000'
	ctx.fillRect(0, 0, canvas.width, canvas.height)
}
updateCanvasSize()
window.addEventListener('resize', updateCanvasSize)

/* ToolModes:
	0: pan
	1: draw specific color
	2: select
*/

const touchDurInc = 0.1
const moveSens = 10
var toolmode = 0
var touchDur = 0
var pTouchLocs = []
var trans = new Trans()
trans.stationary = false
trans.fric = 0.015

setInterval(() => {
	trans.update()

	if(!trans.stationary) {
		ctx.fillStyle = '#000'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}
	ctx.fillStyle = '#fff'
	ctx.fillRect(
		trans.mapx(0) + canvas.width/2  - trans.mapz(10)/2,
		trans.mapy(0) + canvas.height/2 - trans.mapz(10)/2,
		trans.mapz(10),
		trans.mapz(10)
	)
	ctx.fillRect(
		trans.mapx(-10) + canvas.width/2  - trans.mapz(10)/2,
		trans.mapy(-15) + canvas.height/2 - trans.mapz(10)/2,
		trans.mapz(10),
		trans.mapz(10)
	)
}, 1)

const recordTouches = (e) => {
	for(let t = 0; t < e.targetTouches.length; t++) {
		pTouchLocs[t] = {
			x: e.targetTouches[t].screenX,
			y: e.targetTouches[t].screenY,
		}
	}
}
const mov = moveSens / (
	(screen.width + screen.height)/2
)
canvas.addEventListener('touchstart', recordTouches)
canvas.addEventListener('touchmove', (e) => {
	if(e.targetTouches.length == 1) switch(toolmode) {
		case 0:
			trans.vel.x -= mov * (e.targetTouches[0].screenX - pTouchLocs[0].x)
			trans.vel.y -= mov * (e.targetTouches[0].screenY - pTouchLocs[0].y)
			break
	} else {
		trans.vel.x -= mov * (
			(e.targetTouches[0].screenX + e.targetTouches[1].screenX)/2 -
			(pTouchLocs[0].x + pTouchLocs[1].x)/2
		)
		trans.vel.y -= mov * (
			(e.targetTouches[0].screenY + e.targetTouches[1].screenY)/2 -
			(pTouchLocs[0].y + pTouchLocs[1].y)/2
		)

		trans.zvel += mov * Math.hypot(
			e.targetTouches[0].screenX - e.targetTouches[1].screenX,
			e.targetTouches[0].screenY - e.targetTouches[1].screenY,
		) - Math.hypot(
			pTouchLocs[0].x - pTouchLocs[1].x,
			pTouchLocs[0].y - pTouchLocs[1].y,
		)
	}

	recordTouches(e)
})

document.getElementById('loading').remove()

class Grid {
	constructor(size, wrap) {
		this.size = size
		this.wrap = wrap
		this.data = []
		this.diff = []
		for(let y = 0; y < size; y++) {
			this.data[y] = []
			this.diff[y] = []
			for(let x = 0; x < size; x++) {
				this.data[y][x] = 0
				this.diff[y][x] = -1
			}
		}
	}
}

