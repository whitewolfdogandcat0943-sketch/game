class_name TreeScreen
extends CanvasLayer
## スキルツリー画面。共通ツリー（9系統54ノード）と職業ツリー（3段2択）を切り替える。
##
## 共通ツリー = どのビルドを目指すか
## 職業ツリー = その職業をどう解釈するか
## という二層構造は Web版と同じ。

signal changed()
signal closed()

var hero: HeroState
var _mode: String = "common"
var _branch: String = ""
var _root: Panel
var _body: VBoxContainer
var _header: Label
var _mode_buttons: Array = []


func setup(h: HeroState) -> void:
	hero = h
	layer = 10
	_branch = str(GameData.tree_branches[0].get("id", "")) if GameData.tree_branches.size() > 0 else ""
	_build()
	refresh()


func _build() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.02, 0.04, 0.85)
	dim.size = Vector2(960, 540)
	add_child(dim)

	_root = Panel.new()
	_root.position = Vector2(30, 20)
	_root.size = Vector2(900, 500)
	add_child(_root)

	var title := Label.new()
	title.text = "スキルツリー"
	title.position = Vector2(20, 10)
	UiTheme.apply(title, 20, Color(1.0, 0.81, 0.42))
	_root.add_child(title)

	for i in 2:
		var b := Button.new()
		b.position = Vector2(190 + i * 130, 12)
		b.custom_minimum_size = Vector2(120, 28)
		b.size = Vector2(120, 28)
		b.text = "共通ツリー" if i == 0 else "職業ツリー"
		UiTheme.apply_button(b, 12)
		var m: String = "common" if i == 0 else "class"
		b.pressed.connect(func() -> void:
			_mode = m
			refresh())
		_root.add_child(b)
		_mode_buttons.append(b)

	_header = Label.new()
	_header.position = Vector2(20, 46)
	_header.size = Vector2(860, 40)
	UiTheme.apply(_header, 12, Color(0.72, 0.76, 0.86))
	_root.add_child(_header)

	var scroll := ScrollContainer.new()
	scroll.position = Vector2(16, 92)
	scroll.size = Vector2(868, 394)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_root.add_child(scroll)

	_body = VBoxContainer.new()
	_body.custom_minimum_size = Vector2(848, 0)
	_body.add_theme_constant_override("separation", 6)
	scroll.add_child(_body)


func refresh() -> void:
	for i in _mode_buttons.size():
		var on: bool = (_mode == "common") == (i == 0)
		UiTheme.apply_button(_mode_buttons[i], 12,
			Color(1.0, 0.81, 0.42) if on else Color(0.55, 0.58, 0.68))
	for c in _body.get_children():
		c.queue_free()
	if _mode == "common":
		_build_common()
	else:
		_build_class()


## ---------------- 共通ツリー ----------------

func _build_common() -> void:
	var cost := hero.tree_respec_cost()
	_header.text = "残りSP %d ／ 使用済み %d SP　　振り直し %d G（所持 %d G）\nSPはレベルアップで入る。ここで伸ばした数値はそのまま職業の解放条件に反映される。" % [
		hero.sp, hero.tree_total_spent(), cost, hero.gold]

	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 4)
	_body.add_child(tabs)
	for br in GameData.tree_branches:
		var bid := str(br.get("id", ""))
		var b := Button.new()
		var inv := hero.branch_spent(bid)
		b.text = "%s%s" % [br.get("name", bid), ("  %d" % inv) if inv > 0 else ""]
		b.custom_minimum_size = Vector2(92, 28)
		UiTheme.apply_button(b, 11,
			Color(1.0, 0.81, 0.42) if bid == _branch else Color(0.72, 0.76, 0.86))
		b.pressed.connect(func() -> void:
			_branch = bid
			refresh())
		tabs.add_child(b)

	if cost > 0:
		var rb := Button.new()
		rb.text = "振り直す"
		rb.custom_minimum_size = Vector2(90, 28)
		UiTheme.apply_button(rb, 11, Color(1.0, 0.62, 0.26) if hero.gold >= cost else Color(0.45, 0.47, 0.56))
		rb.pressed.connect(func() -> void:
			if hero.gold >= cost:
				hero.gold -= cost
				hero.tree_respec()
				changed.emit()
				refresh())
		tabs.add_child(rb)

	var branch: Dictionary = {}
	for br2 in GameData.tree_branches:
		if str(br2.get("id", "")) == _branch:
			branch = br2
	if branch.is_empty():
		return

	var desc := Label.new()
	desc.text = str(branch.get("desc", ""))
	UiTheme.apply(desc, 12, Color(0.6, 0.64, 0.75))
	_body.add_child(desc)

	for row in [1, 2, 3, 4]:
		var line := HBoxContainer.new()
		line.add_theme_constant_override("separation", 8)
		var any := false
		for nd in branch.get("nodes", []):
			if int(nd.get("row", 0)) != row:
				continue
			any = true
			line.add_child(_common_node_button(nd))
		if any:
			_body.add_child(line)


