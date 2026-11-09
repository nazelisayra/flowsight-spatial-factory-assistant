// Shared UI helpers for FlowSight panels: type scale, palette and small builders
// on top of SpectaclesUIKit. All sizes are in cm, calibrated for a 110 cm focal
// distance; panels further away are scaled up on their root SceneObject.

import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material

export type FlowState = "running" | "warning" | "inspection" | "resolved"

// ── Type scale (size + weight from one table) ──────────────────────────────
export const FONT_SIZE_SCALE = 1.0
export type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
export function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
export function applyTextRole(t: Text, role: TextRole): void {
  t.size = roleSize(role)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

// ── Palette (light colours only: Specs is additive, dark = transparent) ────
export const TEXT_PRIMARY = new vec4(1, 1, 1, 1)
export const TEXT_SECONDARY = new vec4(1, 1, 1, 0.8)
export const TEXT_TERTIARY = new vec4(1, 1, 1, 0.66)
export const STATE_COLORS: Record<FlowState, vec4> = {
  running: new vec4(0.45, 0.9, 0.55, 1),
  warning: new vec4(1.0, 0.68, 0.2, 1),
  inspection: new vec4(0.45, 0.72, 1.0, 1),
  resolved: new vec4(0.45, 0.9, 0.55, 1),
}

// Small forward lifts that keep content in front of its backing.
export const CONTENT_Z = 0.6
export const LABEL_ON_BUTTON_Z = 0.08

// ── Builders ───────────────────────────────────────────────────────────────
export function makeObj(parent: SceneObject, name: string, position?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (position) so.getTransform().setLocalPosition(position)
  return so
}

export type TextAlign = "left" | "center" | "right"

export interface TextOptions {
  role: TextRole
  width: number
  height?: number
  align?: TextAlign
  color?: vec4
  z?: number
  inFlex?: boolean
  /** Wrap onto several lines inside the rect instead of overflowing sideways. */
  wrap?: boolean
}

/** Raw Text with an explicit layout rect. Registers a FlexItem unless inFlex is false. */
export function addText(parent: SceneObject, value: string, opts: TextOptions): Text {
  const so = makeObj(parent, "Text", new vec3(0, 0, opts.z ?? 0))
  const t = so.createComponent("Component.Text") as Text
  t.text = value
  t.depthTest = true
  applyTextRole(t, opts.role)
  t.horizontalAlignment =
    opts.align === "left" ? HorizontalAlignment.Left
      : opts.align === "right" ? HorizontalAlignment.Right
        : HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = opts.wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
  t.verticalOverflow = VerticalOverflow.Overflow
  const h = opts.height ?? 2.4
  t.layoutRect = Rect.create(-opts.width / 2, opts.width / 2, -h / 2, h / 2)
  t.textFill.color = opts.color ?? TEXT_PRIMARY
  if (opts.inFlex !== false) so.createComponent(FlexItem.getTypeName())
  return t
}

export interface IconHandle {
  so: SceneObject
  material: Material
}

/** Icon image with its own cloned ImageMaterial so it can be tinted / swapped. */
export function addIcon(parent: SceneObject, texture: Texture, sizeCm: number, color?: vec4, inFlex: boolean = true): IconHandle {
  const so = makeObj(parent, "Icon")
  so.getTransform().setLocalScale(new vec3(sizeCm, sizeCm, 1))
  const img = so.createComponent("Component.Image") as Image
  const mat = imageMaterial.clone()
  mat.mainPass.baseTex = texture
  mat.mainPass.depthTest = true
  mat.mainPass.depthWrite = false
  if (color) mat.mainPass.baseColor = color
  img.clearMaterials()
  img.addMaterial(mat)
  if (inFlex) so.createComponent(FlexItem.getTypeName())
  return {so, material: mat}
}

/** Full-width flex row. The row's own FlexItem keeps a fixed height in the parent column. */
export function makeRow(parent: SceneObject, name: string, height: number,
  justify: FlexJustify = FlexJustify.SpaceBetween, gap: number = 0): SceneObject {
  const row = makeObj(parent, name)
  const f = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
  f.direction = FlexDirection.Row
  f.justifyContent = justify
  f.alignItems = FlexAlign.Center
  f.columnGap = gap
  f.width = -1
  f.height = height
  const item = row.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideHeight = height
  return row
}

export interface ButtonHandle {
  button: Button
  label: Text
}

/** Full-height flex column with a fixed footprint inside its parent. */
export function makeColumn(parent: SceneObject, name: string, width: number, height: number,
  gap: number = 0, align: FlexAlign = FlexAlign.Start): SceneObject {
  const col = makeObj(parent, name)
  const f = col.createComponent(FlexLayout.getTypeName()) as FlexLayout
  f.direction = FlexDirection.Column
  f.justifyContent = FlexJustify.Center
  f.alignItems = align
  f.rowGap = gap
  f.width = width
  f.height = height
  const item = col.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideWidth = width
  item.overrideHeight = height
  return col
}

export type ButtonStyle = "Primary" | "Secondary" | "Ghost" | "PrimaryNeutral"

/** UIKit Button with a width-budgeted raw Text label lifted off the button face. */
export function addButton(parent: SceneObject, label: string, width: number, height: number,
  onTap: () => void, style: ButtonStyle = "PrimaryNeutral", inFlex: boolean = true): ButtonHandle {
  const so = makeObj(parent, `Button ${label}`)
  const button = so.createComponent(Button.getTypeName()) as Button
  // Style must be chosen before the button initialises (OnStart).
  button.setVariant({theme: "SnapOS2", style})
  button.size = new vec3(width, height, 1)
  const t = addText(so, label, {role: "Button", width: width - 0.5, z: LABEL_ON_BUTTON_Z, inFlex: false})
  if (inFlex) so.createComponent(FlexItem.getTypeName())
  button.onTriggerUp.add(() => onTap())
  return {button, label: t}
}

/**
 * Applies show/hide on the first UpdateEvent, after every UIKit component in the
 * subtree has run its OnStart initialisation. Disabling before OnStart would stop
 * Frames, Buttons and FlexLayouts from ever initialising.
 */
export class DeferredVisibility {
  private wanted = true
  private started = false

  constructor(owner: BaseScriptComponent, private readonly target: SceneObject) {
    const tick = owner.createEvent("UpdateEvent")
    tick.bind(() => {
      this.started = true
      this.target.enabled = this.wanted
      tick.enabled = false
    })
  }

  set(visible: boolean): void {
    this.wanted = visible
    if (this.started) this.target.enabled = visible
  }
}
