// FlowSight state machine: Running → Warning → Inspection → Resolved → Running.
// Owns the simulated telemetry (no real sensors, no machine control) and the
// full inspection checklist state, and pushes state into the UI modules and the
// conveyor effects.

import {FlowSightAlertCardUI} from "./FlowSightAlertCardUI"
import {FlowSightCalloutsUI} from "./FlowSightCalloutsUI"
import {FlowSightConveyorFX} from "./FlowSightConveyorFX"
import {FlowSightStatusCardUI} from "./FlowSightStatusCardUI"
import {FlowSightStepCardUI} from "./FlowSightStepCardUI"
import {FlowState, STATE_COLORS} from "./FlowSightUiKit"

interface Telemetry {
  speed: number   // m/s
  queue: number   // items
  flow: number    // units/min
}

interface InspectionStep {
  title: string
  hint: string
}

const STEPS: InspectionStep[] = [
  {title: "Check transfer rollers", hint: "Look at the rollers where parcels meet the transfer belt (blue marker)."},
  {title: "Check sensor alignment", hint: "Check the camera on the upper-left post faces the belt (blue marker)."},
  {title: "Confirm path is clear", hint: "Make sure nothing blocks the transfer belt (blue marker)."},
]

@component
export class FlowSightController extends BaseScriptComponent {
  @ui.label("<b>FlowSight Controller</b>")
  @ui.label("All telemetry and machine responses are simulated.")
  @ui.separator
  @ui.group_start("Modules")
  @input
  @hint("Machine status (compact card / mini pill)")
  statusCard: FlowSightStatusCardUI

  @input
  @hint("Congestion alert at the transfer zone (Warning)")
  alertCard: FlowSightAlertCardUI

  @input
  @hint("Step-by-step inspection card (Inspection)")
  stepCard: FlowSightStepCardUI

  @input
  @hint("Spatial callouts on the model")
  callouts: FlowSightCalloutsUI

  @input
  @hint("Roller, parcel and highlight animation")
  conveyorFx: FlowSightConveyorFX
  @ui.group_end

