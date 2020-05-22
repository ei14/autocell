const gpu = new GPU({mode: 'dev'});
//const gpu = new GPU();

const matAdd = gpu.createKernel(function(a, b) {
	return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x]
}, {output: [3, 3]})
const matSca = gpu.createKernel(function(s, m) {
	return s * m[this.thread.y][this.thread.x]
}, {output: [3, 3]})
const matMul = gpu.createKernel(function(a, b) {
	let res = 0
	for(let i = 0; i < 3; i++) {
		res += a[this.thread.y][i] * b[i][this.thread.x]
	}
	return res
}, {output: [3, 3]})
const matDet = gpu.createKernel(function(m) {
	return m[0][this.thread.x] * (
		m[1][(this.thread.x+1)%3]*m[2][(this.thread.x+2)%3] -
		m[1][(this.thread.x+2)%3]*m[2][(this.thread.x+1)%3]
	)
}, {output: [3]})
const matInv = gpu.createKernel(function(m) {
	return m[(this.thread.x + 1) % 3][(this.thread.y + 1) % 3] *
		m[(this.thread.x + 2) % 3][(this.thread.y + 2) % 3] -
		m[(this.thread.x + 1) % 3][(this.thread.y + 2) % 3] *
		m[(this.thread.x + 2) % 3][(this.thread.y + 1) % 3]
}, {output: [3, 3]})
const matVec = gpu.createKernel(function(m, v) {
	let res = 0
	for(let i = 0; i < 3; i++) {
		res += m[this.thread.x][i] * v[i]
	}
	return res
}, {output: [3]})
const vecSqu = gpu.createKernel(function(v) {
	return a[this.thread.x] * a[this.thread.x]
}, {output: [3]})
const vecAdd = gpu.createKernel(function(a, b) {
	return a[this.thread.x] + b[this.thread.x]
}, {output: [3]})
const vecSca = gpu.createKernel(function(v, s) {
	return s * v[this.thread.x]
}, {output: [3]})

class Matrix {
	constructor(values) {
		if(values === undefined) this.mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
		else this.mat = values
	}

	plus(other) {
		return new Matrix(matAdd(this.mat, other.mat))
	}
	times(other) {
		if(other instanceof Matrix) {
			return new Matrix(matMul(this.mat, other.mat))
		}
		if(other instanceof Vector) {
			return new Vector(matVec(this.mat, other.vec))
		}
		return new Matrix(matSca(other, this.mat))
	}
	det() {
		return matDet(this.mat).reduce((a, b) => a + b)
	}
	inv() {
		return (new Matrix(matInv(this.mat))).times(1.0/this.det())
	}

	static translation(vector) {
		return new Matrix([[1, 0, vector.x()], [0, 1, vector.y()], [0, 0, 1]])
	}
	static scale(scalar) {
		return new Matrix([[scalar, 0, 0], [0, scalar, 0], [0, 0, 1]])
	}
}
class Vector {
	constructor(values) {
		if(values === undefined) this.vec = [0, 0, 0]
		else this.vec = values
	}

	x() {return 1.0 * this.vec[0]}
	y() {return 1.0 * this.vec[1]}
	z() {return 1.0 * this.vec[2]}

	mag() {
		return Math.sqrt(vecSqu(this.vec).reduce((a, b) => a + b))
	}
	plus(other) {
		return new Vector(vecAdd(this.vec, other.vec))
	}
	times(scalar) {
		return new Vector(vecSca(this.vec, scalar))
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

/* Tool Modes:
	0: pan
	1: draw specific color
	2: select
*/

const inf = 0.1
var toolmode = 0
var pTouch = []
var trans = new Matrix()
var strans = new Matrix()

setInterval(() => {
	strans = strans.plus(trans.plus(strans.times(-1)).times(inf))

	ctx.fillStyle = '#000'
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	ctx.fillStyle = '#fff'

	let v1 = trans.times(new Vector([100, 100, 1]))
	let v2 = trans.times(new Vector([100, 300, 1]))

	ctx.font = 20*trans.det() + 'px VictorMono'
	ctx.fillText('This is a movement demo', v1.x(), v1.y())
	ctx.fillText('Use 2 fingers to zoom', v2.x(), v2.y())
}, 1)

const recordTouches = (e) => {
	for(let t = 0; t < e.targetTouches.length; t++) {
		pTouch[t] = new Vector([
			e.targetTouches[t].pageX,
			e.targetTouches[t].pageY,
			1,
		])
	}
}
canvas.addEventListener('touchstart', recordTouches)
canvas.addEventListener('touchmove', (e) => {
	if(e.targetTouches.length == 1) {
		let touch = new Vector([
			e.targetTouches[0].pageX,
			e.targetTouches[0].pageY,
			1,
		])
		switch(toolmode) {
			case 0:
				trans = Matrix.translation(touch.plus(pTouch[0].times(-1))).times(trans)
				break
		}
	} else {
		let touch = [
			new Vector([
				e.targetTouches[0].pageX,
				e.targetTouches[0].pageY,
				1,
			]),
			new Vector([
				e.targetTouches[1].pageX,
				e.targetTouches[1].pageY,
			1,
			])
		]
		avg = touch[0].plus(touch[1]).times(0.5)
		pAvg = pTouch[0].plus(pTouch[1]).times(0.5)
		zoomAmt =
			touch[0].plus(touch[1].times(-1)).mag() /
			pTouch[0].plus(pTouch[1].times(-1)).mag()
		isolate = Matrix.translation(avg)
		translation = Matrix.translation(avg.plus(pAvg.times(-1)))
		trans = translation
			.times(isolate)
			.times(Matrix.scale(zoomAmt))
			.times(isolate.inv())
			.times(trans)
	}

	recordTouches(e)
})
canvas.addEventListener('wheel', (e) => {
	let touch = new Vector([
		e.pageX,
		e.pageY,
		1,
	])
	zoomAmt = Math.exp(-e.deltaY/300)
	translation = Matrix.translation(touch)
	trans = translation.times(Matrix.scale(zoomAmt)).times(translation.inv()).times(trans)
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

