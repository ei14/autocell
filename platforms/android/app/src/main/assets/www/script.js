class Trans {
	constructor(inf) {
		this.loc = {x: 0, y: 0}
		this.rloc = {x: 0, y: 0}
		this.inf = inf

		this.zoom = 0
		this.rzoom = 0

		this.stationary = true
	}

	update() {
		this.loc.x += this.inf * (this.rloc.x - this.loc.x)
		this.loc.y += this.inf * (this.rloc.y - this.loc.y)
		this.zoom += this.inf * (this.rzoom - this.zoom)
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

const zoomSens = 0.01
var toolmode = 0
var pTouchLocs = []
var trans = new Trans(0.035)
trans.stationary = false

setInterval(() => {
	trans.update()

	if(!trans.stationary) {
		ctx.fillStyle = '#000'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}
	ctx.fillStyle = '#fff'
	ctx.font = trans.mapz(30) + 'px VictorMono'
	ctx.fillText('This is a demo of movement', trans.mapx(canvas.width/2), trans.mapy(canvas.height/2))
}, 1)

const recordTouches = (e) => {
	for(let t = 0; t < e.targetTouches.length; t++) {
		pTouchLocs[t] = {
			x: e.targetTouches[t].screenX,
			y: e.targetTouches[t].screenY,
		}
	}
}
canvas.addEventListener('touchstart', recordTouches)
canvas.addEventListener('touchmove', (e) => {
	if(e.targetTouches.length == 1) switch(toolmode) {
		case 0:
			trans.rloc.x -= (e.targetTouches[0].screenX - pTouchLocs[0].x)
			trans.rloc.y -= (e.targetTouches[0].screenY - pTouchLocs[0].y)
			break
	} else {
		avg = {
			x: (e.targetTouches[0].screenX + e.targetTouches[1].screenX)/2,
			y: (e.targetTouches[0].screenY + e.targetTouches[1].screenY)/2,
		}
		pAvg = {
			x: (pTouchLocs[0].x + pTouchLocs[1].x)/2,
			y: (pTouchLocs[0].y + pTouchLocs[1].y)/2,
		}
		zoomAmt = Math.hypot(
			e.targetTouches[0].screenX - e.targetTouches[1].screenX,
			e.targetTouches[0].screenY - e.targetTouches[1].screenY,
		) - Math.hypot(
			pTouchLocs[0].x - pTouchLocs[1].x,
			pTouchLocs[0].y - pTouchLocs[1].y,
		)

		trans.rloc.x -= (avg.x - pAvg.x) +
			Math.exp(trans.zoom) *
			(avg.x - canvas.width/2) *
			(1 - Math.exp(zoomSens * zoomAmt))
		trans.rloc.y -= (avg.y - pAvg.y) +
			Math.exp(trans.zoom) *
			(avg.y - canvas.height/2) *
			(1 - Math.exp(zoomSens * zoomAmt))
		trans.rzoom += zoomSens * zoomAmt
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

