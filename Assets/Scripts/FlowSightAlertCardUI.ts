// Contextual congestion alert for the Warning state. Floats just above the
// stuck parcel at the transfer zone (never in front of the rollers), faces the
// viewer, and is tied to the exact spot by a leader line and a pulsing marker.
// Holds the single primary action of the Warning state: Start inspection.

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  addButton, addIcon, addText, CONTENT_Z, DeferredVisibility, makeObj, makeRow,
  STATE_COLORS, TEXT_SECONDARY, TEXT_TERTIARY,
} from "./FlowSightUiKit"

const ICON_WARNING = requireAsset("../Icons/warning.png") as Texture

@component
export class FlowSightAlertCardUI extends BaseScriptComponent {
  @ui.label("<b>FlowSight Congestion Alert</b>")
  @ui.separator
  @ui.group_start("Placement")
  @input
  @hint("Point on the machine the alert refers to (top of the stuck parcel at the transfer point)")
  target: SceneObject

  @input
  @hint("Card scale (content is authored for 110 cm viewing)")
  @widget(new SliderWidget(1, 3, 0.05))
  cardScale: number = 1.8
  @ui.group_end

  @ui.group_start("Content")
  @input
  @hint("Alert title")
  title: string = "Congestion detected"

  @input
  @hint("One-line explanation under the title")
  detail: string = "Parcels are queuing where the rollers meet the transfer belt."
  @ui.group_end

  @ui.group_start("Visuals")
  @input
  @hint("Sphere mesh for the marker")
  markerMesh: RenderMesh

  @input
  @hint("Cylinder mesh for the leader line")
  leaderMesh: RenderMesh

  @input
  @hint("Unlit material cloned for the marker and leader")
  lineMaterial: Material
  @ui.group_end

  private visibility: DeferredVisibility
  private card: SceneObject
  private cardHeight = 16
  private leader: Transform
  private marker: Transform
  private time = 0

  private readonly onStartInspectionEvent = new Event<void>()
  get onStartInspection(): PublicApi<void> {
    return this.onStartInspectionEvent.publicApi()
  }

  onAwake(): void {
    const root = makeObj(this.sceneObject, "Alert")
    this.visibility = new DeferredVisibility(this, root)

    this.card = makeObj(root, "Card")
    this.card.getTransform().setLocalScale(new vec3(this.cardScale, this.cardScale, this.cardScale))
    this.card.createComponent(Billboard.getTypeName())
    this.buildCard(this.card)

    const color = STATE_COLORS.warning
    this.leader = this.addMesh(root, "Leader", this.leaderMesh, color)
    this.marker = this.addMesh(root, "Marker", this.markerMesh, color)

    this.createEvent("UpdateEvent").bind(() => this.update(getDeltaTime()))
  }

  setVisible(visible: boolean): void {
    this.visibility.set(visible)
  }

  private buildCard(parent: SceneObject): void {
    parent.createComponent("Component.Canvas")
    const plate = parent.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"

    const width = 19
    const pad = 1.4
    const inner = width - pad * 2
    const content = makeObj(parent, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = width
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.6
    flex.paddingTop = pad
    flex.paddingBottom = pad
    flex.paddingLeft = pad
    flex.paddingRight = pad
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
      this.cardHeight = r.containerHeight
    })

    const header = makeRow(content, "Header", 3.2, FlexJustify.Start, 0.8)
    addIcon(header, ICON_WARNING, 2.6, STATE_COLORS.warning)
    addText(header, this.title, {role: "Headline2", width: inner - 3.4, height: 3, align: "left", color: STATE_COLORS.warning})

    const body = makeRow(content, "Detail", 4.0, FlexJustify.Start)
    addText(body, this.detail, {role: "Body", width: inner, height: 3.8, align: "left", color: TEXT_SECONDARY, wrap: true})

    const action = makeRow(content, "Action", 3.8, FlexJustify.Center)
    addButton(action, "Start inspection", inner, 3.6, () => this.onStartInspectionEvent.invoke(), "Primary")

    const foot = makeRow(content, "Footnote", 1.9, FlexJustify.Start)
    addText(foot, "Simulated alert · no equipment control", {role: "Caption", width: inner, height: 1.8, align: "left", color: TEXT_TERTIARY})
  }

  private update(dt: number): void {
    this.time += dt
    if (!this.target) return
    const root = this.card.getParent().getTransform()
    const inv = root.getInvertedWorldTransform()
    const up = inv.multiplyDirection(vec3.up()).normalize()

    // Leader from the card's bottom edge down to the target point.
    const cardPos = this.card.getTransform().getLocalPosition()
    const bottom = cardPos.sub(up.uniformScale((this.cardHeight * this.cardScale) / 2))
    const tip = inv.multiplyPoint(this.target.getTransform().getWorldPosition())
    const span = bottom.sub(tip)
    const len = Math.max(span.length, 0.01)
    this.leader.setLocalPosition(tip.add(span.uniformScale(0.5)))
    this.leader.setLocalRotation(quat.rotationFromTo(vec3.up(), span.normalize()))
    this.leader.setLocalScale(this.meshScale(this.leaderMesh, new vec3(0.45, len, 0.45)))

    const s = 4 * (1 + 0.22 * Math.sin(this.time * 6))
    this.marker.setLocalPosition(tip)
    this.marker.setLocalScale(this.meshScale(this.markerMesh, new vec3(s, s, s)))
  }

  private addMesh(parent: SceneObject, name: string, mesh: RenderMesh, color: vec4): Transform {
    const so = makeObj(parent, name)
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    const mat = this.lineMaterial.clone()
    mat.mainPass.baseColor = color
    rmv.clearMaterials()
    rmv.addMaterial(mat)
    return so.getTransform()
  }

  private meshScale(mesh: RenderMesh, sizeCm: vec3): vec3 {
    const size = mesh.aabbMax.sub(mesh.aabbMin)
    return new vec3(sizeCm.x / Math.max(size.x, 1e-4), sizeCm.y / Math.max(size.y, 1e-4), sizeCm.z / Math.max(size.z, 1e-4))
  }
}
