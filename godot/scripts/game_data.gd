extends Node
## GameData - Web版と共有しているJSONデータの読み込みと引き当て。
##
## data/*.json は tools/export-data.js が js/data/*.js から生成したもの。
## データの二重管理を避けるため、Godot側では絶対に手で書き換えないこと。

const DATA_DIR := "res://data/"
const SPRITE_DIR := "res://assets/sprites/"

var elements: Dictionary = {}
var modkeys: Dictionary = {}
var flags: Dictionary = {}
var magic_elements: Array = []
var all_elements: Array = []
var weak_mult: float = 1.6
var resist_mult: float = 0.55

var skills: Dictionary = {}
var classes: Dictionary = {}
var weapons: Array = []
var armors: Array = []
var gear: Dictionary = {}          ## id -> 装備
var accessories: Array = []
var acc_by_id: Dictionary = {}
var items: Array = []
var item_by_id: Dictionary = {}
var enemies: Array = []
var enemy_by_id: Dictionary = {}
var tree_branches: Array = []
var tree_node_by_id: Dictionary = {}
var classtree: Dictionary = {}

var _sprite_cache: Dictionary = {}


func _ready() -> void:
	_load_all()
	_report()


func _read_json(name: String) -> Variant:
	var path := DATA_DIR + name
	if not FileAccess.file_exists(path):
		push_error("データが見つかりません: %s" % path)
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if parsed == null:
		push_error("JSONの解析に失敗: %s" % path)
	return parsed


func _load_all() -> void:
	var el: Dictionary = _read_json("elements.json")
	if el:
		elements = el.get("elements", {})
		magic_elements = el.get("magic_elements", [])
		all_elements = el.get("all_elements", [])
		weak_mult = float(el.get("weak_mult", 1.6))
		resist_mult = float(el.get("resist_mult", 0.55))
		modkeys = el.get("modkeys", {})
		flags = el.get("flags", {})

	skills = _read_json("skills.json")
	classes = _read_json("classes.json")

	var g: Dictionary = _read_json("gear.json")
	weapons = g.get("weapons", [])
	armors = g.get("armors", [])
	for w in weapons:
		gear[w["id"]] = w
	for a in armors:
		gear[a["id"]] = a

	accessories = _read_json("accessories.json")
	for a in accessories:
		acc_by_id[a["id"]] = a

	items = _read_json("items.json")
	for it in items:
		item_by_id[it["id"]] = it

	enemies = _read_json("enemies.json")
	for e in enemies:
		enemy_by_id[e["id"]] = e

	tree_branches = _read_json("skilltree.json")
	for br in tree_branches:
		for nd in br.get("nodes", []):
			tree_node_by_id[nd["id"]] = nd

	classtree = _read_json("classtree.json")


func _report() -> void:
	print("[GameData] 職業 %d / スキル %d / アクセ %d / 敵 %d / 共通ツリー %d系統 / 職業ツリー %d職"
		% [classes.size(), skills.size(), accessories.size(), enemies.size(),
		tree_branches.size(), classtree.size()])


## ---------------- 引き当て ----------------

func klass(id: String) -> Dictionary:
	return classes.get(id, {})


func skill(id: String) -> Dictionary:
	return skills.get(id, {})


func accessories_of(rarity: String) -> Array:
	return accessories.filter(func(a: Dictionary) -> bool: return a.get("rarity", "") == rarity)


func class_ids_of_tier(t: int) -> Array:
	var out: Array = []
	for id in classes:
		if int(classes[id].get("tier", 1)) == t:
			out.append(id)
	return out


## 属性の相性倍率。pierce は耐性側のペナルティを緩和する。
func element_mult(el: String, weak: Array, resist: Array, pierce: float, guard_break: bool) -> float:
	if el != "phys" and weak.has(el):
		return weak_mult
	if resist.has(el):
		var p: float = clampf(pierce + (0.25 if guard_break else 0.0), 0.0, 1.0)
		return resist_mult + (1.0 - resist_mult) * p
	return 1.0


## ---------------- スプライト ----------------

func sprite(category: String, id: String) -> Texture2D:
	var key := category + "/" + id
	if _sprite_cache.has(key):
		return _sprite_cache[key]
	var path := SPRITE_DIR + key + ".png"
	var tex: Texture2D = null
	if ResourceLoader.exists(path):
		tex = load(path)
	else:
		push_warning("スプライトが見つかりません: %s" % path)
	_sprite_cache[key] = tex
	return tex
