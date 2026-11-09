// Spatial callouts anchored to points measured on the conveyor model:
// a marker on the machine, a vertical leader line and a label that faces the
// viewer. Three inspection callouts plus one congestion tag for the Warning state.

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import {
  addIcon, addText, CONTENT_Z, DeferredVisibility, IconHandle, makeObj,
  STATE_COLORS, TEXT_PRIMARY,
} from "./FlowSightUiKit"

const ICON_TODO = requireAsset("../Icons/radio_button_unchecked.png") as Texture
const ICON_ACTIVE = requireAsset("../Icons/search.png") as Texture
const ICON_DONE = requireAsset("../Icons/check_circle.png") as Texture
const ICON_WARNING = requireAsset("../Icons/warning.png") as Texture

export type CalloutState = "pending" | "active" | "done"

const PENDING_COLOR = new vec4(0.75, 0.8, 0.88, 1)

interface Callout {
  root: SceneObject
  visibility: DeferredVisibility
  marker: Transform
  markerMaterial: Material
  leaderMaterial: Material
  icon: IconHandle
  label: Text
  labelRoot: Transform
  state: CalloutState
}

// Only the current step's callout is emphasised; the others stay readable but quiet.
const EMPHASIS: Record<CalloutState, {label: number; marker: number}> = {
  active: {label: 1.0, marker: 1.0},
  pending: {label: 0.72, marker: 0.6},
  done: {label: 0.72, marker: 0.7},
}

@component
export class FlowSightCalloutsUI extends BaseScriptComponent {
  @ui.label("<b>FlowSight Spatial Callouts</b>")
  @ui.separator
  @ui.group_start("Anchors (points on the model)")
  @input
  @hint("Transfer point between the infeed rollers and the transfer belt")
  rollersAnchor: SceneObject

  @input
  @hint("Sensor on the infeed upright of the scanning cage")
  sensorAnchor: SceneObject

  @input
  @hint("Centre of the transfer belt")
  pathAnchor: SceneObject

  @input
  @hint("Centre of the congestion zone (Warning tag)")
  zoneAnchor: SceneObject
  @ui.group_end

  @ui.group_start("Labels")
  @input
  @hint("Callout labels, in checklist order")
  labels: string[] = ["1 · Transfer rollers", "2 · Sensor alignment", "3 · Path clear"]

  @input
  @hint("Congestion tag label shown in the Warning state")
  zoneLabel: string = "Possible congestion · transfer zone"

  @input
  @hint("Leader line heights in cm, in checklist order")
  leaderHeights: number[] = [42, 22, 48]

  @input
  @hint("Leader line height for the congestion tag in cm")
  zoneLeaderHeight: number = 62
  @ui.group_end

  @ui.group_start("Visuals")
  @input
  @hint("Sphere mesh used for the markers")
  markerMesh: RenderMesh

  @input
  @hint("Cylinder mesh used for the leader lines")
  leaderMesh: RenderMesh

  @input
  @hint("Unlit material cloned for each marker")
  markerMaterial: Material

  @input
  @hint("Unlit material cloned for each leader line")
  leaderMaterial: Material

  @input
  @hint("Marker diameter in cm")
  @widget(new SliderWidget(1, 10, 0.5))
  markerSize: number = 4.5

  @input
  @hint("Scale applied to the labels (they are authored for 110 cm viewing)")
  @widget(new SliderWidget(1, 3, 0.05))
  labelScale: number = 1.9
  @ui.group_end

  private callouts: Callout[] = []
  private zoneTag: Callout
  private time = 0

  onAwake(): void {
    const anchors = [this.rollersAnchor, this.sensorAnchor, this.pathAnchor]
    anchors.forEach((anchor, i) => {
      this.callouts.push(this.buildCallout(anchor, this.labels[i] ?? `Point ${i + 1}`, this.leaderHeights[i] ?? 40, ICON_TODO))
    })
    this.zoneTag = this.buildCallout(this.zoneAnchor, this.zoneLabel, this.zoneLeaderHeight, ICON_WARNING)
    this.applyColor(this.zoneTag, STATE_COLORS.warning)

    this.callouts.forEach((c) => this.setCalloutState(c, "pending"))
    this.setInspectionVisible(false)
    this.setZoneTagVisible(false)

    this.createEvent("UpdateEvent").bind(() => this.animate())
  }

  setInspectionVisible(visible: boolean): void {
    this.callouts.forEach((c) => c.visibility.set(visible))
  }

  setZoneTagVisible(visible: boolean): void {
    this.zoneTag.visibility.set(visible)
  }

  setState(index: number, state: CalloutState): void {
    const c = this.callouts[index]
    if (c) this.setCalloutState(c, state)
  }

