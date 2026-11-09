// Machine status for the transfer station, in two footprints:
//  • Card  — compact: station, operating state, two primary metrics (flow, queue),
//            a secondary line (belt speed · simulated) and a status message.
//            An optional action button sits just below the card.
//  • Mini  — a small status pill used while the inspection step card is open.
// The two footprints are separate roots, so swapping them never disturbs a layout.

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  addButton, addIcon, addText, CONTENT_Z, DeferredVisibility, FlowState, IconHandle, makeColumn,
  makeObj, makeRow, STATE_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
} from "./FlowSightUiKit"

const ICON_RUNNING = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_WARNING = requireAsset("../Icons/warning.png") as Texture
const ICON_INSPECTION = requireAsset("../Icons/search.png") as Texture
const ICON_RESOLVED = requireAsset("../Icons/check_circle.png") as Texture

const STATE_ICONS: Record<FlowState, Texture> = {
  running: ICON_RUNNING,
  warning: ICON_WARNING,
  inspection: ICON_INSPECTION,
  resolved: ICON_RESOLVED,
}

const STATE_LABELS: Record<FlowState, string> = {
  running: "Running",
  warning: "Warning",
  inspection: "Inspection",
  resolved: "Resolved",
}

export type StatusFootprint = "card" | "mini"

@component
export class FlowSightStatusCardUI extends BaseScriptComponent {
  @ui.label("<b>FlowSight Status</b>")
  @ui.separator
  @ui.group_start("Content")
  @input
  @hint("Station identifier shown in the header")
  stationId: string = "Transfer 02"
  @ui.group_end

  @ui.group_start("Layout")
  @input
  @hint("Compact card width in cm (before the root scale is applied)")
  @widget(new SliderWidget(16, 30, 0.5))
  panelWidth: number = 20

  @input
  @hint("Inner padding in cm")
  @widget(new SliderWidget(0.5, 3, 0.1))
  padding: number = 1.4

  @input
  @hint("Local offset of the mini status pill, in cm (it sits above the inspection step card)")
  miniOffset: vec3 = new vec3(0, 10, 0)
  @ui.group_end

  private cardVisibility: DeferredVisibility
  private miniVisibility: DeferredVisibility
  private actionVisibility: DeferredVisibility

  private stateIcon: IconHandle
  private stateText: Text
  private flowValue: Text
  private queueValue: Text
  private beltLine: Text
  private messageText: Text
  private actionSlot: SceneObject
  private actionButton: Button
  private actionLabel: Text

  private miniIcon: IconHandle
  private miniText: Text

  private readonly onActionEvent = new Event<void>()
  get onAction(): PublicApi<void> {
    return this.onActionEvent.publicApi()
  }

  onAwake(): void {
    this.buildCard()
    this.buildMini()
    this.setFootprint("card")
    this.setState("running", "All systems nominal")
  }

  setFootprint(footprint: StatusFootprint): void {
    this.cardVisibility.set(footprint === "card")
    this.miniVisibility.set(footprint === "mini")
  }

  /** Operating state, colour, icon and the one-line status message. */
  setState(state: FlowState, message: string): void {
    const color = STATE_COLORS[state]
    for (const icon of [this.stateIcon, this.miniIcon]) {
      icon.material.mainPass.baseTex = STATE_ICONS[state]
      icon.material.mainPass.baseColor = color
    }
    this.stateText.text = STATE_LABELS[state]
    this.stateText.textFill.color = color
    this.messageText.text = message
    this.messageText.textFill.color = state === "running" ? TEXT_SECONDARY : color
    this.miniText.text = `${this.stationId} · ${message}`
  }

  setMessage(message: string, color?: vec4): void {
    this.messageText.text = message
    if (color) this.messageText.textFill.color = color
  }

  /** speedMps in m/s, queue in items, flow in units/min. */
  setMetrics(speedMps: number, queue: number, flow: number): void {
    this.flowValue.text = `${Math.round(flow)}`
    this.queueValue.text = `${Math.round(queue)}`
    this.beltLine.text = `Belt ${speedMps.toFixed(1)} m/s · simulated telemetry`
  }

