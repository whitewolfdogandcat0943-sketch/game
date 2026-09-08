class_name Hud
extends CanvasLayer
## 画面表示。HPバーとビルドの要約、ダメージ数字。

var hp_bar: ColorRect
var hp_fill: ColorRect
var mp_bar: ColorRect
var mp_fill: ColorRect
var slot_labels: Array = []
var info: Label
var build_panel: Panel
var build_label: Label
var toast: Label

var _toast_time: float = 0.0


func _ready() -> void:
	var back := ColorRect.new()
	back.color = Color(0, 0, 0, 0.35)
	back.position = Vector2(12, 12)
	back.size = Vector2(300, 60)
	add_child(back)

	hp_bar = ColorRect.new()
	hp_bar.color = Color(0.05, 0.06, 0.1)
	hp_bar.position = Vector2(20, 20)
	hp_bar.size = Vector2(284, 12)
	add_child(hp_bar)

	hp_fill = ColorRect.new()
	hp_fill.color = Color(1.0, 0.3, 0.38)
	hp_fill.position = Vector2(21, 21)
	hp_fill.size = Vector2(282, 10)
	add_child(hp_fill)

	mp_bar = ColorRect.new()
	mp_bar.color = Color(0.05, 0.06, 0.1)
	mp_bar.position = Vector2(20, 34)
	mp_bar.size = Vector2(284, 7)
	add_child(mp_bar)

	mp_fill = ColorRect.new()
	mp_fill.color = Color(0.36, 0.55, 1.0)
	mp_fill.position = Vector2(21, 35)
	mp_fill.size = Vector2(282, 5)
	add_child(mp_fill)

	info = Label.new()
	info.position = Vector2(20, 42)
	UiTheme.apply(info, 13)
	add_child(info)

	build_panel = Panel.new()
	build_panel.position = Vector2(640, 12)
	build_panel.size = Vector2(300, 300)
	build_panel.visible = false
	add_child(build_panel)

	build_label = Label.new()
	build_label.position = Vector2(12, 10)
	build_label.size = Vector2(280, 280)
	UiTheme.apply(build_label, 12)
	build_panel.add_child(build_label)

	for i in 4:
		var l := Label.new()
		l.position = Vector2(20.0 + float(i) * 168.0, 508.0)
		UiTheme.apply(l, 13, Color(0.6, 0.64, 0.75))
		add_child(l)
		slot_labels.append(l)

	toast = Label.new()
	toast.position = Vector2(20, 478)
	UiTheme.apply(toast, 15, Color(1.0, 0.85, 0.45))
	add_child(toast)


func set_hero(h: HeroState, floor_no: int, remaining: int) -> void:
	var ratio: float = clampf(h.hp / maxf(1.0, float(h.stats["max_hp"])), 0.0, 1.0)
	hp_fill.size.x = 282.0 * ratio
	var mratio: float = clampf(h.mp / maxf(1.0, float(h.stats["max_mp"])), 0.0, 1.0)
	mp_fill.size.x = 282.0 * mratio
	info.text = "%s  Lv%d   HP %d/%d   MP %d   %d階  残り%d体%s" % [
		GameData.klass(h.class_id).get("name", h.class_id), h.level,
		int(h.hp), int(h.stats["max_hp"]), int(h.mp), floor_no, remaining,
		("   🛡%d" % int(h.barrier)) if h.barrier > 0.0 else ""]


## スキルスロットの表示（キー・名前・MP・クールダウン）
func set_slots(slots: Array) -> void:
	for i in slot_labels.size():
		var l: Label = slot_labels[i]
		if i < slots.size():
			l.text = "%d %s" % [i + 1, GameData.skill(slots[i]).get("name", "")]
		else:
			l.text = ""


func set_slot_state(slots: Array, cds: Array, h: HeroState, _runner: Object) -> void:
	for i in slot_labels.size():
		if i >= slots.size():
			continue
		var sk := GameData.skill(slots[i])
		var cost := float(sk.get("mp", 0))
		var l: Label = slot_labels[i]
		var ready: bool = cds[i] <= 0.0 and h.mp >= cost
		l.text = "%d %s  MP%d%s" % [i + 1, sk.get("name", ""), int(cost),
			("" if cds[i] <= 0.0 else "  %.1fs" % cds[i])]
		l.add_theme_color_override("font_color",
			Color(1.0, 0.81, 0.42) if ready else Color(0.45, 0.47, 0.56))


func set_build_text(h: HeroState) -> void:
	var s := h.stats
	var lines: Array = []
	lines.append("― ビルド ―")
	lines.append("物理攻撃 %d / 魔法攻撃 %d" % [int(s["atk"]), int(s["mag"])])
	lines.append("物理防御 %d / 魔法防御 %d" % [int(s["def"]), int(s["res"])])
	lines.append("素早さ %d" % int(s["spd"]))
	lines.append("会心率 %d%% / 会心ダメ %d%%" % [int(s["crit_rate"] * 100.0), int(s["crit_dmg"] * 100.0)])
	lines.append("反射 %d%% / 波及 %d%%" % [int(s["reflect"] * 100.0), int(s["aoe_ratio"] * 100.0)])
	lines.append("耐性貫通 %d%% / 被ダメ軽減 %d%%" % [int(s["pierce"] * 100.0), int(s["dr"] * 100.0)])
	lines.append("吸収 %d%% / 回避 %d%%" % [int(s["lifesteal"] * 100.0), int(s["evade"] * 100.0)])
	lines.append("")
	lines.append("― 特殊効果 ―")
	if h.active_flags.is_empty():
		lines.append("なし")
	else:
		for f in h.active_flags:
			lines.append("◆ " + str(GameData.flags.get(f, f)))
	build_label.text = "\n".join(lines)


func show_toast(text: String) -> void:
	toast.text = text
	_toast_time = 3.0


func _process(delta: float) -> void:
	if _toast_time > 0.0:
		_toast_time -= delta
		if _toast_time <= 0.0:
			toast.text = ""