  @ui.group_start("Preview")
  @input
  @hint("State the lens starts in. Keep 'running' for the real flow; other values help review a state in Preview.")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Running", "running"),
    new ComboBoxItem("Warning", "warning"),
    new ComboBoxItem("Inspection", "inspection"),
    new ComboBoxItem("Resolved", "resolved"),
  ]))
  startState: string = "running"

  @input
  @hint("Inspection steps already checked when starting in Inspection (0-3), for review only")
  @widget(new SliderWidget(0, 3, 1))
  startStepsDone: number = 0
  @ui.group_end

  @ui.group_start("Baseline telemetry (Running / Resolved)")
  @input
  @hint("Belt speed in m/s")
  nominalSpeed: number = 1.2

  @input
  @hint("Queue length in items")
  nominalQueue: number = 3

  @input
  @hint("Flow rate in units/min")
  nominalFlow: number = 42
  @ui.group_end

  @ui.group_start("Congestion telemetry (Warning)")
  @input
  @hint("Belt speed in m/s while congested")
  congestedSpeed: number = 0.4

  @input
  @hint("Queue length the congestion builds up to")
  congestedQueue: number = 11

  @input
  @hint("Flow rate in units/min while congested")
  congestedFlow: number = 18
  @ui.group_end

  @ui.group_start("Ramp rates")
  @input
  @hint("Belt speed change per second (m/s²)")
  speedRate: number = 0.45

  @input
  @hint("Queue change per second (items/s)")
  queueRate: number = 0.9

  @input
  @hint("Flow change per second (units/min per s)")
  flowRate: number = 9

  @input
  @hint("Speed-up applied to the ramps while recovering in Resolved")
  recoveryBoost: number = 2.5
  @ui.group_end

  private state: FlowState = "running"
  private current: Telemetry = {speed: 1.2, queue: 3, flow: 42}
  private target: Telemetry = {speed: 1.2, queue: 3, flow: 42}
  private stepsDone: boolean[] = STEPS.map(() => false)
  private recovered = false
  private shownMetrics = ""
  // Actions that change state share button positions (e.g. Reset demo → Simulate
  // congestion), so a quick double press must not skip a state.
  private lastActionTime = -10
  private readonly actionCooldown = 1.0

  private acceptAction(): boolean {
    const now = getTime()
    if (now - this.lastActionTime < this.actionCooldown) return false
    this.lastActionTime = now
    return true
  }

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate(getDeltaTime()))
  }

  private onStart(): void {
    if (!this.statusCard || !this.alertCard || !this.stepCard || !this.callouts || !this.conveyorFx) {
      console.error("[FlowSight] Controller is missing a module reference")
      return
    }
    this.statusCard.onAction.add(() => {
      if (this.acceptAction()) this.onStatusAction()
    })
    this.alertCard.onStartInspection.add(() => {
      if (this.state === "warning" && this.acceptAction()) this.enter("inspection")
    })
    this.stepCard.onConfirm.add(() => {
      if (this.acceptAction()) this.confirmStep()
    })
    this.stepCard.onBack.add(() => {
      if (this.acceptAction()) this.stepBack()
    })

    const start = (["running", "warning", "inspection", "resolved"] as FlowState[])
      .find((s) => s === this.startState) ?? "running"
    this.current = start === "inspection"
      ? {speed: 0, queue: this.congestedQueue, flow: 0}
      : this.baseline()
    this.enter(start)
    if (start === "inspection") {
      for (let i = 0; i < Math.min(this.startStepsDone, STEPS.length); i++) this.stepsDone[i] = true
      this.refreshSteps()
    }
  }

  private baseline(): Telemetry {
    return {speed: this.nominalSpeed, queue: this.nominalQueue, flow: this.nominalFlow}
  }

  // ── State changes ────────────────────────────────────────────────────────
  private onStatusAction(): void {
    if (this.state === "running") this.enter("warning")
    else if (this.state === "resolved") this.enter("running")
  }

  private enter(state: FlowState): void {
    this.state = state
    console.log(`[FlowSight] → ${state}`)

    switch (state) {
      case "running":
        this.target = this.baseline()
        this.statusCard.setState(state, "All systems nominal")
        this.statusCard.setAction("Simulate congestion", true)
        break
      case "warning":
        this.target = {speed: this.congestedSpeed, queue: this.congestedQueue, flow: this.congestedFlow}
        this.statusCard.setState(state, "Congestion alert at transfer zone")
        this.statusCard.setAction("", false)
        break
      case "inspection":
        this.target = {speed: 0, queue: this.current.queue, flow: 0}
        this.statusCard.setState(state, "Inspection · line paused")
        this.statusCard.setAction("", false)
        break
      case "resolved":
        this.target = this.baseline()
        this.recovered = false
        this.statusCard.setState(state, "Recovering to baseline · simulated")
        this.statusCard.setAction("Reset demo", true)
        break
    }

    this.statusCard.setFootprint(state === "inspection" ? "mini" : "card")
    this.alertCard.setVisible(state === "warning")
    this.stepCard.setVisible(state === "inspection")
    this.callouts.setZoneTagVisible(false)
    this.callouts.setInspectionVisible(state === "inspection")
    this.conveyorFx.setJam(state === "warning" || state === "inspection")
    this.conveyorFx.setHighlight(state === "running" || state === "resolved" ? "off" : state)

    if (state === "running" || state === "inspection") {
      this.stepsDone = STEPS.map(() => false)
      this.refreshSteps()
    }
    this.shownMetrics = ""
  }

  // ── Inspection steps (full state kept here; the card shows one step) ─────
  private currentStep(): number {
    return this.stepsDone.indexOf(false)
  }

  private confirmStep(): void {
    if (this.state !== "inspection") return
    const i = this.currentStep()
    if (i < 0) {
      this.enter("resolved")
      return
    }
    this.stepsDone[i] = true
    this.refreshSteps()
  }

  private stepBack(): void {
    if (this.state !== "inspection") return
    const lastDone = this.stepsDone.lastIndexOf(true)
    if (lastDone < 0) return
    this.stepsDone[lastDone] = false
    this.refreshSteps()
  }

  private refreshSteps(): void {
    const current = this.currentStep()
    this.stepsDone.forEach((done, i) => {
      this.callouts.setState(i, done ? "done" : i === current ? "active" : "pending")
    })
    if (current >= 0) {
      this.stepCard.setStep(current, this.stepsDone, STEPS[current].title, STEPS[current].hint)
    } else {
      this.stepCard.setStep(-1, this.stepsDone, "All checks done",
        "Completing restores the simulated line. This Lens does not control real equipment.")
    }
  }

  // ── Telemetry ────────────────────────────────────────────────────────────
  private onUpdate(dt: number): void {
    if (!this.statusCard || !this.conveyorFx) return
    const boost = this.state === "resolved" ? this.recoveryBoost : 1
    this.current.speed = approach(this.current.speed, this.target.speed, this.speedRate * boost * dt)
    this.current.queue = approach(this.current.queue, this.target.queue, this.queueRate * boost * dt)
    this.current.flow = approach(this.current.flow, this.target.flow, this.flowRate * boost * dt)
    this.conveyorFx.setBeltSpeed(this.current.speed)

    // Resolved reports "restored" only once every metric is back at baseline.
    if (this.state === "resolved" && !this.recovered && this.atTarget()) {
      this.recovered = true
      this.statusCard.setMessage("Flow restored · simulated", STATE_COLORS.resolved)
      this.conveyorFx.setHighlight("resolved")
    }

    const key = `${this.current.speed.toFixed(1)}|${Math.round(this.current.queue)}|${Math.round(this.current.flow)}`
    if (key !== this.shownMetrics) {
      this.shownMetrics = key
      this.statusCard.setMetrics(this.current.speed, this.current.queue, this.current.flow)
    }
  }

  private atTarget(): boolean {
    return this.current.speed === this.target.speed
      && this.current.queue === this.target.queue
      && this.current.flow === this.target.flow
  }
}

function approach(value: number, target: number, maxStep: number): number {
  if (Math.abs(target - value) <= maxStep) return target
  return value + Math.sign(target - value) * maxStep
}
