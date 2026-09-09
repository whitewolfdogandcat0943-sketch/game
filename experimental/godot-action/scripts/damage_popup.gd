class_name DamagePopup
extends Node2D
## 浮かび上がるダメージ数字。出た瞬間に一度だけ跳ねて、弧を描いて消える。

const LIFE := 0.75

var _life: float = LIFE
var _vel: Vector2 = Vector2.ZERO
var _label: Label
var _big: bool = false


func setup(text: String, color: Color, big: bool = false) -> void:
	_big = big
	_label = Label.new()
	_label.text = text
	UiTheme.apply(_label, 20 if big else 15, color)
	_label.position = Vector2(-16, -12)
	add_child(_label)
	_vel = Vector2(randf_range(-26.0, 26.0), -78.0)
	scale = Vector2(0.4, 0.4)


func _process(delta: float) -> void:
	_life -= delta
	var t: float = 1.0 - _life / LIFE            # 0 -> 1
	## 出た直後に跳ねてから、少し縮む
	var pop: float = 1.0 + (1.0 - minf(t * 6.0, 1.0)) * -0.6 + sin(minf(t * 6.0, 1.0) * PI) * 0.25
	scale = Vector2(pop, pop) * (1.15 if _big else 1.0)
	_vel.y += 190.0 * delta                       # 重力で弧を描く
	position += _vel * delta
	modulate.a = clampf(_life / 0.35, 0.0, 1.0)
	if _life <= 0.0:
		queue_free()