  /** The button below the card. Hidden when visible is false. */
  setAction(label: string, visible: boolean, enabled: boolean = true): void {
    this.actionLabel.text = label
    this.actionLabel.textFill.color = enabled ? TEXT_PRIMARY : TEXT_TERTIARY
    this.actionButton.inactive = !enabled
    this.actionVisibility.set(visible)
  }

  // ── Compact card ─────────────────────────────────────────────────────────
  private buildCard(): void {
    const root = makeObj(this.sceneObject, "Card")
    this.cardVisibility = new DeferredVisibility(this, root)
    root.createComponent("Component.Canvas")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"

    const content = makeObj(root, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = this.panelWidth
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.5
    flex.paddingTop = this.padding
    flex.paddingBottom = this.padding
    flex.paddingLeft = this.padding
    flex.paddingRight = this.padding

    const inner = this.panelWidth - this.padding * 2

    // Header: icon · station · state
    const header = makeRow(content, "Header", 3.2, FlexJustify.Start, 0.8)
    this.stateIcon = addIcon(header, ICON_RUNNING, 2.4, STATE_COLORS.running)
    addText(header, this.stationId, {role: "Headline2", width: inner * 0.52, height: 3, align: "left"})
    this.stateText = addText(header, STATE_LABELS.running, {role: "Callout", width: inner * 0.48 - 4.2, height: 3, align: "right", color: STATE_COLORS.running})

    // Two primary metrics: big number, unit underneath
    const metrics = makeRow(content, "Metrics", 5.8, FlexJustify.SpaceBetween)
    this.flowValue = this.addMetric(metrics, "42", "units/min · flow", inner / 2 - 0.3)
    this.queueValue = this.addMetric(metrics, "3", "items in queue", inner / 2 - 0.3)

    // Secondary + message
    const belt = makeRow(content, "Belt", 2.0, FlexJustify.Start)
    this.beltLine = addText(belt, "Belt 1.2 m/s · simulated telemetry", {role: "Caption", width: inner, height: 1.8, align: "left", color: TEXT_TERTIARY})
    const msg = makeRow(content, "Message", 2.4, FlexJustify.Start)
    this.messageText = addText(msg, "", {role: "Callout", width: inner, height: 2.2, align: "left", color: TEXT_SECONDARY})

    // Action button: outside the flex column so it can hide without a re-layout.
    this.actionSlot = makeObj(root, "Action", new vec3(0, 0, CONTENT_Z))
    this.actionVisibility = new DeferredVisibility(this, this.actionSlot)
    const action = addButton(this.actionSlot, "Simulate congestion", inner, 3.2, () => this.onActionEvent.invoke(), "Secondary", false)
    this.actionButton = action.button
    this.actionLabel = action.label

    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
      this.actionSlot.getTransform().setLocalPosition(new vec3(0, -r.containerHeight / 2 - 0.8 - 1.6, CONTENT_Z))
    })
  }

  private addMetric(parent: SceneObject, value: string, label: string, width: number): Text {
    const col = makeColumn(parent, `Metric ${label}`, width, 5.8, 0.2, FlexAlign.Start)
    const v = addText(col, value, {role: "Title2", width, height: 3.4, align: "left"})
    addText(col, label, {role: "Caption", width, height: 1.8, align: "left", color: TEXT_SECONDARY})
    return v
  }

  // ── Mini pill ────────────────────────────────────────────────────────────
  private buildMini(): void {
    const root = makeObj(this.sceneObject, "Mini", this.miniOffset)
    this.miniVisibility = new DeferredVisibility(this, root)
    root.createComponent("Component.Canvas")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"

    const content = makeObj(root, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.Row
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Center
    flex.columnGap = 0.7
    flex.paddingLeft = 1.0
    flex.paddingRight = 1.0
    flex.paddingTop = 0.5
    flex.paddingBottom = 0.5
    flex.width = -1
    flex.height = -1
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    this.miniIcon = addIcon(content, ICON_INSPECTION, 1.8, STATE_COLORS.inspection)
    this.miniText = addText(content, `${this.stationId} · Inspection`, {role: "Caption", width: 17, height: 2, align: "left", color: TEXT_PRIMARY})
  }
}
