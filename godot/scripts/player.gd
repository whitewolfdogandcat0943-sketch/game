class_name Player
extends Node2D
## 主人公。移動・斬撃・回避ダッシュ。
## 1枚絵しか無いので、傾き・伸縮・影・斬撃の軌跡で「動いている」ことを作る。

signal hurt_taken(amount: float)
signal died()

const SLASH_DUR := 0.18
const DASH_TIME := 0.16
const BASE_SCALE := Vector2(2.5, 2.5)

var hero: HeroState
var profile: Dictionary = {}
var radius: float = 8.0
var fx: FxLayer

var _attack_cd: float = 0.0
var _dash_cd: float = 0.0
var _iframe: float = 0.0
var _aim: Vector2 = Vector2.RIGHT
var _vel: Vector2 = Vector2.ZERO
var _sprite: Sprite2D
var _slash_time: float = 0.0
var _slash_dir: Vector2 = Vector2.RIGHT
var _slash_range: float = 0.0
var _slash_arc: float = 0.0
var _dash_time: float = 0.0
var _impact: float = 0.0
var _lunge: float = 0.0
var _time: float = 0.0
var _dust_acc: float = 0.0


func setup(h: HeroState) -> void:
	hero = h
	profile = h.action_profile()
	_sprite = Sprite2D.new()
	_sprite.texture = GameData.sprite("classes", h.class_id)
	_sprite.scale = BASE_SCALE
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_sprite)


func refresh_profile() -> void:
	profile = hero.action_profile()


func is_invulnerable() -> bool:
	return _iframe > 0.0


func tick(delta: float) -> void:
	_time += delta
	_attack_cd = maxf(0.0, _attack_cd - delta)
	_dash_cd = maxf(0.0, _dash_cd - delta)
	_iframe = maxf(0.0, _iframe - delta)
	_dash_time = maxf(0.0, _dash_time - delta)
	_slash_time = maxf(0.0, _slash_time - delta)
	_impact = maxf(0.0, _impact - delta * 6.0)
	_lunge = maxf(0.0, _lunge - delta * 7.0)

	var dir := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))
			- float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))
			- float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	if dir.length() > 0.0:
		dir = dir.normalized()
		_aim = dir

	var spd: float = float(profile.get("move_speed", 150.0))
	if _dash_time > 0.0:
		spd *= 3.2
	_vel = dir * spd
	global_position += _vel * delta + _aim * _lunge * 42.0 * delta

	## 走っている間は足元に土煙を落とす（接地感）
	if dir.length() > 0.0 and fx != null:
		_dust_acc += delta
		if _dust_acc > (0.06 if _dash_time > 0.0 else 0.16):
			_dust_acc = 0.0
			fx.dust(global_position + Vector2(0, 8), dir, 1 if _dash_time <= 0.0 else 3)

	## ダッシュ（回避率が高いほど無敵時間が伸びる）
	if Input.is_key_pressed(KEY_SHIFT) and _dash_cd <= 0.0 and dir.length() > 0.0:
		_dash_cd = 1.1
		_dash_time = DASH_TIME
		_iframe = DASH_TIME + float(hero.stats["evade"]) * 0.5
		_impact = 1.0
		if fx != null:
			fx.dust(global_position + Vector2(0, 8), dir, 8)

	_animate(dir, spd)
	queue_redraw()


func _animate(dir: Vector2, spd: float) -> void:
	if not is_instance_valid(_sprite):
		return
	if _impact > 0.0:
		Visual.impact(_sprite, _impact, BASE_SCALE, 0.30)
	else:
		Visual.locomotion(_sprite, dir, dir.length(), _time, BASE_SCALE)
	if _dash_time > 0.0:
		_sprite.scale = Vector2(BASE_SCALE.x * 1.25, BASE_SCALE.y * 0.8)
	_sprite.modulate = Color(1, 1, 1, 0.45) if _iframe > 0.0 else Color.WHITE
	if _aim.x != 0.0:
		_sprite.flip_h = _aim.x < 0.0


## 斬撃が出せるなら、扇形の判定範囲を返す。出せないなら空の辞書。
func try_attack() -> Dictionary:
	if _attack_cd > 0.0:
		return {}
	_attack_cd = float(profile.get("attack_cooldown", 0.5))
	_slash_range = 34.0 + float(profile.get("splash_radius", 16.0)) * 0.55
	_slash_arc = deg_to_rad(70.0 + float(hero.stats["aoe_ratio"]) * 130.0)
	_slash_dir = _aim
	_slash_time = SLASH_DUR
	_lunge = 1.0          ## 踏み込み
	_impact = 0.7
	return {"dir": _slash_dir, "range": _slash_range, "arc": _slash_arc}


func take_damage(amount: float) -> float:
	if _iframe > 0.0:
		return 0.0
	if randf() < float(hero.stats["evade"]):
		return -1.0
	var dealt := amount
	if hero.active_flags.has("wardAll"):
		dealt *= 0.85
	if hero.active_flags.has("lastStand") and hero.hp / float(hero.stats["max_hp"]) <= 0.5:
		dealt *= 0.75
	dealt = maxf(1.0, dealt * (1.0 - float(hero.stats["dr"])))
	hero.hp -= dealt
	_iframe = 0.35
	_impact = 1.0
	hurt_taken.emit(dealt)
	if hero.hp <= 0.0:
		hero.hp = 0.0
		died.emit()
	return dealt


func _draw() -> void:
	Visual.draw_shadow(self, 11.0, 8.0, 0.40, 1.0 if _dash_time <= 0.0 else 0.5)
	if _slash_time <= 0.0:
		return

	## 斬り抜ける三日月。止まった扇ではなく、刃が走った跡として描く
	var t: float = 1.0 - _slash_time / SLASH_DUR          # 0 -> 1
	var base := _slash_dir.angle()
	var half := _slash_arc * 0.5
	var head := -half + _slash_arc * t
	var tail := maxf(-half, head - _slash_arc * 0.55)
	var steps := 12
	var outer := _slash_range
	var inner := _slash_range * 0.55

	var pts := PackedVector2Array()
	for i in range(steps + 1):
		var a := base + lerp(tail, head, float(i) / float(steps))
		pts.append(Vector2(cos(a), sin(a)) * outer)
	for i in range(steps + 1):
		var a2 := base + lerp(head, tail, float(i) / float(steps))
		pts.append(Vector2(cos(a2), sin(a2)) * inner)

	var fade := 1.0 - t
	draw_colored_polygon(pts, Color(0.72, 0.88, 1.0, 0.55 * fade))
	## 先端の白い芯
	var hp := base + head
	draw_line(Vector2(cos(hp), sin(hp)) * inner, Vector2(cos(hp), sin(hp)) * outer,
		Color(1, 1, 1, 0.9 * fade), 2.5)