func _common_node_button(nd: Dictionary) -> Button:
	var id := str(nd.get("id", ""))
	var chk := hero.tree_check(id)
	var b := Button.new()
	b.custom_minimum_size = Vector2(414, 84)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var lines: Array = []
	lines.append("%s%s  [%d SP]%s" % [
		"✔ " if chk["owned"] else "", nd.get("name", id), int(nd.get("cost", 0)),
		"  《奥義》" if int(nd.get("row", 1)) == 4 else ""])
	var mt := GameData.mods_text(nd.get("mods", {}))
	if mt != "":
		lines.append(mt)
	var ft := GameData.flags_text(nd.get("flags", []), "　")
	if ft != "":
		lines.append(ft)
	var sk := str(nd.get("skill", ""))
	if sk != "":
		lines.append("スキル習得: 【%s】" % GameData.skill(sk).get("name", sk))
	if not chk["owned"]:
		for r in chk["reasons"]:
			if not r["ok"]:
				lines.append("✖ " + str(r["label"]))
	b.text = "\n".join(lines)

	var col := Color(1.0, 0.81, 0.42) if chk["owned"] else (
		Color(0.85, 0.87, 0.92) if chk["ok"] else Color(0.45, 0.47, 0.56))
	UiTheme.apply_button(b, 11, col)
	b.disabled = not chk["ok"]
	if chk["ok"]:
		b.pressed.connect(func() -> void:
			if hero.tree_take(id):
				changed.emit()
				refresh())
	return b


## ---------------- 職業ツリー ----------------

func _build_class() -> void:
	var cid := hero.class_id
	var wins := hero.mastery_wins(cid)
	var cost := hero.mastery_respec_cost()
	_header.text = "%s　習熟度 %d　　選び直し %d G（所持 %d G）\n習熟度はこの職業で階層を踏破すると貯まる。各段は片方しか選べない。効果があるのは今の職業の選択だけ。" % [
		GameData.klass(cid).get("name", cid), wins, cost, hero.gold]

	if cost > 0:
		var rb := Button.new()
		rb.text = "選び直す（%d G）" % cost
		rb.custom_minimum_size = Vector2(160, 28)
		UiTheme.apply_button(rb, 11, Color(1.0, 0.62, 0.26) if hero.gold >= cost else Color(0.45, 0.47, 0.56))
		rb.pressed.connect(func() -> void:
			if hero.gold >= cost:
				hero.gold -= cost
				hero.mastery_respec()
				changed.emit()
				refresh())
		_body.add_child(rb)

	var rows: Array = GameData.classtree.get(cid, [])
	var picks := hero.mastery_picks(cid)
	for row in rows:
		var tier := int(row.get("tier", 0))
		var need := int(row.get("need", 0))
		var open: bool = wins >= need
		var chosen := str(picks.get(str(tier), ""))

		var head := Label.new()
		var note := ""
		if not open:
			note = "　習熟 %d で解放（あと %d）" % [need, need - wins]
		elif chosen == "":
			note = "　どちらか一方を選択"
		head.text = "第%d段%s" % [tier, note]
		UiTheme.apply(head, 12, Color(0.6, 0.64, 0.75))
		_body.add_child(head)

		var line := HBoxContainer.new()
		line.add_theme_constant_override("separation", 8)
		for w in ["a", "b"]:
			line.add_child(_class_node_button(row, w, open, chosen, tier))
		_body.add_child(line)


func _class_node_button(row: Dictionary, which: String, open: bool,
		chosen: String, tier: int) -> Button:
	var nd: Dictionary = row.get(which, {})
	var is_chosen: bool = chosen == which
	var is_rejected: bool = chosen != "" and not is_chosen

	var b := Button.new()
	b.custom_minimum_size = Vector2(414, 76)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var lines: Array = []
	lines.append("%s%s" % ["✔ " if is_chosen else "", nd.get("name", "")])
	lines.append(str(nd.get("desc", "")))
	var mt := GameData.mods_text(nd.get("mods", {}))
	if mt != "":
		lines.append(mt)
	var ft := GameData.flags_text(nd.get("flags", []), "　")
	if ft != "":
		lines.append(ft)
	var sk := str(nd.get("skill", ""))
	if sk != "":
		lines.append("スキル習得: 【%s】" % GameData.skill(sk).get("name", sk))
	if is_rejected:
		lines.append("✖ 選ばなかった道")
	b.text = "\n".join(lines)

	var col := Color(1.0, 0.81, 0.42) if is_chosen else (
		Color(0.85, 0.87, 0.92) if (open and chosen == "") else Color(0.45, 0.47, 0.56))
	UiTheme.apply_button(b, 11, col)
	b.disabled = not (open and chosen == "")
	if not b.disabled:
		b.pressed.connect(func() -> void:
			if hero.mastery_pick(tier, which):
				changed.emit()
				refresh())
	return b


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_T or event.keycode == KEY_ESCAPE:
			closed.emit()
			get_viewport().set_input_as_handled()
