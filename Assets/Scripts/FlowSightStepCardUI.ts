// Focused inspection card: one task at a time with 1/3 · 2/3 · 3/3 progress.
// The controller keeps the full checklist state and pushes the current step in;
// this card only shows it and reports Confirm / Back presses.

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  addButton, addIcon, addText, CONTENT_Z, DeferredVisibility, IconHandle, makeObj, makeRow,
  STATE_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
} from "./FlowSightUiKit"

const ICON_TODO = requireAsset("../Icons/radio_button_unchecked.png") as Texture
const ICON_CURRENT = requireAsset("../Icons/search.png") as Texture
const ICON_DONE = requireAsset("../Icons/check_circle.png") as Texture

const PENDING_COLOR = new vec4(1, 1, 1, 0.55)

@component
export class FlowSightStepCardUI extends BaseScriptComponent {
  @ui.label("<b>FlowSight Inspection Step Card</b>")
  @ui.separator
  @ui.group_start("Layout")
  @input
  @hint("Card width in cm (before the root scale is applied)")
  @widget(new SliderWidget(16, 30, 0.5))
  panelWidth: number = 21

  @input
  @hint("Inner padding in cm")
  @widget(new SliderWidget(0.5, 3, 0.1))
  padding: number = 1.4

  @input
  @hint("Number of steps shown in the progress row")
  stepCount: number = 3
  @ui.group_end

  private visibility: DeferredVisibility
  private progressText: Text
  private progressIcons: IconHandle[] = []
  private titleText: Text
  private hintText: Text
  private backButton: Button
  private backLabel: Text
  private confirmButton: Button
  private confirmLabel: Text

  private readonly onConfirmEvent = new Event<void>()
  get onConfirm(): PublicApi<void> {
    return this.onConfirmEvent.publicApi()
  }

  private readonly onBackEvent = new Event<void>()
  get onBack(): PublicApi<void> {
    return this.onBackEvent.publicApi()
  }

  onAwake(): void {
    const root = makeObj(this.sceneObject, "Card")
    this.visibility = new DeferredVisibility(this, root)
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
    flex.rowGap = 0.6
    flex.paddingTop = this.padding
    flex.paddingBottom = this.padding
    flex.paddingLeft = this.padding
    flex.paddingRight = this.padding
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const inner = this.panelWidth - this.padding * 2

    // Header: "Inspection" + step counter
    const header = makeRow(content, "Header", 2.6, FlexJustify.SpaceBetween)
    addText(header, "Inspection", {role: "Callout", width: inner * 0.5, height: 2.4, align: "left", color: STATE_COLORS.inspection})
    this.progressText = addText(header, "Step 1 of 3", {role: "Callout", width: inner * 0.5, height: 2.4, align: "right", color: TEXT_PRIMARY})

    // Progress: one icon per step
    const progress = makeRow(content, "Progress", 2.4, FlexJustify.Start, 0.6)
    for (let i = 0; i < this.stepCount; i++) this.progressIcons.push(addIcon(progress, ICON_TODO, 2.0, PENDING_COLOR))

    // Current task
    const title = makeRow(content, "Task", 3.2, FlexJustify.Start)
    this.titleText = addText(title, "", {role: "Headline2", width: inner, height: 3, align: "left"})
    const hint = makeRow(content, "Hint", 3.8, FlexJustify.Start)
    this.hintText = addText(hint, "", {role: "Body", width: inner, height: 3.6, align: "left", color: TEXT_SECONDARY, wrap: true})

    // Actions: Back (secondary) · Confirm (primary)
    const actions = makeRow(content, "Actions", 3.8, FlexJustify.SpaceBetween)
    const back = addButton(actions, "Back", 5.4, 3.4, () => this.onBackEvent.invoke(), "Secondary")
    this.backButton = back.button
    this.backLabel = back.label
    const confirm = addButton(actions, "Mark as checked", inner - 6.0, 3.4, () => this.onConfirmEvent.invoke(), "Primary")
    this.confirmButton = confirm.button
    this.confirmLabel = confirm.label

    const foot = makeRow(content, "Footnote", 1.9, FlexJustify.Start)
    addText(foot, "Simulated inspection · no equipment control", {role: "Caption", width: inner, height: 1.8, align: "left", color: TEXT_TERTIARY})
  }

  setVisible(visible: boolean): void {
    this.visibility.set(visible)
  }

  /**
   * Shows one step. `done` is the full checklist state; `current` is the index
   * of the step on screen, or -1 when every step is checked.
   */
  setStep(current: number, done: boolean[], title: string, hint: string): void {
    const total = done.length
    const doneCount = done.filter((d) => d).length
    const allDone = current < 0
    this.progressText.text = allDone ? `${total} of ${total} checked` : `Step ${current + 1} of ${total}`
    this.progressText.textFill.color = allDone ? STATE_COLORS.resolved : TEXT_PRIMARY

    this.progressIcons.forEach((icon, i) => {
      const isDone = done[i]
      const isCurrent = i === current
      icon.material.mainPass.baseTex = isDone ? ICON_DONE : isCurrent ? ICON_CURRENT : ICON_TODO
      icon.material.mainPass.baseColor = isDone ? STATE_COLORS.resolved : isCurrent ? STATE_COLORS.inspection : PENDING_COLOR
    })

    this.titleText.text = title
    this.hintText.text = hint
    this.confirmLabel.text = allDone ? "Complete inspection" : "Mark as checked"

    const canGoBack = doneCount > 0
    this.backButton.inactive = !canGoBack
    this.backLabel.textFill.color = canGoBack ? TEXT_PRIMARY : TEXT_TERTIARY
    this.confirmButton.inactive = false
  }
}
