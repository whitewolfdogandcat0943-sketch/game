class_name DamagePopup
extends Node2D
## 浮かび上がるダメージ数字。Web版と同じく控えめに。

var _life: float = 0.8
var _label: Label


func setup(text: String, color: Color) -> void:
	_label = Label.new()
	_label.text = text
	UiTheme.apply(_label, 15, color)
	_label.position = Vector2(-14, -10)
	add_child(_label)


func _process(delta: float) -> void:
	_life -= delta
	position.y -= 26.0 * delta
	modulate.a = clampf(_life / 0.5, 0.0, 1.0)
	if _life <= 0.0:
		queue_free()
