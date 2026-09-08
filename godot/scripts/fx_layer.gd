class_name FxLayer
extends Node2D
## パーティクル。専用ノードを毎回作らず、配列を1枚のNode2Dで描くだけの軽い実装。
## 絵を描き足さずに「当たった／死んだ／踏み込んだ」実感を出すための層。

class P:
	var pos: Vector2
	var vel: Vector2
	var life: float
	var max_life: float
	var color: Color
	var size: float
	var gravity: float
	var drag: float

var _ps: Array = []


func _process(delta: float) -> void:
	if _ps.is_empty():
		return
	var alive: Array = []
	for p in _ps:
		p.life -= delta
		if p.life <= 0.0:
			continue
		p.vel.y += p.gravity * delta
		p.vel = p.vel.lerp(Vector2.ZERO, minf(1.0, p.drag * delta))
		p.pos += p.vel * delta
		alive.append(p)
	_ps = alive
	queue_redraw()


func _spawn(pos: Vector2, vel: Vector2, life: float, color: Color,
		size: float, gravity: float = 0.0, drag: float = 2.0) -> void:
	var p := P.new()
	p.pos = pos; p.vel = vel; p.life = life; p.max_life = life
	p.color = color; p.size = size; p.gravity = gravity; p.drag = drag
	_ps.append(p)


## 斬った瞬間の火花。方向に沿って飛ばすと「当たった向き」が読める
func hit_spark(pos: Vector2, dir: Vector2, color: Color, amount: int = 8) -> void:
	for i in amount:
		var a := dir.angle() + randf_range(-0.9, 0.9)
		var sp := randf_range(90.0, 260.0)
		_spawn(pos, Vector2(cos(a), sin(a)) * sp, randf_range(0.12, 0.28),
			color, randf_range(1.5, 3.5), 220.0, 3.0)


## 会心のときだけ出す、白く大きい飛沫
func crit_burst(pos: Vector2) -> void:
	for i in 14:
		var a := randf_range(0.0, TAU)
		_spawn(pos, Vector2(cos(a), sin(a)) * randf_range(140.0, 360.0),
			randf_range(0.18, 0.36), Color(1.0, 0.92, 0.6), randf_range(2.0, 4.0), 180.0, 2.5)


## 踏み込み・ダッシュの土煙。足元に出すと接地感が出る
func dust(pos: Vector2, dir: Vector2, amount: int = 5) -> void:
	for i in amount:
		var a := (-dir).angle() + randf_range(-0.5, 0.5)
		_spawn(pos + Vector2(0, 4), Vector2(cos(a), sin(a)) * randf_range(30.0, 90.0),
			randf_range(0.2, 0.4), Color(0.7, 0.72, 0.8, 0.5), randf_range(2.0, 4.0), -20.0, 4.0)


## 撃破時にスプライトの色を拾って飛び散らせる（絵を描かずに手応えを出す一番効く手）
func shatter(pos: Vector2, tex: Texture2D, scale_hint: float = 2.0) -> void:
	var img: Image = null
	if tex != null:
		img = tex.get_image()
	if img == null:
		for i in 16:
			var a0 := randf_range(0.0, TAU)
			_spawn(pos, Vector2(cos(a0), sin(a0)) * randf_range(60.0, 220.0),
				randf_range(0.35, 0.7), Color(1, 1, 1, 0.9), 3.0, 420.0, 1.2)
		return
	var w := img.get_width()
	var h := img.get_height()
	var tries := 0
	var made := 0
	while made < 26 and tries < 200:
		tries += 1
		var x := randi() % w
		var y := randi() % h
		var c := img.get_pixel(x, y)
		if c.a < 0.5:
			continue
		made += 1
		var off := Vector2(float(x) - float(w) * 0.5, float(y) - float(h) * 0.5) * scale_hint
		var dir := off.normalized() if off.length() > 0.1 else Vector2.UP
		_spawn(pos + off, dir * randf_range(70.0, 210.0) + Vector2(0, -60.0),
			randf_range(0.4, 0.8), c, scale_hint, 480.0, 1.0)


func _draw() -> void:
	for p in _ps:
		var t: float = clampf(p.life / p.max_life, 0.0, 1.0)
		var c: Color = p.color
		c.a *= t
		var s: float = p.size * (0.4 + t * 0.6)
		draw_rect(Rect2(p.pos - Vector2(s, s) * 0.5, Vector2(s, s)), c)