  private setCalloutState(c: Callout, state: CalloutState): void {
    c.state = state
    const icon = state === "done" ? ICON_DONE : state === "active" ? ICON_ACTIVE : ICON_TODO
    c.icon.material.mainPass.baseTex = icon
    const color = state === "done" ? STATE_COLORS.resolved
      : state === "active" ? STATE_COLORS.inspection
        : PENDING_COLOR
    this.applyColor(c, color)
    const k = this.labelScale * EMPHASIS[state].label
    c.labelRoot.setLocalScale(new vec3(k, k, k))
    c.label.textFill.color = state === "pending" ? new vec4(1, 1, 1, 0.75) : TEXT_PRIMARY
  }

  private applyColor(c: Callout, color: vec4): void {
    c.markerMaterial.mainPass.baseColor = color
    c.leaderMaterial.mainPass.baseColor = new vec4(color.x, color.y, color.z, 0.9)
    c.icon.material.mainPass.baseColor = color
  }

  private animate(): void {
    this.time += getDeltaTime()
    const pulse = 1 + 0.25 * Math.sin(this.time * 5)
    for (const c of this.callouts) {
      const base = this.markerSize * EMPHASIS[c.state].marker
      const s = c.state === "active" ? base * pulse : base
      c.marker.setLocalScale(this.meshScale(this.markerMesh, new vec3(s, s, s)))
    }
    const zs = this.markerSize * (1 + 0.2 * Math.sin(this.time * 6))
    this.zoneTag.marker.setLocalScale(this.meshScale(this.markerMesh, new vec3(zs, zs, zs)))
  }

  private buildCallout(anchor: SceneObject, labelText: string, leaderHeight: number, iconTex: Texture): Callout {
    const root = makeObj(this.sceneObject, `Callout ${labelText}`)
    root.getTransform().setWorldPosition(anchor.getTransform().getWorldPosition())
    root.getTransform().setWorldRotation(quat.quatIdentity())
    const visibility = new DeferredVisibility(this, root)

    const marker = makeObj(root, "Marker")
    const markerMat = this.addMesh(marker, this.markerMesh, this.markerMaterial)
    marker.getTransform().setLocalScale(this.meshScale(this.markerMesh, new vec3(this.markerSize, this.markerSize, this.markerSize)))

    const leader = makeObj(root, "Leader", new vec3(0, leaderHeight / 2, 0))
    const leaderMat = this.addMesh(leader, this.leaderMesh, this.leaderMaterial)
    leader.getTransform().setLocalScale(this.meshScale(this.leaderMesh, new vec3(0.45, leaderHeight, 0.45)))

    const labelRoot = makeObj(root, "Label", new vec3(0, leaderHeight + 2.5 * this.labelScale, 0))
    labelRoot.getTransform().setLocalScale(new vec3(this.labelScale, this.labelScale, this.labelScale))
    labelRoot.createComponent(Billboard.getTypeName())
    const {icon, label} = this.buildLabel(labelRoot, labelText, iconTex)

    return {root, visibility, marker: marker.getTransform(), markerMaterial: markerMat, leaderMaterial: leaderMat, icon, label, labelRoot: labelRoot.getTransform(), state: "pending"}
  }

  private buildLabel(parent: SceneObject, labelText: string, iconTex: Texture): {icon: IconHandle; label: Text} {
    const card = makeObj(parent, "Card")
    card.createComponent("Component.Canvas")
    const plate = card.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"

    const textWidth = labelText.length * 0.62 + 1
    const content = makeObj(card, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.Row
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Center
    flex.columnGap = 0.8
    flex.paddingLeft = 1.1
    flex.paddingRight = 1.1
    flex.paddingTop = 0.7
    flex.paddingBottom = 0.7
    flex.width = -1
    flex.height = -1
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const icon = addIcon(content, iconTex, 2.4)
    const label = addText(content, labelText, {role: "Callout", width: textWidth, height: 2.6, align: "left", color: TEXT_PRIMARY})

    // Labels draw on top of the machine so parts like the HMI monitor never hide
    // them when the viewer moves. Markers and leaders stay depth-tested, so they
    // still read as attached to the machine.
    label.depthTest = false
    icon.material.mainPass.depthTest = false
    plate.onInitialized.add(() => this.disableDepthTest(card))
    return {icon, label}
  }

  private disableDepthTest(so: SceneObject): void {
    const rmvs = so.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]
    for (const rmv of rmvs) {
      for (let i = 0; i < rmv.getMaterialsCount(); i++) rmv.getMaterial(i).mainPass.depthTest = false
    }
    for (let i = 0; i < so.getChildrenCount(); i++) this.disableDepthTest(so.getChild(i))
  }

  private addMesh(so: SceneObject, mesh: RenderMesh, material: Material): Material {
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    const mat = material.clone()
    rmv.clearMaterials()
    rmv.addMaterial(mat)
    return mat
  }

  /** Local scale that gives the mesh the requested size in cm, whatever its authored bounds. */
  private meshScale(mesh: RenderMesh, sizeCm: vec3): vec3 {
    const size = mesh.aabbMax.sub(mesh.aabbMin)
    return new vec3(sizeCm.x / Math.max(size.x, 1e-4), sizeCm.y / Math.max(size.y, 1e-4), sizeCm.z / Math.max(size.z, 1e-4))
  }
}
