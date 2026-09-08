class_name EquipScreen
extends CanvasLayer
## 装備画面。武器・防具・アクセサリ4枠を組み替える。
## この作品の芯はビルド構築なので、ここが無いとアクションが初期装備固定になってしまう。

signal changed()
signal closed()

const SLOTS := [
	["weapon", "武器"], ["armor", "防具"],
	["acc0", "アクセサリ 1"], ["acc1", "アクセサリ 2"],
	["acc2", "アクセサリ 3"], ["acc3", "アクセサリ 4"],
]

var hero: HeroState
var _slot_buttons: Array = []
var _list_box: VBoxContainer
var _stat_label: Label
var _hint_label: Label
var _selected: String = "weapon"


func setup(h: HeroState) -> void:
	hero = h
	layer = 10
	_build()
	_refresh()


func _build() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.02, 0.04, 0.85)
	dim.size = Vector2(960, 540)
	add_child(dim)

	var panel := Panel.new()
	panel.position = Vector2(30, 24)
	panel.size = Vector2(900, 492)
	add_child(panel)

	var title := Label.new()
	title.text = "装備 ―― ビルドを組む"
	title.position = Vector2(20, 12)
	UiTheme.apply(title, 20, Color(1.0, 0.81, 0.42))
	panel.add_child(title)

	_hint_label = Label.new()
	_hint_label.text = "左の枠を選び、右の候補をクリックで装備　／　I または Esc で閉じる"
	_hint_label.position = Vector2(20, 42)
	UiTheme.apply(_hint_label, 12, Color(0.6, 0.64, 0.75))
	panel.add_child(_hint_label)

	## 左: 装備枠
	for i in SLOTS.size():
		var b := Button.new()
		b.position = Vector2(20, 74 + i * 46)
		b.custom_minimum_size = Vector2(260, 40)
		b.size = Vector2(260, 40)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		UiTheme.apply_button(b, 13)
		var slot_id: String = SLOTS[i][0]
		b.pressed.connect(func() -> void: _select(slot_id))
		panel.add_child(b)
		_slot_buttons.append(b)

	## 左下: 現在のステータス
	_stat_label = Label.new()
	_stat_label.position = Vector2(20, 356)
	_stat_label.size = Vector2(260, 130)
	UiTheme.apply(_stat_label, 12, Color(0.72, 0.76, 0.86))
	panel.add_child(_stat_label)

	## 右: 候補一覧
	var scroll := ScrollContainer.new()
	scroll.position = Vector2(300, 74)
	scroll.size = Vector2(580, 400)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)

	_list_box = VBoxContainer.new()
	_list_box.custom_minimum_size = Vector2(560, 0)
	_list_box.add_theme_constant_override("separation", 6)
	scroll.add_child(_list_box)


func _select(slot: String) -> void:
	_selected = slot
	_refresh()


func _refresh() -> void:
	## 装備枠のラベル
	for i in SLOTS.size():
		var slot: String = SLOTS[i][0]
		var label: String = SLOTS[i][1]
		var id: String = hero.equipped_in(slot)
		var nm := "― 空き ―"
		var col := Color(0.5, 0.53, 0.63)
		if id != "":
			var d: Dictionary = GameData.gear.get(id, GameData.acc_by_id.get(id, {}))
			nm = str(d.get("name", id))
			col = GameData.rarity_color(str(d.get("rarity", "")))
		var b: Button = _slot_buttons[i]
		b.text = "%s%s: %s" % ["▶ " if slot == _selected else "   ", label, nm]
		UiTheme.apply_button(b, 13, col)

	## ステータス要約
	var s := hero.stats
	_stat_label.text = "攻%d 魔%d 防%d 魔防%d 速%d\n会心 %d%% / 会心ダメ %d%%\n反射 %d%% / 波及 %d%%\n貫通 %d%% / 吸収 %d%%\n被ダメ軽減 %d%% / 回避 %d%%" % [
		int(s["atk"]), int(s["mag"]), int(s["def"]), int(s["res"]), int(s["spd"]),
		int(s["crit_rate"] * 100.0), int(s["crit_dmg"] * 100.0),
		int(s["reflect"] * 100.0), int(s["aoe_ratio"] * 100.0),
		int(s["pierce"] * 100.0), int(s["lifesteal"] * 100.0),
		int(s["dr"] * 100.0), int(s["evade"] * 100.0)]

	## 候補一覧を作り直す
	for c in _list_box.get_children():
		c.queue_free()

	var equipped_here: String = hero.equipped_in(_selected)
	if equipped_here != "":
		_list_box.add_child(_make_entry("", "― 外す ―", "", Color(0.5, 0.53, 0.63)))

	var cands: Array = hero.candidates_for(_selected)
	if cands.is_empty() and equipped_here == "":
		var empty := Label.new()
		empty.text = "この枠に装備できるものを持っていない。\n敵を倒して階層を進めば手に入る。"
		UiTheme.apply(empty, 13, Color(0.6, 0.64, 0.75))
		_list_box.add_child(empty)
		return

	for id in cands:
		var d: Dictionary = GameData.gear.get(id, GameData.acc_by_id.get(id, {}))
		var rarity: String = str(d.get("rarity", ""))
		var head: String = "%s  [%s]%s" % [d.get("name", id), GameData.rarity_label(rarity),
			"（装備中）" if id == equipped_here else ""]
		var body: String = GameData.mods_text(d.get("mods", {}))
		var ft: String = GameData.flags_text(d.get("flags", []), " ")
		if ft != "":
			body += ("\n" if body != "" else "") + ft
		_list_box.add_child(_make_entry(id, head, body, GameData.rarity_color(rarity)))


func _make_entry(id: String, head: String, body: String, col: Color) -> Control:
	var b := Button.new()
	b.custom_minimum_size = Vector2(560, 46 if body == "" else 62)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.text = head + ("\n" + body if body != "" else "")
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UiTheme.apply_button(b, 12, col)
	var cat := "accessories" if id.begins_with("n_") or id.begins_with("l_") or id.begins_with("y_") else "gear"
	if id != "":
		var tex := GameData.sprite(cat, id)
		if tex != null:
			b.icon = tex
	b.pressed.connect(func() -> void:
		hero.equip(_selected, id)
		changed.emit()
		_refresh())
	return b


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_I or event.keycode == KEY_ESCAPE:
			closed.emit()
			get_viewport().set_input_as_handled()
