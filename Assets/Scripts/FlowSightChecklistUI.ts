// Three-step inspection checklist. Each step is a UIKit Button with an
// ElementContent face (status icon + label). Tapping a step reports its index;
// the controller decides the step state and pushes it back.

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  addText, CONTENT_Z, DeferredVisibility, makeObj, makeRow, roleSize,
  STATE_COLORS, TEXT_SECONDARY,
} from "./FlowSightUiKit"

const ICON_TODO = requireAsset("../Icons/radio_button_unchecked.png") as Texture
const ICON_DONE = requireAsset("../Icons/check_circle.png") as Texture

@component
export class FlowSightChecklistUI extends BaseScriptComponent {
  @ui.label("<b>FlowSight Inspection Checklist</b>")
  @ui.separator
  @ui.group_start("Content")
  @input
  @hint("Panel title")
  title: string = "Inspection checklist"

  @input
  @hint("Step labels, in order")
  stepLabels: string[] = ["Check transfer rollers", "Check sensor alignment", "Confirm path is clear"]
  @ui.group_end

  @ui.group_start("Layout")
  @input
  @hint("Panel width in cm (before the root scale is applied)")
  @widget(new SliderWidget(22, 40, 0.5))
  panelWidth: number = 30

  @input
  @hint("Inner padding in cm")
  @widget(new SliderWidget(0.5, 4, 0.1))
  padding: number = 1.8

  @input
  @hint("Height of each step button in cm")
  @widget(new SliderWidget(3, 6, 0.1))
  stepHeight: number = 4.2
  @ui.group_end

  private visibility: DeferredVisibility
  private steps: ElementContent[] = []
  private progressText: Text

  private readonly onStepTappedEvent = new Event<number>()
  get onStepTapped(): PublicApi<number> {
    return this.onStepTappedEvent.publicApi()
  }

  onAwake(): void {
    const panel = makeObj(this.sceneObject, "Panel")
    this.visibility = new DeferredVisibility(this, panel)

    panel.createComponent("Component.Canvas")
    const plate = panel.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"

    const content = makeObj(panel, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = this.panelWidth
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.9
    flex.paddingTop = this.padding
    flex.paddingBottom = this.padding
    flex.paddingLeft = this.padding
    flex.paddingRight = this.padding
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const inner = this.panelWidth - this.padding * 2
    const header = makeRow(content, "Header", 3.6, FlexJustify.Start)
    addText(header, this.title, {role: "Headline2", width: inner, height: 3.4, align: "left", color: STATE_COLORS.inspection})
    const hint = makeRow(content, "Hint", 2.2, FlexJustify.Start)
    addText(hint, "Tap a step once it is verified on the machine", {role: "Caption", width: inner, height: 2, align: "left", color: TEXT_SECONDARY})

    this.stepLabels.forEach((label, i) => this.addStep(content, i, `${i + 1}.  ${label}`, inner))

    const footer = makeRow(content, "Progress", 2.6, FlexJustify.Start)
    this.progressText = addText(footer, "", {role: "Body", width: inner, align: "left", color: TEXT_SECONDARY})
    this.setProgress(0)
  }

  setVisible(visible: boolean): void {
    this.visibility.set(visible)
  }

  setStepDone(index: number, done: boolean): void {
    const step = this.steps[index]
    if (step) step.leadingIcon = done ? ICON_DONE : ICON_TODO
  }

  setProgress(doneCount: number): void {
    const total = this.stepLabels.length
    this.progressText.text = doneCount >= total
      ? "All checks complete · ready to resume"
      : `${doneCount} of ${total} checks complete`
    this.progressText.textFill.color = doneCount >= total ? STATE_COLORS.resolved : TEXT_SECONDARY
  }

  private addStep(parent: SceneObject, index: number, label: string, width: number): void {
    const so = makeObj(parent, `Step ${index + 1}`)
    const button = so.createComponent(Button.getTypeName()) as Button
    button.size = new vec3(width, this.stepHeight, 1)
    const face = so.createComponent(ElementContent.getTypeName()) as ElementContent
    face.text = label
    face.textSize = roleSize("Body")
    face.leadingIcon = ICON_TODO
    face.leadingIconSize = 2.4
    face.spacing = 1.0
    face.contentAlignment = "left"
    face.paddingLeft = 1.2
    face.autoResize = false
    so.createComponent(FlexItem.getTypeName())
    button.onTriggerUp.add(() => this.onStepTappedEvent.invoke(index))
    this.steps.push(face)
  }
}
